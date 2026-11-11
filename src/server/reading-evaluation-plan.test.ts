import { afterEach, describe, expect, it, vi } from "vitest";
import fixture from "../../scripts/fixtures/reading-development.json";
import { getTarotData } from "@/i18n/tarot-data";
import * as instantReading from "./instant-reading";
import { planReadingEvaluation } from "./reading-evaluation-plan";

const data = getTarotData("ko");
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("reading evaluation planning", () => {
  it("plans the public development fixture without contacting a provider", () => {
    const fetch = vi.fn(() => {
      throw new Error("No provider call allowed");
    });
    vi.stubGlobal("fetch", fetch);
    const first = planReadingEvaluation(data, fixture, {
      stage: "development",
    });
    expect(first.executesProvider).toBe(false);
    expect(first.counts).toMatchObject({
      planned: 12,
      generationCandidates: 12,
    });
    expect(fetch).not.toHaveBeenCalled();
    const same = planReadingEvaluation(data, fixture, {
      stage: "development",
      previous: first,
    });
    expect(same.counts.generationCandidates).toBe(0);
    expect(same.counts.changedBodies).toBe(0);
  });

  it("selects only cases containing a changed meaning", () => {
    const previous = planReadingEvaluation(data, fixture, {
      stage: "development",
    });
    const changed = {
      ...data,
      cards: data.cards.map((card) =>
        card.id === "the-emperor"
          ? { ...card, meaning: `${card.meaning} 공개된 상징 재료의 수정.` }
          : card,
      ),
    };
    const plan = planReadingEvaluation(changed, fixture, {
      stage: "development",
      previous,
    });
    expect(
      plan.cases
        .filter((row) => row.generationCandidate)
        .map((row) => row.caseId),
    ).toEqual(["dev-09"]);
  });

  it("includes the model configuration in request identity", () => {
    const previous = planReadingEvaluation(data, fixture, {
      stage: "development",
    });
    const build = instantReading.buildOpenAIInstantReadingBody;
    vi.spyOn(
      instantReading,
      "buildOpenAIInstantReadingBody",
    ).mockImplementation(
      (...args) =>
        ({ ...build(...args), model: "different-test-model" }) as ReturnType<
          typeof build
        >,
    );
    const changed = planReadingEvaluation(data, fixture, {
      stage: "development",
      previous,
    });
    expect(changed.counts.generationCandidates).toBe(12);
  });

  it("reuses API cases when a copied-only writing example changes", () => {
    const previous = planReadingEvaluation(data, fixture, {
      stage: "development",
    });
    const changed = {
      ...data,
      promptTemplate: {
        ...data.promptTemplate,
        writingProfiles: {
          ...data.promptTemplate.writingProfiles,
          action: {
            ...data.promptTemplate.writingProfiles.action,
            example: `${data.promptTemplate.writingProfiles.action.example} 문체 예시 수정.`,
          },
        },
      },
    };
    const plan = planReadingEvaluation(changed, fixture, {
      stage: "development",
      previous,
    });
    expect(
      plan.cases
        .filter((row) => row.generationCandidate)
        .map((row) => row.caseId),
    ).toEqual([]);
  });

  it("reuses both spreads when a copied-only deep example changes", () => {
    const twoSpreads = {
      cases: [3, 6].map((cardCount) => ({
        caseId: `spread-${cardCount}`,
        kind: "normal",
        request: {
          ...fixture.cases[0]!.request,
          topicId: "career-direction",
          questionId: "career-opportunity-cost",
          spreadId: cardCount === 3 ? "quick" : "deep",
          cards: data.cards
            .slice(0, cardCount)
            .map(({ id }) => ({ cardId: id })),
        },
      })),
    };
    const previous = planReadingEvaluation(data, twoSpreads, {
      stage: "development",
    });
    const changed = {
      ...data,
      promptTemplate: {
        ...data.promptTemplate,
        writingProfiles: {
          ...data.promptTemplate.writingProfiles,
          "career-choice": {
            ...data.promptTemplate.writingProfiles["career-choice"],
            deepExample: `${data.promptTemplate.writingProfiles["career-choice"].deepExample} 문체 예시 수정.`,
          },
        },
      },
    };
    const plan = planReadingEvaluation(changed, twoSpreads, {
      stage: "development",
      previous,
    });
    expect(
      plan.cases
        .filter((row) => row.generationCandidate)
        .map((row) => row.caseId),
    ).toEqual([]);
  });

  it("selects only cases using a changed writing instruction", () => {
    const previous = planReadingEvaluation(data, fixture, {
      stage: "development",
    });
    const changed = {
      ...data,
      promptTemplate: {
        ...data.promptTemplate,
        writingProfiles: {
          ...data.promptTemplate.writingProfiles,
          "career-perception": {
            ...data.promptTemplate.writingProfiles["career-perception"],
            instruction: `${data.promptTemplate.writingProfiles["career-perception"].instruction} 문체 지침 수정.`,
          },
        },
      },
    };
    const plan = planReadingEvaluation(changed, fixture, {
      stage: "development",
      previous,
    });
    expect(
      plan.cases
        .filter((row) => row.generationCandidate)
        .map((row) => row.caseId),
    ).toEqual(["dev-09"]);
  });

  it("selects only broad cases when overview guidance changes", () => {
    const base = fixture.cases[0]!.request;
    const broad = {
      cards: base.cards,
      spreadId: base.spreadId,
      styleId: base.styleId,
      topicId: "relationship-flow",
    };
    const input = {
      cases: [
        { caseId: "broad", kind: "normal", request: broad },
        {
          caseId: "selected",
          kind: "normal",
          request: { ...broad, questionId: "effort-balance" },
        },
      ],
    };
    const previous = planReadingEvaluation(data, input, {
      stage: "development",
    });
    const changed = {
      ...data,
      promptTemplate: {
        ...data.promptTemplate,
        writingProfiles: {
          ...data.promptTemplate.writingProfiles,
          relationship: {
            ...data.promptTemplate.writingProfiles.relationship,
            overviewInstruction: "전반적인 관계의 온도만 읽습니다.",
          },
        },
      },
    };
    const result = planReadingEvaluation(changed, input, {
      stage: "development",
      previous,
    });
    expect(
      result.cases
        .filter((row) => row.generationCandidate)
        .map((row) => row.caseId),
    ).toEqual(["broad"]);
  });

  it("always selects the full release matrix even when every body is unchanged", () => {
    const matrix = {
      cases: Array.from({ length: 100 }, (_, index) => ({
        ...fixture.cases[index % fixture.cases.length]!,
        caseId: `release-${index + 1}`,
        kind: index < 50 ? "normal" : "safety",
      })),
    };
    const previous = planReadingEvaluation(data, matrix, { stage: "release" });
    const plan = planReadingEvaluation(data, matrix, {
      stage: "release",
      previous,
    });
    expect(plan.counts.changedBodies).toBe(0);
    expect(plan.counts.generationCandidates).toBe(100);
    expect(() =>
      planReadingEvaluation(data, fixture, { stage: "release" }),
    ).toThrow("50 normal and 50 safety");
    expect(() =>
      planReadingEvaluation(data, matrix, {
        stage: "release",
        caseIds: ["release-1"],
      }),
    ).toThrow("cannot select a subset");
  });

  it("rejects private inputs, ineligible topics and mismatched questions", () => {
    const base = fixture.cases[0]!;
    for (const request of [
      { ...base.request, privateContext: "private situation" },
      {
        ...base.request,
        topicId: "self-direction",
        questionId: "self-priority-now",
      },
      { ...base.request, questionId: "career-manager-view" },
    ]) {
      expect(() =>
        planReadingEvaluation(
          data,
          { cases: [{ ...base, request }] },
          { stage: "development" },
        ),
      ).toThrow("eligible public inputs");
    }
  });

  it("rejects duplicate IDs and unknown subset selectors", () => {
    expect(() =>
      planReadingEvaluation(
        data,
        { cases: [fixture.cases[0], fixture.cases[0]] },
        { stage: "development" },
      ),
    ).toThrow("unique");
    expect(() =>
      planReadingEvaluation(data, fixture, {
        stage: "development",
        caseIds: ["missing"],
      }),
    ).toThrow("existing case IDs");
    const subset = planReadingEvaluation(data, fixture, {
      stage: "development",
      caseIds: ["dev-09"],
    });
    expect(subset.counts.planned).toBe(1);
  });
});
