import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildPrompt,
  careerQuestionDefinitions,
  getAnswerTarget,
  getDefaultReadingStyle,
  getDefaultSpread,
  getReadingTaxonomy,
  getReadingWritingInstruction,
  getTopic,
  publicQuestionDefinitions,
  selfQuestionDefinitions,
} from "@/domain/tarot";
import { getTarotData } from "@/i18n/tarot-data";
import enTarotReading from "@/messages/en/tarot-reading.json";
import koTarotReading from "@/messages/ko/tarot-reading.json";
import { getPublicQuestionCatalog } from ".";

const pickerCopyLimits = {
  en: {
    groupIntro: 12,
    groupTitle: 4,
    questionAction: 4,
    questionSummary: 14,
    questionTitle: 10,
  },
  ko: {
    groupIntro: 36,
    groupTitle: 12,
    questionAction: 10,
    questionSummary: 36,
    questionTitle: 24,
  },
} as const;

const selfContentDecisionDigests = {
  "self-priority-now": {
    en: "7256a4f605bf1315c013f27e108b37d796a42abbab1fbf1727118f6d8e36a451",
    ko: "3842c03454e1126779bc8dd4b6b5a619a57a6d5c65675551c11e081d2517cc22",
  },
  "self-expectation-source": {
    en: "eda02e880c6aebfead00ad3e7fb073d96b551a512873c808cf9a8d2ea24469b2",
    ko: "bc8715663a16fc1e80d669c86d0d106e151e83b6be5097b199cc86f0db89d3cb",
  },
  "self-review-condition": {
    en: "7c70fded53a228a681f97dacebd254d1d98ee3e03bb7074298b7ee9802969b0f",
    ko: "7db770f23a1542a55f8e4af7c549e3cd76a0ec65399e29041f3207002405632c",
  },
  "self-repeating-delay": {
    en: "62fd2a3a93352f240c046136d2dd3d30fbd135169e3539c9e16a1e8eb720ffe6",
    ko: "d9490545fba6eed51beb3e45534be6e59edd45b3d7714585e7e9a58c10a8a108",
  },
  "self-energy-focus": {
    en: "549aeacbea29e5a3bc785c431a6fb8d08acfcb6742f649eb53245a6832a50ddf",
    ko: "0e05d175f907e9b131191d88cb7f285c1f0e5f46a3549deb5dd2de42dcf30a64",
  },
  "self-supportive-pattern": {
    en: "d14d2547897537ca5585ccf5ba8cdd4b1798d6b747b467ec30725b257359623c",
    ko: "6489284ba4212c4e7c24f07744f6b3c5b1b91c2b97310a4566783bbd22eacfc8",
  },
  "money-spending-priority": {
    en: "819d5685309f5de8713041109a78305e55bd89db1881c61eeeb68d6f421be7ed",
    ko: "247981b9b79adabab4d5482dc1d3da81fa5de2a247a063c511eb67042a0c2d46",
  },
  "money-want-or-need": {
    en: "b7ba6c878b6fb0db905ca146c6f0be1ee3b0d6a55238c5a406815c84341ac741",
    ko: "d00fb50275d0df00c4afb9bccdf71705c2a865430252de249ddb51f1beda06c5",
  },
  "money-sustainable-habit": {
    en: "37f2677d86f903ae95142f7a91140843dbc1d44972a8e8a8415433553a1be705",
    ko: "6dd7f9998a8ba0c6c533d34aaf10b343664408348b84f0a4e98ef5ebc0c67f34",
  },
  "money-big-purchase-check": {
    en: "3cfd2ebbb064307eba03f03d033fd39c4feb6efbd2c13a9dabf6d24d693a30f6",
    ko: "3c4e6ec14d5c5cf5657d541c4361295ef49e5905925bcd44e5159b30e6e731e7",
  },
  "money-shared-cost": {
    en: "faf00535fbfd03f9fd1ccf8ce3365bbe074dcae9be79ba5b9ee4407bc600dcf1",
    ko: "936e4e822feaa003e779265f1ac895dd7fecd538d8f3e65aca9cf2e76b92a09f",
  },
  "money-helping-boundary": {
    en: "85505a2fada2b3d8cc884baa30af047d78bf2f8e47ed587ad5f33cdbfc87a085",
    ko: "6578abb40c8895358398fdf25b437c6557bcafda961d30cbd782e44c01bc3744",
  },
  "study-next-focus": {
    en: "83e2e828507e2828fa363eddaea29ef419b2ccd70da3fe1151c92e68454574a8",
    ko: "62ffdfda428549aeef9c1c611f6e3b5c2488bbdc578589d78308cbc1ce9358d1",
  },
  "study-method-fit": {
    en: "b4fb990976a53494b71da4ec409a4f88d36ece5b64af04c96beb278792cb4876",
    ko: "289689da31815fbc65812a8d5d89174436dbb1ecc3baeb38ac22ebdd4e6b1dcb",
  },
  "study-feedback-gap": {
    en: "d2d32b36a79205956f396a2660612fc107605071eb6510ceacea07de84a6d290",
    ko: "998787652e338d5391c8536b562bf09b51cac4dea1fd42835f73dc9b24c23386",
  },
  "project-next-step": {
    en: "078ddeaffb03f68bba731728d37bc52d9c49bc92c169ebd4b6d242fb42b509ac",
    ko: "70cb45fcb6350b2e5c44a6bf2e90e9b080c2515c68f324b1177f1c15f09d5fe0",
  },
  "project-scope-boundary": {
    en: "24e9c54ef21024548db611f6fb1934ba9f9ab433b755bdb4b5b04ff764370cf3",
    ko: "977751cbbfe71c9c3ff7bc90c0e04d73fecff38a9af4d411fb0e0b3a9942f6bb",
  },
  "project-pause-signal": {
    en: "5ace2bc499c919aab0ce72a99830fdf29eb15441f95b4c3b3398daae3f7f05a3",
    ko: "b5ea066e7987420fe28c25a275fcdbee7d1967ff7bcc3a6b2ad3f0697c5d5c2d",
  },
} as const satisfies Record<
  (typeof selfQuestionDefinitions)[number]["id"],
  Readonly<Record<"en" | "ko", string>>
