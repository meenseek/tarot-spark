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
    en: "778200a8f8e05500ed49af83c7d5c9840ea215434525f0f5ed43fadc41be9f31",
    ko: "3498cde34795e1bf1ad9d1aa25b23b557fe07ad1205a66cd90ca46024867e341",
  },
  "self-expectation-source": {
    en: "f7e7358127fb9791382290eee388d5f293b5c257a05e5ff2d5245ced4a422fed",
    ko: "0d46f3e76e5f1faf1c938573b95e28867482fbf0dce0341c96bade972b00ad9e",
  },
  "self-review-condition": {
    en: "4254c6786c162c0d5b9e5cf891e47c7d3ef5ee004c1d397791209520599ba656",
    ko: "8d64abd559719bedbd5cbbd63b0f87f1f1ec9b746c2b429fb858961b1d1abf7d",
  },
  "self-repeating-delay": {
    en: "4e02f6c45fc884ea6544b194c680860ad463de270f7b50bd0dde8bd5bc5167ad",
    ko: "c0ddc9bc9eb40c2f4b7a02a40d842252fb62007b045c0b188059659088dfa550",
  },
  "self-energy-focus": {
    en: "8541574a75578778642c39204f4ba9e86a80d874f098fe12586871f37b6b1657",
    ko: "0ae5f6205bd52ebe1346977132102a80fe7a67772da5a26629154262129ae864",
  },
  "self-supportive-pattern": {
    en: "cd2f1dcf4fa9341cead22c877195e2d29249bdc672858910aab8fb14c771256e",
    ko: "7f998ee94a617c6b9f447dfae19ab0b3ec9712b12425c0ad91a1adb431c057b1",
  },
  "money-spending-priority": {
    en: "85851ee5cfb5e08836f93ebace0c8e80b838508a324f6931f6049fbc1df5bb7c",
    ko: "d6c01f5ea310ef1b560da62ac89e9443b34bb277163b7e17868549c9107f30ac",
  },
  "money-want-or-need": {
    en: "aa7756414bd441e7c981d3e272cab3c41478bf08440a074b1119f87226f3e9df",
    ko: "6997d37dbae84944790988a2e5a966f17388f9af80d587530f8aa8f6ea88b439",
  },
  "money-sustainable-habit": {
    en: "603940291b3995f44d4342e7a6d379109dccfd9943bf2c19bb071220b49b1fbe",
    ko: "13a8c052a74aa59f1961994a7ff55f6509d17cb49d3b56aaa29fcc90c509905a",
  },
  "money-big-purchase-check": {
    en: "6bbc6c8f9856a904a364b684efae977686aac5b8a268d1f2510f23ae15e9b687",
    ko: "e557f3e6d448ea66651de6ad45aa817859f1e7f0792919085c257a665213bd17",
  },
  "money-shared-cost": {
    en: "2202bfb8b6b43e42cc667d4bc9322be361b5de53b0ec120d8d190b28d7f0eabf",
    ko: "cdee25156f4487c88926200b728d8e500e596e74e4de073a52ca3223dcaf3074",
  },
  "money-helping-boundary": {
    en: "0c965e8ac03d8f8f72c5423d679a5a8cc2a62b5a1f22697c86bc45c11b2c83ca",
    ko: "bbaaea46412835d8851e5f952edb1f9f7110f221b50425500266e599b2850d6d",
  },
  "study-next-focus": {
    en: "ea47135273afd51db395bdff80b5571fa683312ef79a04abedc2f651bfe5c65e",
    ko: "83e736cde537880af8c5eea67206da8b30a2019a3cf6001b4cc7f8451b63125a",
  },
  "study-method-fit": {
    en: "64bdb7780356914a7562866778b691c23d99b8e3efa2aa356b43328955e37256",
    ko: "c238e25c352a2bce6341bcbcc2036421d4f1dd9860ff00539b2e7114d1648cf4",
  },
  "study-feedback-gap": {
    en: "89b3cf8b60086addd61971721e53840ffb8f55cbca718407f34ac26cd57cbe7a",
    ko: "b786657087a081fc622ab3ae0be81ba15d219c0047a1d4659761440a229365d7",
  },
  "project-next-step": {
    en: "8f2eb3d010cef319c92298ca228105d5b702ffcd3cc6d31eafde2380328aa3d3",
    ko: "3d4bbb254311e5ffb9598a1ccbfdaa10051f08e910ae3705c6d85f3b1a35f50a",
  },
  "project-scope-boundary": {
    en: "552bc6a1a190cd7a896fdb7f9d4b71774d89eff11a7b2ac1194b95944734cbd2",
    ko: "6097cdf1f5a7d2ce68f45f648e363904ef945c662ef90486a88c937b394b47e9",
  },
  "project-pause-signal": {
    en: "64576e3fe0468dde02db785139e39f9ce9bb711dc555c6776a7a6a09bc38f25a",
    ko: "3b57d6516bb0ffc20747ffa793bdc198ba71bdb1fde966296c5fa23d64ae164a",
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

  it("keeps self questions observable, reversible, and reviewable", () => {
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
        expect(question.focus).toMatch(
          locale === "ko"
            ? /멈추|다시 볼|다시 정할|바꿀|고칠|복구/u
            : /stop|review|revise|change course/iu,
        );
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

  it("keeps career copy reflective, evidence-led, and non-predictive", () => {
    const definiteCareerClaim =
      /(?:반드시|확실히|틀림없이).{0,40}(?:합격|승진|퇴사|연봉|수익)|(?:당장|즉시|오늘 바로).{0,30}퇴사|\b(?:definitely|guaranteed|certainly)\b.{0,50}\b(?:hired|promoted|resign|salary|profit)\b|\b(?:resign|quit)\s+(?:now|immediately)\b/iu;
    const professionalAdvice =
      /(?:주식|코인|투자|고소|소송|진단|처방)|\b(?:stock|crypto|invest|lawsuit|diagnosis|prescription)\b/iu;

    for (const locale of ["ko", "en"] as const) {
      const questions = getPublicQuestionCatalog(locale).questions.filter(
        ({ domainId }) => domainId === "career",
      );
      const copy = questions
        .flatMap(({ title, summary, focus }) => [title, summary, focus])
        .join("\n");

      expect(copy).not.toMatch(definiteCareerClaim);
      expect(copy).not.toMatch(professionalAdvice);
      for (const question of questions) {
        expect(question.focus).toMatch(
          locale === "ko"
            ? /확인|근거|기록|실험|시도|역할|경계/u
            : /evidence|record|experiment|attempt|role|boundary|verify/iu,
        );
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
          ? /특정 상대의 현재 호감을 꾸며내지 말고/u
          : /Do not invent any specific person's current attraction/u,
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
            readingStyle: getDefaultReadingStyle(tarotData.readingStyles),
            spread,
            template: tarotData.promptTemplate,
            topic,
          }),
        };
      };

      const attraction = buildQuestionPrompt("interest-or-kindness");
      expect(attraction.focus).toMatch(
        locale === "ko"
          ? /호감이나 연애적 관심/u
          : /romantic (?:interest|attention)/iu,
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
            ? "질문에 없는 호감 해석을 덧붙이지 마세요"
            : "Do not add an attraction interpretation when the question does not ask for one",
        );
      }

      expect(buildQuestionPrompt("mutual-view").focus).not.toMatch(
        locale === "ko" ? /호감/u : /attraction|romantic interest/iu,
      );
    }
  });
});
