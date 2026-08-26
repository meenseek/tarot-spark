import { describe, expect, it } from "vitest";
import {
  buildPrompt,
  careerQuestionDefinitions,
  getAnswerTarget,
  getDefaultReadingStyle,
  getDefaultSpread,
  getReadingTaxonomy,
  getTopic,
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

describe("public question catalog", () => {
  it("builds a balanced, extensible public question catalog", () => {
    for (const locale of ["ko", "en"] as const) {
      const catalog = getPublicQuestionCatalog(locale);
      const careerGroups = catalog.groups.filter(
        ({ domainId }) => domainId === "career",
      );
      const careerQuestions = catalog.questions.filter(
        ({ domainId }) => domainId === "career",
      );

      expect(catalog.questions).toHaveLength(44);
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
      koTarotReading.questionPickerOptional,
      koTarotReading.questionPickerIntro,
      koTarotReading.selectedQuestionLabel,
      koTarotReading.selectedQuestionFocusLabel,
      koTarotReading.clearQuestionLabel,
      enTarotReading.questionPickerSummary,
      enTarotReading.questionPickerOptional,
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