>;

const nearestExistingQuestionBySelfQuestion = {
  "self-priority-now": "career-stay-or-prepare",
  "self-expectation-source": "career-manager-expectations",
  "self-review-condition": "small-test",
  "self-repeating-delay": "broken-contact-pattern",
  "self-energy-focus": "career-opportunity-cost",
  "self-supportive-pattern": "career-underused-strength",
  "money-spending-priority": "career-opportunity-cost",
  "money-want-or-need": "person-or-familiarity",
  "money-sustainable-habit": "career-sustainable-boundary",
  "money-big-purchase-check": "career-opportunity-cost",
  "money-shared-cost": "unspoken-expectations",
  "money-helping-boundary": "swallowed-boundary",
  "study-next-focus": "career-growth-experience",
  "study-method-fit": "career-role-fit",
  "study-feedback-gap": "conversation-to-start",
  "project-next-step": "small-test",
  "project-scope-boundary": "career-sustainable-boundary",
  "project-pause-signal": "continue-slow-stop",
} as const satisfies Record<
  (typeof selfQuestionDefinitions)[number]["id"],
  (typeof publicQuestionDefinitions)[number]["id"]
>;

describe("public question catalog", () => {
  it("locks every localized self content and nearest-existing decision", () => {
    const documentation = readFileSync(
      `${process.cwd()}/docs/architecture/reading-taxonomy.md`,
      "utf8",
    );
    const existingQuestionIds = new Set(
      publicQuestionDefinitions
        .filter(({ domainId }) => domainId !== "self")
        .map(({ id }) => id),
    );

    for (const definition of selfQuestionDefinitions) {
      const nearestExistingId =
        nearestExistingQuestionBySelfQuestion[definition.id];
      const decisionRow = documentation
        .split("\n")
        .find((line) => line.includes(`| \`${definition.id}\``));

      expect(existingQuestionIds.has(nearestExistingId), definition.id).toBe(
        true,
      );
      expect(decisionRow, `${definition.id} decision record`).toContain(
        `\`${nearestExistingId}\``,
      );

      for (const locale of ["en", "ko"] as const) {
        const question = getPublicQuestionCatalog(locale).questions.find(
          ({ id }) => id === definition.id,
        )!;
        // The digest deliberately locks the full localized title and focus plus
        // their taxonomy without duplicating long safety copy in the test.
        const digest = createHash("sha256")
          .update(
            JSON.stringify({
              defaultAnswerTargetId: question.defaultAnswerTargetId,
              domainId: question.domainId,
              focus: question.focus,
              focusId: question.focusId,
              title: question.title,
              topicId: question.topicId,
            }),
          )
          .digest("hex");

        expect(digest, `${locale} ${definition.id} content decision`).toBe(
          selfContentDecisionDigests[definition.id][locale],
        );
      }
    }
  });

  it("builds a balanced, extensible public question catalog", () => {
    for (const locale of ["ko", "en"] as const) {
      const catalog = getPublicQuestionCatalog(locale);
      const careerGroups = catalog.groups.filter(
        ({ domainId }) => domainId === "career",
      );
      const careerQuestions = catalog.questions.filter(
        ({ domainId }) => domainId === "career",
      );
      const selfGroups = catalog.groups.filter(
        ({ domainId }) => domainId === "self",
      );
      const selfQuestions = catalog.questions.filter(
        ({ domainId }) => domainId === "self",
      );

      expect(catalog.questions).toHaveLength(62);
      expect(careerGroups).toHaveLength(5);
      expect(careerGroups.map(({ id }) => id)).toEqual([
        "perception-recognition",
        "decision-tradeoffs",
        "job-search-positioning",
        "strengths-growth",
        "collaboration-boundaries",
      ]);
      expect(careerGroups.map(({ questions }) => questions.length)).toEqual([
        4, 2, 2, 3, 3,
      ]);
      expect(careerQuestions.map(({ id }) => id)).toEqual(
        careerQuestionDefinitions.map(({ id }) => id),
      );
      expect(new Set(careerQuestions.map(({ title }) => title)).size).toBe(14);
      expect(new Set(careerQuestions.map(({ focus }) => focus)).size).toBe(14);
      expect(
        new Set(careerQuestions.map(({ ctaLabel }) => ctaLabel)).size,
      ).toBe(14);
      expect(selfGroups.map(({ id }) => id)).toEqual([
        "values-decisions",
        "habits-growth",
        "money-priorities",
        "money-boundaries",
        "learning-direction",
        "project-momentum",
      ]);
      expect(selfGroups.map(({ questions }) => questions.length)).toEqual([
        3, 3, 3, 3, 3, 3,
      ]);
      expect(selfQuestions.map(({ id }) => id)).toEqual(
        selfQuestionDefinitions.map(({ id }) => id),
      );
      expect(new Set(selfQuestions.map(({ title }) => title)).size).toBe(18);
      expect(new Set(selfQuestions.map(({ focus }) => focus)).size).toBe(18);

      for (const group of catalog.groups) {
        expect(group.questions.length, group.id).toBeGreaterThanOrEqual(2);
      }
      for (const domainId of ["relationship", "career"] as const) {
        expect(
          catalog.questions.some(
            (question) =>
              question.domainId === domainId &&
              question.defaultAnswerTargetId === "external-perception",
          ),
        ).toBe(true);
      }
    }
  });

  it("keeps every public question on the shared narrative contract", () => {
    const obsoleteMandate =
      /exactly two symbolic interpretations|use two (?:distinct |symbolic )?interpretations|서로 다른 두 상징적 해석|두 가지 상징적 해석으로/iu;
    for (const locale of ["ko", "en"] as const) {
      const data = getTarotData(locale);
      const spread = getDefaultSpread(data.spreads);
      for (const question of getPublicQuestionCatalog(locale).questions) {
        const prompt = buildPrompt({
          answerTarget: getAnswerTarget(
            data.answerTargets,
            question.defaultAnswerTargetId,
          ),
          cards: data.cards
            .slice(0, spread.cardCount)
            .map((card) => ({ card })),
          questionFocus: question.focus,
          questionId: question.id,
          readingStyle: getDefaultReadingStyle(data.readingStyles),
          spread,
          template: data.promptTemplate,
          topic: getTopic(data.topics, question.topicId),
        });
        expect(prompt, `${locale} ${question.id}`).toContain(question.focus);
        if (question.domainId !== "self") {
          expect(prompt, `${locale} ${question.id}`).toContain(question.title);
        }
        expect(prompt, `${locale} ${question.id}`).not.toMatch(obsoleteMandate);
        for (const instruction of data.promptTemplate.readingInstructions) {
          expect(prompt).toContain(instruction);
        }
      }
    }
  });

  it("makes the before-starting question explicitly about my readiness for romance", () => {
    for (const locale of ["ko", "en"] as const) {
      const question = getPublicQuestionCatalog(locale).questions.find(
        ({ id }) => id === "before-starting",
      )!;
      expect(question.topicId).toBe("love");
      expect(question.defaultAnswerTargetId).toBe("self");
      expect(question.title).toMatch(
        locale === "ko"
          ? /연애를 시작하기 전/u
          : /before starting a relationship/iu,
      );
      expect(question.focus).toMatch(
        locale === "ko"
          ? /확인할 구체적인 대상/u
          : /a concrete thing for the reader to check/iu,
      );
      expect(question.focus).not.toMatch(
        /가치 일치|서로의 책임|shared values|mutual responsibilities/iu,
      );
    }
  });

  it("keeps self questions grounded and optional guidance reversible", () => {
    for (const locale of ["ko", "en"] as const) {
      const questions = getPublicQuestionCatalog(locale).questions.filter(
        ({ domainId }) => domainId === "self",
      );

      expect(questions).toHaveLength(18);
      for (const question of questions) {
        expect(question.defaultAnswerTargetId).toBe("self");
        expect(question.focus).toMatch(
          locale === "ko"
            ? /기록|조건|근거|확인/u
            : /record|condition|evidence|check/iu,
        );
        expect(question.focus).toMatch(
          locale === "ko" ? /되돌릴 수/u : /reversible/iu,
        );
        if (
          question.focus.includes(
            locale === "ko" ? "도움이 될 때만" : "Only when useful",
          )
        ) {
          expect(question.focus).not.toMatch(
            locale === "ko"
              ? /조건을 제시하세요/u
              : /give a condition|name a condition/iu,
          );
        } else {
          expect(question.focus).toMatch(
            locale === "ko"
              ? /멈추|다시 볼|다시 정할|바꿀|고칠|복구/u
              : /stop|review|revise|change course/iu,
          );
        }
      }
    }
  });

  it("keeps money questions record-led and the safety block always on", () => {
    for (const locale of ["ko", "en"] as const) {
      const tarotData = getTarotData(locale);
      const topic = getTopic(tarotData.topics, "money-life");
      const spread = getDefaultSpread(tarotData.spreads);
      const cards = tarotData.cards
        .slice(0, spread.cardCount)
        .map((card) => ({ card }));
      const questions = getPublicQuestionCatalog(locale).questions.filter(
        ({ topicId }) => topicId === "money-life",
      );
      const safetyInstruction = topic.safetyInstruction!;
      const safetyBlock =
        locale === "ko"
          ? `주제 안전 기준: ${safetyInstruction}`
          : `Topic safety rule: ${safetyInstruction}`;
      const broadPrompt = buildPrompt({
        answerTarget: getAnswerTarget(tarotData.answerTargets, "self"),
        cards,
        readingStyle: getDefaultReadingStyle(tarotData.readingStyles),
        spread,
        template: tarotData.promptTemplate,
        topic,
      });

      expect(questions).toHaveLength(6);
      expect(broadPrompt).toContain(topic.promptLead);
      expect(broadPrompt.split(safetyBlock)).toHaveLength(2);

      for (const question of questions) {
        const prompt = buildPrompt({
          answerTarget: getAnswerTarget(tarotData.answerTargets, "self"),
          cards,
          questionFocus: question.focus,
          questionId: question.id,
          readingStyle: getDefaultReadingStyle(tarotData.readingStyles),
          spread,
          template: tarotData.promptTemplate,
          topic,
        });

        expect(prompt).toContain(question.focus);
        expect(prompt).not.toContain(topic.promptLead);
        expect(prompt.split(safetyBlock)).toHaveLength(2);
      }
    }
  });

  it("keeps career copy grounded and non-predictive", () => {
    const definiteCareerClaim =
      /(?:반드시|확실히|틀림없이).{0,40}(?:합격|승진|퇴사|연봉|수익)|(?:당장|즉시|오늘 바로).{0,30}퇴사|\b(?:definitely|guaranteed|certainly)\b.{0,50}\b(?:hired|promoted|resign|salary|profit)\b|\b(?:resign|quit)\s+(?:now|immediately)\b/iu;
    const professionalAdvice =
      /(?:주식|코인|투자|고소|소송|진단|처방)|\b(?:stock|crypto|invest|lawsuit|diagnosis|prescription)\b/iu;

    for (const locale of ["ko", "en"] as const) {
      const questions = getPublicQuestionCatalog(locale).questions.filter(
        ({ domainId }) => domainId === "career",
      );
      const data = getTarotData(locale);
      const spread = getDefaultSpread(data.spreads);
      const copy = questions
        .flatMap(({ title, summary, focus }) => [title, summary, focus])
        .join("\n");

      expect(copy).not.toMatch(definiteCareerClaim);
      expect(copy).not.toMatch(professionalAdvice);
      for (const question of questions) {
        expect(question.focus).toContain(question.title);
        const prompt = buildPrompt({
          answerTarget: getAnswerTarget(
            data.answerTargets,
            question.defaultAnswerTargetId,
          ),
          cards: data.cards
            .slice(0, spread.cardCount)
            .map((card) => ({ card })),
          questionFocus: question.focus,
          questionId: question.id,
          readingStyle: getDefaultReadingStyle(data.readingStyles),
          spread,
          template: data.promptTemplate,
          topic: getTopic(data.topics, question.topicId),
        });
        expect(prompt).toContain(question.title);
        expect(prompt).toContain(
          locale === "ko"
            ? "진단이나 전문 조언을 하지 마세요"
            : "diagnosis or professional advice",
        );
        expect(prompt).toContain(
          locale === "ko"
            ? "현실의 증거가 아니므로"
            : "symbolic material, not real-world evidence",
        );
        if (question.id === "career-opportunity-cost") {
          const guard =
            locale === "ko"
              ? "선택의 실제 조건·현재 일의 종료나 뜻마다 새 손실을 만들지 마세요."
              : "Invent no actual opportunity terms, end of current work, or new loss for every meaning.";
          const policy = getReadingWritingInstruction(
            data.promptTemplate,
            question.topicId,
            question.id,
          );
          expect(question.focus).toBe(question.title);
          expect(question.focus).not.toContain(guard);
          expect(policy.split(guard)).toHaveLength(2);
          expect(prompt.split(guard)).toHaveLength(2);
        }
      }
    }
  });

  it("keeps every visible picker line short, distinct, and plain", () => {
    for (const locale of ["ko", "en"] as const) {
      const catalog = getPublicQuestionCatalog(locale);
      const limits = pickerCopyLimits[locale];
      const measure = (value: string) =>
        locale === "ko" ? value.length : value.trim().split(/\s+/u).length;

      for (const group of catalog.groups) {
        expect(measure(group.title), group.title).toBeLessThanOrEqual(
          limits.groupTitle,
        );
        expect(measure(group.intro), group.intro).toBeLessThanOrEqual(
          limits.groupIntro,
        );
      }

      for (const question of catalog.questions) {
        expect(measure(question.title), question.title).toBeLessThanOrEqual(
          limits.questionTitle,
        );
        expect(measure(question.summary), question.summary).toBeLessThanOrEqual(
          limits.questionSummary,
        );
        expect(
          measure(question.ctaLabel),
          question.ctaLabel,
        ).toBeLessThanOrEqual(limits.questionAction);
        expect(question.title.match(/\?/gu)).toHaveLength(1);
        expect(question.summary.match(/\./gu)).toHaveLength(1);
      }

      for (const key of ["title", "summary", "ctaLabel"] as const) {
        const values = catalog.questions.map((question) => question[key]);
        expect(new Set(values).size, `${locale} ${key}`).toBe(values.length);
      }

      const visibleCopy = catalog.groups
        .flatMap(({ intro, questions, title }) => [
          title,
          intro,
          ...questions.flatMap((question) => [
            question.title,
            question.summary,
            question.ctaLabel,
          ]),
        ])
        .join("\n");
      expect(visibleCopy).not.toMatch(
        locale === "ko"
          ? /성찰|프리셋|분류 체계|지속 가능한|선택의 대가/u
          : /reflection framework|preset|taxonomy|sustainable|tradeoffs|sharper lens|broad focus/iu,
      );
    }
  });

  it("keeps picker controls free of internal content terms", () => {
    const pickerCopy = [
      koTarotReading.questionPickerSummary,
      koTarotReading.questionPickerCount,
      koTarotReading.questionPickerIntro,
      koTarotReading.selectedQuestionLabel,
      koTarotReading.selectedQuestionFocusLabel,
      koTarotReading.clearQuestionLabel,
      enTarotReading.questionPickerSummary,
      enTarotReading.questionPickerCount,
      enTarotReading.questionPickerIntro,
      enTarotReading.selectedQuestionLabel,
      enTarotReading.selectedQuestionFocusLabel,
      enTarotReading.clearQuestionLabel,
    ].join("\n");

    expect(pickerCopy).not.toMatch(
      /성찰|대주제|리딩의 초점|reflection question|broad focus|sharper lens/iu,
    );
  });

  it("uses each localized career focus instead of the broad topic lead", () => {
    for (const locale of ["ko", "en"] as const) {
      const tarotData = getTarotData(locale);
      const topic = getTopic(tarotData.topics, "career-direction");
      const spread = getDefaultSpread(tarotData.spreads);
      const cards = tarotData.cards
        .slice(0, spread.cardCount)
        .map((card) => ({ card }));
      const questions = getPublicQuestionCatalog(locale).questions.filter(
        ({ domainId }) => domainId === "career",
      );

      for (const question of questions) {
        const taxonomy = getReadingTaxonomy(topic.id, question.id);
        const prompt = buildPrompt({
          answerTarget: getAnswerTarget(
            tarotData.answerTargets,
            taxonomy.defaultAnswerTargetId,
          ),
          cards,
          questionFocus: question.focus,
          questionId: question.id,
          readingStyle: getDefaultReadingStyle(tarotData.readingStyles),
          spread,
          template: tarotData.promptTemplate,
          topic,
        });

        expect(prompt).toContain(question.focus);
        expect(prompt).not.toContain(topic.promptLead);
      }
    }
  });

  it("routes a potential-partner impression without turning it into current attraction", () => {
    for (const locale of ["ko", "en"] as const) {
      const tarotData = getTarotData(locale);
      const question = getPublicQuestionCatalog(locale).questions.find(
        ({ id }) => id === "romantic-partner-impression",
      )!;
      const topic = getTopic(tarotData.topics, question.topicId);
      const taxonomy = getReadingTaxonomy(topic.id, question.id);
      const spread = getDefaultSpread(tarotData.spreads);
      const prompt = buildPrompt({
        answerTarget: getAnswerTarget(
          tarotData.answerTargets,
          taxonomy.defaultAnswerTargetId,
        ),
        cards: tarotData.cards
          .slice(0, spread.cardCount)
          .map((card) => ({ card })),
        questionFocus: question.focus,
        questionId: question.id,
        readingStyle: getDefaultReadingStyle(tarotData.readingStyles),
        spread,
        template: tarotData.promptTemplate,
        topic,
      });

      expect(question.topicId).toBe("love");
      expect(prompt).toContain(question.focus);
      expect(prompt).not.toContain(topic.promptLead);
      expect(question.focus).toMatch(
        locale === "ko"
          ? /특정 상대의 현재 호감을 전제하지 않고/u
          : /without assuming a specific person[’']s current attraction/u,
      );
      expect(topic.resultFrame).toMatch(
        locale === "ko" ? /인상/u : /interpersonal/iu,
      );
    }
  });

  it("answers requested attraction without adding it to impression questions", () => {
    for (const locale of ["ko", "en"] as const) {
      const tarotData = getTarotData(locale);
      const spread = getDefaultSpread(tarotData.spreads);
      const cards = tarotData.cards
        .slice(0, spread.cardCount)
        .map((card) => ({ card }));
      const catalog = getPublicQuestionCatalog(locale);
      const buildQuestionPrompt = (
        questionId:
          | "interest-or-kindness"
          | "mutual-view"
          | "how-they-see-me"
          | "romantic-partner-impression",
      ) => {
        const question = catalog.questions.find(({ id }) => id === questionId)!;
        const topic = getTopic(tarotData.topics, question.topicId);
        const taxonomy = getReadingTaxonomy(topic.id, question.id);
        return {
          focus: question.focus,
          prompt: buildPrompt({
            answerTarget: getAnswerTarget(
              tarotData.answerTargets,
              taxonomy.defaultAnswerTargetId,
            ),
            cards,
            questionFocus: question.focus,
            questionId: question.id,
            readingStyle: getDefaultReadingStyle(tarotData.readingStyles),
            spread,
            template: tarotData.promptTemplate,
            topic,
          }),
        };
      };

      const attraction = buildQuestionPrompt("interest-or-kindness");
      expect(attraction.focus).toMatch(
        locale === "ko" ? /호감.*친절/u : /interest.*kindness/iu,
      );
      expect(attraction.prompt).toContain(attraction.focus);

      for (const questionId of [
        "mutual-view",
        "how-they-see-me",
        "romantic-partner-impression",
      ] as const) {
        const impression = buildQuestionPrompt(questionId);
        expect(impression.prompt).toContain(impression.focus);
        expect(impression.prompt).toContain(
          locale === "ko"
            ? "묻지 않은 미래·연애·조언·숙제·요약은 붙이지 마세요"
            : "unasked predictions, romance",
        );
      }

      expect(buildQuestionPrompt("mutual-view").focus).not.toMatch(
        locale === "ko" ? /호감/u : /attraction|romantic interest/iu,
      );
    }
  });
});

it("keeps the old-pattern question in the present in both locales", () => {
  for (const locale of ["ko", "en"] as const) {
    const question = getPublicQuestionCatalog(locale).questions.find(
      (q) => q.id === "repeated-pattern",
    )!;
    expect(question.focus).toContain(question.title);
    expect(question.title).toMatch(locale === "ko" ? /남아/u : /still/iu);
    expect(question.focus).not.toMatch(/could return/iu);
  }
});

describe("question material and owned writing policy", () => {
  it.each(["ko", "en"] as const)(
    "keeps contact and effort focus as titles with policy in the copied prompt in %s",
    (locale) => {
      const data = getTarotData(locale);
      const catalog = getPublicQuestionCatalog(locale);
      const spread = getDefaultSpread(data.spreads);
      for (const id of ["broken-contact-pattern", "effort-balance"] as const) {
        const question = catalog.questions.find((q) => q.id === id)!;
        expect(question.focus).toBe(question.title);
        const policy = getReadingWritingInstruction(
          data.promptTemplate,
          question.topicId,
          id,
        );
        expect(policy).toBe(
          data.promptTemplate.questionWritingInstructions?.[id],
        );
        const taxonomy = getReadingTaxonomy(question.topicId, id);
        const prompt = buildPrompt({
          answerTarget: getAnswerTarget(
            data.answerTargets,
            taxonomy.defaultAnswerTargetId,
          ),
          cards: data.cards
            .slice(0, spread.cardCount)
            .map((card) => ({ card })),
          readingStyle: getDefaultReadingStyle(data.readingStyles),
          questionFocus: question.focus,
          questionId: id,
          spread,
          template: data.promptTemplate,
          topic: getTopic(data.topics, question.topicId),
        });
        expect(prompt.split(policy)).toHaveLength(2);
        expect(
          prompt.split(data.promptTemplate.narrationInstruction),
        ).toHaveLength(2);
      }
    },
  );
});
