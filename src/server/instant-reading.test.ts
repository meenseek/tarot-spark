import { describe, expect, it, vi } from "vitest";
import {
  buildPrompt,
  careerQuestionDefinitions,
  getAnswerTarget,
  getDefaultReadingStyle,
  getDefaultSpread,
  type InstantReadingRequest,
} from "@/domain/tarot";
import { getPublicQuestionCatalog } from "@/features/reading-questions";
import { getTarotData } from "@/i18n/tarot-data";
import {
  buildCloudflareInstantReadingBody,
  buildInstantReadingPrompt,
  getCloudflareInstantReadingUrl,
  instantReadingGenerationConfig,
  InstantReadingAbortedError,
  InstantReadingResponseError,
  InstantReadingTimeoutError,
  isInstantReadingRequestConsistent,
  requestInstantReading,
} from "./instant-reading";
import { cloudflareInstantReadingModel } from "./instant-reading-config";

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
const providerConfig = { accountId: "account/id", apiToken: "secret-token" };

describe("Cloudflare instant reading adapter", () => {
  it("builds one fixed, bounded request without private or card identifiers", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        result: { response: createValidText() },
        success: true,
      }),
    );

    await expect(
      requestInstantReading(tarotData, request, { fetchImpl, providerConfig }),
    ).resolves.toEqual({ text: createValidText() });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      `https://api.cloudflare.com/client/v4/accounts/account%2Fid/ai/run/${cloudflareInstantReadingModel}`,
      expect.objectContaining({
        headers: {
          Authorization: "Bearer secret-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );

    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body));
    expect(body).toEqual(buildCloudflareInstantReadingBody(tarotData, request));
    expect(body).toMatchObject(instantReadingGenerationConfig);
    expect(JSON.stringify(body)).not.toContain("the-fool");
    expect(JSON.stringify(body)).not.toContain("바보");
    expect(JSON.stringify(body)).not.toContain("privateContext");
    expect(JSON.stringify(body)).not.toContain("secret-token");
    expect(JSON.stringify(body)).toContain("사전식 뜻풀이를 반복하지 마세요");
    expect(JSON.stringify(body)).toContain("기간·비용·경계");
    expect(JSON.stringify(body)).toContain("양자택일로 몰지 않는");
    expect(JSON.stringify(body)).toContain("입력에 없는 사건");
    expect(JSON.stringify(body)).toContain("이 행동을 멈추고 다시 판단");
    expect(JSON.stringify(body)).toContain("'내용'이라는 단어");
    expect(JSON.stringify(body)).toContain(
      "카드상 ... 가능성에 무게가 실립니다",
    );
    expect(JSON.stringify(body)).toContain(
      "타인의 시선이 초점이면 관계에서는 질문에 맞는 서로 다른 대인 인상·상호 인식",
    );
    expect(JSON.stringify(body)).toContain(
      "커리어에서는 서로 다른 업무상 인식·평가",
    );
    expect(JSON.stringify(body)).toContain(
      "질문에 없는 호감 해석을 덧붙이지 마세요",
    );
  });

  it("uses the exact direct endpoint", () => {
    expect(getCloudflareInstantReadingUrl("abc")).toBe(
      `https://api.cloudflare.com/client/v4/accounts/abc/ai/run/${cloudflareInstantReadingModel}`,
    );
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
    expect(prompt).toContain("사전식 뜻풀이를 반복하지 마세요");
    expect(prompt).toContain("비예측적 해석 두 개");
    expect(prompt).toContain("기간·비용·경계 중 하나가 명시된");
    expect(prompt).toContain("현재 상태를 사실처럼 서술");
    expect(prompt).toContain("어느 해석의 비중을 바꿀지");
    expect(prompt).toContain("질문에 대한 상징적 답을 먼저 제시");
    expect(prompt).toContain(
      "관계에서는 질문이 묻는 대인 인상·상호 인식·호감·연애적 관심·망설임을",
    );
    expect(prompt).toContain(
      "커리어에서는 질문이 묻는 업무상 평가·신뢰·기대를",
    );
    expect(prompt).toContain("내용:'이라는 단어를 출력하지 마세요");
    expect(prompt).toContain("독자에게 제안하는 권유형 한 문장");
    expect(prompt).toContain("타인의 감정이나 관계 상태를 사실·확실한 것으로");
  });

  it("keeps the money safety rule in broad and question candidate prompts", () => {
    const topic = tarotData.topics.find(({ id }) => id === "money-life")!;
    const questions = getPublicQuestionCatalog("ko").questions.filter(
      ({ topicId }) => topicId === topic.id,
    );
    const safetyLine = `주제 안전 기준: ${topic.safetyInstruction}`;
    const broadRequest = { ...request, topicId: topic.id } as const;
    const broadPrompt = buildInstantReadingPrompt(tarotData, broadRequest);

    expect(questions).toHaveLength(6);
    expect(broadPrompt).toContain(`질문의 초점: ${topic.promptLead}`);
    expect(broadPrompt.split(safetyLine)).toHaveLength(2);
    expect(
      JSON.stringify(
        buildCloudflareInstantReadingBody(tarotData, broadRequest),
      ),
    ).toContain(safetyLine);

    for (const question of questions) {
      const candidateRequest = {
        ...request,
        questionId: question.id,
        topicId: topic.id,
      };
      const prompt = buildInstantReadingPrompt(tarotData, candidateRequest);

      expect(prompt).toContain(`질문의 초점: ${question.focus}`);
      expect(prompt).not.toContain(`질문의 초점: ${topic.promptLead}`);
      expect(prompt.split(question.focus)).toHaveLength(2);
      expect(prompt.split(safetyLine)).toHaveLength(2);
      expect(
        JSON.stringify(
          buildCloudflareInstantReadingBody(tarotData, candidateRequest),
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
      "답변의 기본 초점: 두 사람 사이의 정서적 상호작용과 반복되는 관계 패턴",
    );
    const externalPerceptionPrompt = buildInstantReadingPrompt(tarotData, {
      ...request,
      questionId: "mutual-view",
      topicId: "feelings",
    });
    expect(externalPerceptionPrompt).toContain(
      `답변의 기본 초점: ${
        getAnswerTarget(tarotData.answerTargets, "external-perception")
          .instruction
      }`,
    );
    expect(externalPerceptionPrompt).toContain(
      "질문의 초점: 상대가 독자를 보는 시선과 독자가 상대를 보는 시선을",
    );
    expect(externalPerceptionPrompt).toContain(
      "질문에 없는 호감 해석을 덧붙이지 마세요",
    );

    const attractionPrompt = buildInstantReadingPrompt(tarotData, {
      ...request,
      questionId: "interest-or-kindness",
      topicId: "feelings",
    });
    expect(attractionPrompt).toContain(
      "질문의 초점: 제공된 카드가 상대의 호감이나 연애적 관심 쪽에 어느 정도 무게를 두는지",
    );
    expect(attractionPrompt).toContain(
      "질문에 없는 호감 해석을 덧붙이지 마세요",
    );

    const personalImpressionPrompt = buildInstantReadingPrompt(tarotData, {
      ...request,
      questionId: "how-they-see-me",
    });
    expect(personalImpressionPrompt).toContain(
      "질문의 초점: 특정 상대가 독자를 어떤 사람으로 볼 가능성이 있는지에만 초점을 맞춰",
    );
    expect(personalImpressionPrompt).toContain(
      "서로의 기대나 현재 호감의 크기를 대신 묻지 말고",
    );

    const partnerImpressionPrompt = buildInstantReadingPrompt(tarotData, {
      ...request,
      questionId: "romantic-partner-impression",
    });
    expect(partnerImpressionPrompt).toContain(
      "질문의 초점: 특정 상대의 현재 호감을 꾸며내지 말고",
    );
    expect(partnerImpressionPrompt).toContain(
      "답변의 기본 초점: 타인이 독자를 보는 시선과 질문이 직접 묻는 인상·관심·평가·기대·망설임",
    );
    expect(partnerImpressionPrompt).not.toContain(
      "질문의 핵심이 상대의 마음이라면",
    );
    expect(partnerImpressionPrompt).toContain(
      "질문에 없는 호감 해석을 덧붙이지 마세요",
    );

    const selfPrompt = buildInstantReadingPrompt(tarotData, {
      ...request,
      questionId: "ignored-signals",
      topicId: "feelings",
    });
    expect(selfPrompt).toContain(
      "답변의 기본 초점: 독자의 감정·기대·선택·반복 패턴",
    );
    expect(selfPrompt).toContain("질문의 초점: 내가 중요하지 않다고 넘긴 신호");
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
      expect(careerPrompt).toContain(`질문의 초점: ${question!.focus}`);
      expect(careerPrompt).toContain(
        `답변의 기본 초점: ${
          getAnswerTarget(
            tarotData.answerTargets,
            definition.defaultAnswerTargetId,
          ).instruction
        }`,
      );
      expect(careerPrompt).not.toContain(
        "질문의 초점: 일에서 어디에 힘을 쏟고 있는지",
      );
    }

    const managerPrompt = buildInstantReadingPrompt(tarotData, {
      ...request,
      questionId: "career-manager-view",
      topicId: "career-direction",
    });
    expect(managerPrompt).toContain(
      "질문의 초점: 제공된 카드가 상사가 독자의 업무 방식과 준비도를 어떻게 볼 가능성을 시사하는지",
    );
    expect(managerPrompt).toContain(
      "답변의 기본 초점: 타인이 독자를 보는 시선과 질문이 직접 묻는 인상·관심·평가·기대·망설임",
    );
    expect(managerPrompt).toContain(
      "커리어에서는 질문이 묻는 업무상 평가·신뢰·기대를 가능성으로 직접 읽으세요",
    );
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

      for (const prompt of [copiedPrompt, instantPrompt]) {
        expect(prompt).toContain(answerTarget.instruction);
        expect(prompt).toContain(topic.promptLead);
      }
    }
  });

  it.each([
    Response.json({ success: false, errors: [{ message: "rejected" }] }),
    Response.json({ success: true, result: {} }),
    new Response("not-json"),
    Response.json({
      result: { response: createValidText().replace("[가능성 B]", "[누락]") },
      success: true,
    }),
  ])("rejects a malformed provider response", async (response) => {
    await expect(
      requestInstantReading(tarotData, request, {
        fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(response),
        providerConfig,
      }),
    ).rejects.toBeInstanceOf(InstantReadingResponseError);
  });

  it("rejects a provider body before buffering beyond the byte cap", async () => {
    await expect(
      requestInstantReading(tarotData, request, {
        fetchImpl: vi
          .fn<typeof fetch>()
          .mockResolvedValue(new Response("x".repeat(40_000))),
        providerConfig,
      }),
    ).rejects.toBeInstanceOf(InstantReadingResponseError);
  });

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

