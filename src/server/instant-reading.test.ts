import { describe, expect, it, vi } from "vitest";
import {
  buildPrompt,
  careerQuestionDefinitions,
  getAnswerTarget,
  getDefaultReadingStyle,
  getDefaultSpread,
  getReadingWritingInstruction,
  type InstantReadingRequest,
} from "@/domain/tarot";
import { getPublicQuestionCatalog } from "@/features/reading-questions";
import { getTarotData } from "@/i18n/tarot-data";
import {
  buildOpenAIInstantReadingBody,
  buildInstantReadingPrompt,
  openaiInstantReadingUrl,
  maximumInstantReadingProviderBytes,
  InstantReadingAbortedError,
  InstantReadingResponseError,
  InstantReadingTimeoutError,
  isInstantReadingRequestConsistent,
  requestInstantReading,
} from "./instant-reading";
import { openaiInstantReadingModel } from "./instant-reading-config";

const tarotData = getTarotData("ko");
const request = {
  cards: [
    { cardId: "the-fool" },
    { cardId: "wands-queen" },
    { cardId: "swords-3" },
  ],
  spreadId: "quick",
  styleId: "balanced",
  topicId: "love",
} as const satisfies InstantReadingRequest;
const providerConfig = { apiKey: "secret-token" };

describe("OpenAI instant reading adapter", () => {
  it.each(["quick", "deep"] as const)(
    "accepts validated plaintext for a %s reading without hidden output fields",
    async (spreadId) => {
      const cards =
        spreadId === "quick"
          ? request.cards
          : ([
              ...request.cards,
              { cardId: "the-moon" },
              { cardId: "the-tower" },
              { cardId: "temperance" },
            ] as const);
      const fetchImpl = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json(createProviderPayload(createValidText())),
        );
      await expect(
        requestInstantReading(
          tarotData,
          { ...request, spreadId, cards },
          {
            fetchImpl,
            providerConfig,
          },
        ),
      ).resolves.toEqual({ text: createValidText() });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    },
  );

  it("builds one fixed, bounded request without private or card identifiers", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(createProviderPayload(createValidText())),
      );

    await expect(
      requestInstantReading(tarotData, request, { fetchImpl, providerConfig }),
    ).resolves.toEqual({ text: createValidText() });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer secret-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );

    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body));
    expect(openaiInstantReadingModel).toBe("gpt-6.1-sol");
    expect(body).toEqual(buildOpenAIInstantReadingBody(tarotData, request));
    expect(body).toMatchObject({
      model: "gpt-6.1-sol",
      store: false,
      stream: false,
      reasoning: { effort: "low" },
      max_output_tokens: 1_200,
    });
    expect(body.input).toBe(buildInstantReadingPrompt(tarotData, request));
    expect(body).not.toHaveProperty("tools");
    expect(body).not.toHaveProperty("previous_response_id");
    expect(body.instructions).toContain(
      "explicit hypothetical, never asserted history",
    );
    expect(body).not.toHaveProperty("text");
    expect(body.instructions).not.toContain("[전체 흐름]");
    expect(body.input).not.toContain("[가능성 A]");
    for (const forbidden of [
      "the-fool",
      "바보",
      "privateContext",
      "secret-token",
    ]) {
      expect(JSON.stringify(body)).not.toContain(forbidden);
    }
  });

  it.each(["pace-of-closeness", "first-contact"] as const)(
    "keeps unprovided past behavior out of question focus: %s",
    (questionId) => {
      const question = getPublicQuestionCatalog("ko").questions.find(
        (question) => question.id === questionId,
      )!;
      const prompt = buildInstantReadingPrompt(tarotData, {
        ...request,
        topicId: question.topicId,
        questionId,
      });
      const body = buildOpenAIInstantReadingBody(tarotData, {
        ...request,
        topicId: question.topicId,
        questionId,
      });
      const fullPrompt = [body.instructions, body.input].join("\n");
      expect(fullPrompt).toContain(
        "Invent/request no real history/events, actual dialogue, private data",
      );
      expect(fullPrompt).toContain(
        "Do not claim you verified real private thoughts or unprovided facts, or guarantee futures",
      );
      expect(fullPrompt).toContain(
        "No medical/legal/financial/investment/mental-health diagnosis/advice",
      );
      expect(fullPrompt).toContain("no repeated contact after refusal");
      expect(fullPrompt).toContain("manipulation");
      expect(prompt).not.toContain("상대가 행동으로 보인 속도");
      expect(prompt).not.toContain("상대가 지금까지 보인 경계");
    },
  );

  it("uses question-first narrative instructions for every eligible public question", () => {
    const eligible = getPublicQuestionCatalog("ko").questions.filter(
      ({ domainId }) => domainId !== "self",
    );
    expect(eligible).toHaveLength(44);
    for (const question of eligible) {
      const prompt = buildInstantReadingPrompt(tarotData, {
        ...request,
        topicId: question.topicId,
        questionId: question.id,
      });
      expect(prompt, question.id).toContain(`질문: ${question.title}`);
      expect(prompt.split(question.title), question.id).toHaveLength(2);
      expect(prompt, question.id).toContain(question.focus);
      expect(prompt, question.id).not.toMatch(
        /두 가지 상징적 해석으로|서로 다른 두 상징적 해석/u,
      );
      expect(prompt, question.id).toContain(
        tarotData.promptTemplate.narrationInstruction,
      );
    }
  });

  it("uses the shared narration contract instead of forcing every question into feelings", () => {
    const commonNarration =
      "Shared narration contract for the actual question.";
    const changedData = {
      ...tarotData,
      promptTemplate: {
        ...tarotData.promptTemplate,
        narrationInstruction: commonNarration,
      },
    };
    for (const questionId of [
      "effort-balance",
      "evidence-of-change",
      "person-or-familiarity",
      "career-opportunity-cost",
    ] as const) {
      const question = getPublicQuestionCatalog("ko").questions.find(
        ({ id }) => id === questionId,
      )!;
      const prompt = buildInstantReadingPrompt(changedData, {
        ...request,
        topicId: question.topicId,
        questionId,
      });
      expect(prompt).toContain(question.focus);
      expect(prompt.split(commonNarration)).toHaveLength(2);
      expect(prompt).not.toContain(
        tarotData.promptTemplate.narrationInstruction,
      );
      expect(prompt).not.toContain("Develop one emotional story");
      expect(prompt).not.toContain("what they want, feel or hesitate to do");
    }
  });

  it("limits profile instruction edits to matching API requests", () => {
    const changedData = {
      ...tarotData,
      promptTemplate: {
        ...tarotData.promptTemplate,
        writingProfiles: {
          ...tarotData.promptTemplate.writingProfiles,
          "career-perception": {
            ...tarotData.promptTemplate.writingProfiles["career-perception"],
            instruction: "공개된 업무 질문의 해석 지침을 수정했습니다.",
          },
        },
      },
    };
    const feelingsRequest = {
      ...request,
      topicId: "feelings",
      questionId: "unspoken-expectations",
    } as const;
    const careerRequest = {
      ...request,
      topicId: "career-direction",
      questionId: "career-manager-expectations",
    } as const;
    expect(buildOpenAIInstantReadingBody(changedData, feelingsRequest)).toEqual(
      buildOpenAIInstantReadingBody(tarotData, feelingsRequest),
    );
    expect(
      buildOpenAIInstantReadingBody(changedData, careerRequest),
    ).not.toEqual(buildOpenAIInstantReadingBody(tarotData, careerRequest));
  });

  it("puts the actual question first and uses only its matching writing policy without fictional examples", () => {
    const careerRequest = {
      ...request,
      topicId: "career-direction",
      questionId: "career-manager-expectations",
    } as const;
    const profile =
      tarotData.promptTemplate.writingProfiles["career-perception"];
    const question = getPublicQuestionCatalog("ko").questions.find(
      ({ id }) => id === careerRequest.questionId,
    )!;
    const prompt = buildInstantReadingPrompt(tarotData, careerRequest);
    expect(prompt.startsWith(`질문: ${question.title}`)).toBe(true);
    expect(prompt.split(profile.instruction)).toHaveLength(2);
    expect(
      prompt.split(tarotData.promptTemplate.narrationInstruction),
    ).toHaveLength(2);
    expect(prompt).not.toContain(profile.example);
    expect(prompt).not.toContain("가상 예시는 문체만 참고");
    expect(prompt).toContain("이제 실제로 뽑힌 뜻:");
    expect(prompt).not.toContain(
      tarotData.promptTemplate.writingProfiles.feelings.instruction,
    );
    expect(prompt).not.toContain(
      tarotData.promptTemplate.writingProfiles.feelings.example,
    );
    expect(prompt.indexOf(profile.instruction)).toBeLessThan(
      prompt.indexOf("뽑힌 뜻:"),
    );
  });

  it("uses the exact direct endpoint", () => {
    expect(openaiInstantReadingUrl).toBe("https://api.openai.com/v1/responses");
  });

  it("keeps one provider contract across public questions, styles, spreads and draws", () => {
    const selections: Pick<InstantReadingRequest, "topicId" | "questionId">[] =
      [
        ...tarotData.topics.map(({ id }) => ({ topicId: id })),
        ...getPublicQuestionCatalog("ko").questions.map(({ topicId, id }) => ({
          topicId,
          questionId: id,
        })),
      ];
    let checked = 0;
    for (const selection of selections) {
      for (const spreadId of ["quick", "deep"] as const) {
        const count = spreadId === "quick" ? 3 : 6;
        for (const { id: styleId } of tarotData.readingStyles) {
          for (const draw of [
            tarotData.cards.slice(0, count),
            tarotData.cards.slice(-count),
          ]) {
            const candidate = {
              ...selection,
              spreadId,
              styleId,
              cards: draw.map(({ id: cardId }) => ({ cardId })),
            };
            if (!isInstantReadingRequestConsistent(tarotData, candidate))
              continue;
            const body = buildOpenAIInstantReadingBody(tarotData, candidate);
            expect(body).toMatchObject({
              model: "gpt-6.1-sol",
              reasoning: { effort: "low" },
              max_output_tokens: 1200,
              store: false,
              stream: false,
            });
            const instruction = getReadingWritingInstruction(
              tarotData.promptTemplate,
              candidate.topicId,
              candidate.questionId,
            );
            expect(body.input.split(instruction)).toHaveLength(2);
            expect(
              body.input.split(tarotData.promptTemplate.narrationInstruction),
            ).toHaveLength(2);
            expect(body.input).not.toContain("가상 예시는 문체만 참고");
            for (const profile of Object.values(
              tarotData.promptTemplate.writingProfiles,
            )) {
              expect(body.input).not.toContain(profile.example);
              if (
                "deepExample" in profile &&
                typeof profile.deepExample === "string"
              )
                expect(body.input).not.toContain(profile.deepExample);
            }
            const actual = candidate.cards.map(
              ({ cardId }) =>
                tarotData.cards.find(({ id }) => id === cardId)!.meaning,
            );
            actual.forEach((meaning, index) => {
              expect(body.input).toContain(String(index + 1) + ". " + meaning);
              if (index > 0)
                expect(body.input.indexOf(meaning)).toBeGreaterThan(
                  body.input.indexOf(actual[index - 1]!),
                );
            });
            expect(body).not.toHaveProperty("tools");
            checked++;
          }
        }
      }
    }
    expect(checked).toBe(784);
  });

  it("keeps all six actual meanings and policy without fictional examples", () => {
    const deepRequest = {
      ...request,
      topicId: "career-direction",
      questionId: "career-opportunity-cost",
      spreadId: "deep",
      cards: [
        ...request.cards,
        { cardId: "the-moon" },
        { cardId: "the-tower" },
        { cardId: "temperance" },
      ],
    } as const;
    const prompt = buildInstantReadingPrompt(tarotData, deepRequest);
    const instruction = getReadingWritingInstruction(
      tarotData.promptTemplate,
      deepRequest.topicId,
      deepRequest.questionId,
    );
    for (const candidate of Object.values(
      tarotData.promptTemplate.writingProfiles,
    )) {
      expect(prompt).not.toContain(candidate.example);
      if (
        "deepExample" in candidate &&
        typeof candidate.deepExample === "string"
      )
        expect(prompt).not.toContain(candidate.deepExample);
    }
    expect(prompt.split(instruction)).toHaveLength(2);
    const actual = deepRequest.cards.map(
      ({ cardId }) => tarotData.cards.find(({ id }) => id === cardId)!.meaning,
    );
    actual.forEach((meaning, index) => {
      expect(prompt).toContain(`${index + 1}. ${meaning}`);
      if (index > 0)
        expect(prompt.indexOf(meaning)).toBeGreaterThan(
          prompt.indexOf(actual[index - 1]!),
        );
    });
    expect(prompt.startsWith("질문:")).toBe(true);
    expect(
      buildOpenAIInstantReadingBody(tarotData, deepRequest).instructions,
    ).toContain("Invent/request no real history/events, actual dialogue");
  });

  it("builds a prompt from reviewed meanings in draw order", () => {
    const prompt = buildInstantReadingPrompt(tarotData, request);
    const meanings = request.cards.map(
      ({ cardId }) => tarotData.cards.find(({ id }) => id === cardId)!.meaning,
    );
    expect(prompt.indexOf(meanings[0]!)).toBeLessThan(
      prompt.indexOf(meanings[1]!),
    );
    expect(prompt.indexOf(meanings[1]!)).toBeLessThan(
      prompt.indexOf(meanings[2]!),
    );
    expect(prompt).toContain("첫 뜻부터 복합 핵심을 차례로");
    expect(prompt).toContain("뜻이 함께 받치는 가치·선호 사이의 선택과 긴장");
    expect(prompt).toContain("억지 인과는 만들지 마세요");
    expect(prompt).toContain("사람의 선택과 마음으로");
    expect(prompt).toContain("뒤 뜻을 앞당기거나 관계 대상을 좁히지 마세요");
    expect(prompt).toContain("뜻풀이·해석 과정·반복·마지막 요약은 빼세요");
    expect(prompt).toContain("근거가 나올 때 답하세요");
    expect(prompt).not.toContain("핵심 답을 첫 문장에");
    expect(prompt).toMatch(/natural 해요체[^.]*consistent address/iu);
    expect(prompt).toMatch(/(?:advice|action) only if asked/iu);
    expect(prompt).not.toContain("비예측적 해석 두 개");
  });

  it("keeps cost question material separate from its retained policy", () => {
    const question = getPublicQuestionCatalog("ko").questions.find(
      ({ id }) => id === "career-opportunity-cost",
    )!;
    const body = buildOpenAIInstantReadingBody(tarotData, {
      ...request,
      topicId: question.topicId,
      questionId: question.id,
    });
    const guard =
      "선택의 실제 조건·현재 일의 종료나 뜻마다 새 손실을 만들지 마세요.";
    expect(question.focus).toBe(question.title);
    expect(body.input.startsWith(`질문: ${question.title}\n주제:`)).toBe(true);
    expect(body.input.split(guard)).toHaveLength(2);
    expect(
      body.input.split(tarotData.promptTemplate.narrationInstruction),
    ).toHaveLength(2);
    expect(body.input).toContain("뜻풀이·해석 과정");
  });

  it("keeps the money safety rule in broad and question candidate prompts", () => {
    const topic = tarotData.topics.find(({ id }) => id === "money-life")!;
    const questions = getPublicQuestionCatalog("ko").questions.filter(
      ({ topicId }) => topicId === topic.id,
    );
    const safetyLine = `주제 안전: ${topic.safetyInstruction}`;
    const broadRequest = { ...request, topicId: topic.id } as const;
    const broadPrompt = buildInstantReadingPrompt(tarotData, broadRequest);

    expect(questions).toHaveLength(6);
    expect(broadPrompt).toContain(`주제 리딩: ${topic.promptLead}`);
    expect(broadPrompt.split(safetyLine)).toHaveLength(2);
    expect(
      JSON.stringify(buildOpenAIInstantReadingBody(tarotData, broadRequest)),
    ).toContain(safetyLine);

    for (const question of questions) {
      const candidateRequest = {
        ...request,
        questionId: question.id,
        topicId: topic.id,
      };
      const prompt = buildInstantReadingPrompt(tarotData, candidateRequest);

      expect(prompt).toContain(question.focus);
      expect(prompt).not.toContain(`주제 리딩: ${topic.promptLead}`);
      expect(prompt.split(question.focus)).toHaveLength(2);
      expect(prompt.split(safetyLine)).toHaveLength(2);
      expect(
        JSON.stringify(
          buildOpenAIInstantReadingBody(tarotData, candidateRequest),
        ),
      ).toContain(safetyLine);
    }
  });

  it("rejects self readings at the production contact boundary", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const selfRequest = { ...request, topicId: "money-life" } as const;

    expect(isInstantReadingRequestConsistent(tarotData, selfRequest)).toBe(
      false,
    );
    await expect(
      requestInstantReading(tarotData, selfRequest, {
        fetchImpl,
        providerConfig,
      }),
    ).rejects.toThrow("taxonomy is not eligible");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("routes the prompt by the entry or public-question answer target", () => {
    expect(buildInstantReadingPrompt(tarotData, request)).toContain(
      `대상: ${
        getAnswerTarget(tarotData.answerTargets, "relationship").instruction
      }`,
    );
    const externalPerceptionPrompt = buildInstantReadingPrompt(tarotData, {
      ...request,
      questionId: "mutual-view",
      topicId: "feelings",
    });
    expect(externalPerceptionPrompt).toContain(
      `대상: ${
        getAnswerTarget(tarotData.answerTargets, "external-perception")
          .instruction
      }`,
    );
    expect(externalPerceptionPrompt).toContain(
      "질문: 우리는 서로를 어떻게 보고 있을까?",
    );
    expect(externalPerceptionPrompt).toMatch(
      /(?:advice|action) only if asked/iu,
    );

    const attractionPrompt = buildInstantReadingPrompt(tarotData, {
      ...request,
      questionId: "interest-or-kindness",
      topicId: "feelings",
    });
    expect(attractionPrompt).toContain("질문: 이건 호감일까, 그냥 친절일까?");
    expect(attractionPrompt).toMatch(/(?:advice|action) only if asked/iu);

    const personalImpressionPrompt = buildInstantReadingPrompt(tarotData, {
      ...request,
      questionId: "how-they-see-me",
    });
    expect(personalImpressionPrompt).toContain(
      "질문: 그 사람은 나를 어떤 사람으로 볼까?",
    );
    expect(personalImpressionPrompt).not.toContain(
      "질문: 그 사람은 내게 뭘 기대할까?",
    );

    const partnerImpressionPrompt = buildInstantReadingPrompt(tarotData, {
      ...request,
      questionId: "romantic-partner-impression",
    });
    expect(partnerImpressionPrompt).toContain(
      "질문: 나는 연애 상대로 어떤 인상일까?",
    );
    expect(partnerImpressionPrompt).toContain(
      "대상: 질문이 묻는 사람의 시선(쌍방이면 둘 다)을 읽으세요.",
    );
    expect(partnerImpressionPrompt).not.toContain(
      "질문의 핵심이 상대의 마음이라면",
    );
    expect(partnerImpressionPrompt).toMatch(
      /(?:advice|action) only if asked/iu,
    );

    const selfPrompt = buildInstantReadingPrompt(tarotData, {
      ...request,
      questionId: "ignored-signals",
      topicId: "feelings",
    });
    expect(selfPrompt).toContain("대상: 질문이 묻는 당신 자신을 읽으세요.");
    expect(selfPrompt).toContain("질문: 사랑받고 싶어 놓치는 것은?");
    expect(selfPrompt).not.toContain(
      "상대가 사용자를 어떻게 볼 가능성이 있는지",
    );

    const careerQuestions = getPublicQuestionCatalog("ko").questions.filter(
      ({ domainId }) => domainId === "career",
    );

    expect(careerQuestions).toHaveLength(careerQuestionDefinitions.length);
    for (const definition of careerQuestionDefinitions) {
      const question = careerQuestions.find(({ id }) => id === definition.id);
      expect(question).toBeDefined();

      const careerPrompt = buildInstantReadingPrompt(tarotData, {
        ...request,
        questionId: definition.id,
        topicId: definition.topicId,
      });
      expect(careerPrompt).toContain(question!.focus);
      expect(careerPrompt.startsWith(`질문: ${question!.title}`)).toBe(true);
      expect(careerPrompt).toContain(
        `대상: ${
          getAnswerTarget(
            tarotData.answerTargets,
            definition.defaultAnswerTargetId,
          ).instruction
        }`,
      );
      expect(careerPrompt).not.toContain(
        "질문: 일에서 어디에 힘을 쏟고 있는지",
      );
    }

    const managerPrompt = buildInstantReadingPrompt(tarotData, {
      ...request,
      questionId: "career-manager-view",
      topicId: "career-direction",
    });
    expect(managerPrompt).toContain("질문: 상사는 나를 어떻게 보고 있을까?");
    expect(managerPrompt).toContain(
      "대상: 질문이 묻는 사람의 시선(쌍방이면 둘 다)을 읽으세요.",
    );
    expect(managerPrompt).toContain("질문의 사람·행동·시제·비교를 읽으세요");
  });

  it("keeps the selected question before card material and routes their hopes to their view", () => {
    const prompt = buildInstantReadingPrompt(tarotData, {
      ...request,
      topicId: "feelings",
      questionId: "unspoken-expectations",
    });
    expect(prompt).toContain(
      "대상: " +
        getAnswerTarget(tarotData.answerTargets, "external-perception")
          .instruction,
    );
    expect(prompt.indexOf("질문: 그 사람은 내게 뭘 기대할까?")).toBeLessThan(
      prompt.indexOf("뽑힌 뜻:"),
    );
    expect(prompt).toContain("질문의 사람·행동·시제·비교를 읽으세요");
  });

  it("keeps all stable entry defaults aligned across copied and instant prompts", () => {
    const spread = getDefaultSpread(tarotData.spreads);
    const cards = tarotData.cards
      .slice(0, spread.cardCount)
      .map((card) => ({ card }));

    for (const topic of tarotData.topics) {
      const answerTarget = getAnswerTarget(
        tarotData.answerTargets,
        topic.taxonomy.defaultAnswerTargetId,
      );
      const copiedPrompt = buildPrompt({
        answerTarget,
        cards,
        readingStyle: getDefaultReadingStyle(tarotData.readingStyles),
        spread,
        template: tarotData.promptTemplate,
        topic,
      });
      const instantPrompt = buildInstantReadingPrompt(tarotData, {
        ...request,
        topicId: topic.id,
      });

      expect(instantPrompt).toContain(`주제 리딩: ${topic.promptLead}`);
      expect(instantPrompt).not.toContain("질문:");
      expect(instantPrompt).toMatch(/(?:advice|action) only if asked/iu);

      for (const prompt of [copiedPrompt, instantPrompt]) {
        expect(prompt).toContain(answerTarget.instruction);
        expect(prompt).toContain(topic.promptLead);
      }
    }
  });

  it.each([
    Response.json(
      createProviderPayload(JSON.stringify({ reading: createValidText() })),
    ),
    Response.json(createProviderPayload(JSON.stringify([createValidText()]))),
    Response.json({ status: "failed", error: { message: "rejected" } }),
    Response.json({ status: "completed", output: [] }),
    Response.json({
      ...createProviderPayload(createValidText()),
      status: "incomplete",
    }),
    Response.json({
      ...createProviderPayload(createValidText()),
      error: { code: "error" },
    }),
    Response.json({
      ...createProviderPayload(createValidText()),
      incomplete_details: { reason: "max_output_tokens" },
    }),
    Response.json({ success: true, result: { response: createValidText() } }),
    new Response("not-json"),
    Response.json(
      createProviderPayload(
        createValidText() + "\n\n[가능성 A]\n다른 해석을 채우는 항목입니다.",
      ),
    ),
    ...[
      {
        type: "message",
        role: "assistant",
        status: "incomplete",
        content: [{ type: "output_text", text: createValidText() }],
      },
      {
        type: "message",
        role: "user",
        status: "completed",
        content: [{ type: "output_text", text: createValidText() }],
      },
      {
        type: "message",
        role: "assistant",
        status: "completed",
        content: [{ type: "refusal", refusal: "Cannot answer" }],
      },
      {
        type: "message",
        role: "assistant",
        status: "completed",
        content: [
          { type: "output_text", text: createValidText() },
          { type: "refusal", refusal: "Cannot answer" },
        ],
      },
      { type: "message", role: "assistant", status: "completed", content: [] },
      { type: "function_call", name: "unexpected" },
      null,
    ].map((item) => Response.json({ status: "completed", output: [item] })),
    Response.json({
      status: "completed",
      output: [
        ...createProviderPayload(createValidText()).output,
        ...createProviderPayload(createValidText()).output,
      ],
    }),
  ])("rejects a malformed provider response", async (response) => {
    await expect(
      requestInstantReading(tarotData, request, {
        fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(response),
        providerConfig,
      }),
    ).rejects.toBeInstanceOf(InstantReadingResponseError);
  });

  it("reads the assistant text after a reasoning item", async () => {
    const payload = createProviderPayload(createValidText());
    await expect(
      requestInstantReading(tarotData, request, {
        providerConfig,
        fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(
          Response.json({
            ...payload,
            output: [{ type: "reasoning", summary: [] }, ...payload.output],
          }),
        ),
      }),
    ).resolves.toEqual({ text: createValidText() });
  });

  it("accepts bounded reasoning metadata without exposing it as reading text", async () => {
    const payload = createProviderPayload(createValidText());
    const body = JSON.stringify({
      ...payload,
      output: [
        {
          type: "reasoning",
          summary: [],
          encrypted_content: "x".repeat(40_000),
        },
        ...payload.output,
      ],
    });
    expect(new TextEncoder().encode(body).byteLength).toBeGreaterThan(32_768);
    expect(maximumInstantReadingProviderBytes).toBe(131_072);
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(body));
    await expect(
      requestInstantReading(tarotData, request, { providerConfig, fetchImpl }),
    ).resolves.toEqual({ text: createValidText() });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("keeps reading length bounded independently of provider metadata", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          createProviderPayload(createValidText() + "긴 리딩".repeat(5_000)),
        ),
      );
    await expect(
      requestInstantReading(tarotData, request, { providerConfig, fetchImpl }),
    ).rejects.toBeInstanceOf(InstantReadingResponseError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each([401, 429, 500])(
    "does not retry provider HTTP %i",
    async (status) => {
      const fetchImpl = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("provider details", { status }));
      await expect(
        requestInstantReading(tarotData, request, {
          fetchImpl,
          providerConfig,
        }),
      ).rejects.toMatchObject({ status });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["declared", "streamed"] as const)(
    "cancels a provider envelope exceeding its %s byte bound",
    async (kind) => {
      const cancel = vi.fn();
      const payload = createProviderPayload(createValidText());
      const encoded = new TextEncoder().encode(
        JSON.stringify({
          ...payload,
          output: [
            {
              type: "reasoning",
              summary: [],
              encrypted_content: "x".repeat(kind === "streamed" ? 140_000 : 0),
            },
            ...payload.output,
          ],
        }),
      );
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoded);
        },
        cancel,
      });
      const response = new Response(
        body,
        kind === "declared"
          ? { headers: { "content-length": "140000" } }
          : undefined,
      );
      const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response);
      await expect(
        requestInstantReading(tarotData, request, {
          providerConfig,
          fetchImpl,
        }),
      ).rejects.toBeInstanceOf(InstantReadingResponseError);
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    },
  );

  it("maps its own deadline separately from caller cancellation", async () => {
    const pendingFetch = vi.fn<typeof fetch>().mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );

    await expect(
      requestInstantReading(tarotData, request, {
        fetchImpl: pendingFetch,
        providerConfig,
        timeoutMs: 1,
      }),
    ).rejects.toBeInstanceOf(InstantReadingTimeoutError);

    const controller = new AbortController();
    const cancelled = requestInstantReading(tarotData, request, {
      fetchImpl: pendingFetch,
      providerConfig,
      signal: controller.signal,
      timeoutMs: 1_000,
    });
    controller.abort();
    await expect(cancelled).rejects.toBeInstanceOf(InstantReadingAbortedError);
  });
});

function createProviderPayload(reading: string) {
  return {
    status: "completed",
    error: null,
    incomplete_details: null,
    output: [
      {
        type: "message",
        role: "assistant",
        status: "completed",
        content: [{ type: "output_text", text: reading }],
      },
    ],
  };
}

function createValidText() {
  return `다가가고 싶은 마음, 지키고 싶은 선

당신에게는 설렘과 조심스러움이 함께 있어요. 새로운 만남을 향해 한 걸음 내딛고 싶지만, 좋아하는 마음만으로 자신의 속도를 놓치고 싶지는 않아요.

가볍게 시작하는 용기에 자신을 표현하는 힘이 더해져요. 여기에 상처를 경계하는 마음도 나란히 놓여 있어서, 모든 것을 한꺼번에 보여주기보다 편안한 만큼 가까워지는 쪽이 잘 어울립니다. 잘 보이려고 괜찮지 않은 것까지 괜찮다고 넘길 필요는 없어요.

지금은 큰 약속보다 서로 부담 없이 대화를 이어갈 수 있는지를 느껴보세요. 작은 표현에도 자신답게 웃을 수 있는 만남을 바라고 있어요.`;
}