function createValidText() {
  return `[전체 흐름]
새로운 가능성과 분명한 표현이 함께 필요하지만 확인하지 않은 부분은 현실의 대화로 살펴야 기대와 관찰을 구분할 수 있습니다.
[카드별 흐름]
1. 새로운 시도를 열어 두되 아직 확인하지 않은 기대를 사실처럼 단정하지 않는 태도를 살펴봅니다.
2. 표현할 수 있는 선택과 자원을 구체적으로 사용하면 원하는 경계를 더 분명히 전할 수 있습니다.
3. 아픈 감정을 서둘러 지우기보다 실제로 확인한 행동과 해석을 나누어 바라볼 필요가 있습니다.
[가장 강한 연결]
열린 가능성과 능동적인 표현이 서로 힘을 보태지만 감정을 건너뛰면 속도가 현실보다 앞설 수 있다는 긴장이 두드러집니다.
[가능성 A]
서로 표현하는 속도가 달라서 같은 행동을 다르게 받아들이며 불확실성이 커졌을 수 있습니다.
[가능성 B]
기대가 실제로 확인한 신호보다 앞서서 관계의 빈칸을 스스로 채우고 있을 수 있습니다.
[현실 확인]
아직 모르는 점: 현재 정보만으로는 서로 같은 기대와 관계의 속도를 원하는지 알 수 없습니다.
관찰할 점: 다음 대화에서 질문에 대한 답과 이후 행동이 일정하게 이어지는지 살펴보세요.
다시 볼 조건: 말과 행동이 계속 어긋나면 두 가능성을 모두 내려놓고 다시 살펴보세요.
[다음 행동]
작은 행동: 부담이 적은 질문 하나를 골라 서로 확인할 수 있는 범위에서 짧게 대화해 보세요.
멈추거나 다시 볼 조건: 대화가 반복해서 경계를 넘거나 일상에 큰 비용을 만들면 이 행동을 멈추고 다시 판단하세요.
[성찰 질문]
지금 내가 기대와 실제 관찰을 구분하기 위해 가장 먼저 확인할 수 있는 것은 무엇인가요?`;
}
