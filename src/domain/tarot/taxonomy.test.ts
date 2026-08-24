import { describe, expect, it } from "vitest";
import { topicIds } from "./ids";
import {
  careerQuestionDefinitions,
  careerFocusIds,
  getReadingTaxonomy,
  publicQuestionDefinitions,
  relationshipFocusIds,
  relationshipQuestionDefinitions,
  relationshipQuestionFocusIds,
  topicTaxonomyById,
} from "./taxonomy";

describe("tarot reading taxonomy", () => {
  it("maps every stable topic entry point to one taxonomy", () => {
    expect(Object.keys(topicTaxonomyById)).toEqual(topicIds);
    expect(getReadingTaxonomy("love")).toEqual({
      domainId: "relationship",
      focusId: "general",
      defaultAnswerTargetId: "relationship",
    });
    expect(getReadingTaxonomy("relationship-flow")).toEqual({
      domainId: "relationship",
      focusId: "dynamics",
      defaultAnswerTargetId: "relationship",
    });
    expect(getReadingTaxonomy("career-direction")).toEqual({
      domainId: "career",
      focusId: "direction",
      defaultAnswerTargetId: "career",
    });
  });

  it("keeps broad entry focuses out of question navigation", () => {
    expect(relationshipFocusIds).toEqual([
      "general",
      "starting",
      "perception",
      "communication",
      "dynamics",
      "distance-conflict",
      "reunion",
      "choice-boundaries",
      "self-patterns",
    ]);
    expect(relationshipQuestionFocusIds).not.toContain("general");
    expect(relationshipQuestionFocusIds).not.toContain("dynamics");
    expect(careerFocusIds).toEqual([
      "direction",
      "perception-recognition",
      "decision-tradeoffs",
      "job-search-positioning",
      "strengths-growth",
      "collaboration-boundaries",
    ]);
  });

  it("gives every career question one compatible career taxonomy", () => {
    expect(careerQuestionDefinitions).toHaveLength(14);
    expect(publicQuestionDefinitions).toHaveLength(44);
    expect(new Set(publicQuestionDefinitions.map(({ id }) => id)).size).toBe(
      publicQuestionDefinitions.length,
    );

    for (const question of careerQuestionDefinitions) {
      expect(getReadingTaxonomy(question.topicId, question.id)).toStrictEqual({
        domainId: "career",
        focusId: question.focusId,
        defaultAnswerTargetId: question.defaultAnswerTargetId,
      });
    }

    expect(() => getReadingTaxonomy("love", "career-stay-or-prepare")).toThrow(
      "incompatible",
    );
  });

  it("gives every relationship question one compatible primary taxonomy", () => {
    expect(relationshipQuestionDefinitions).toHaveLength(30);
    expect(
      new Set(relationshipQuestionDefinitions.map(({ id }) => id)).size,
    ).toBe(relationshipQuestionDefinitions.length);

    for (const question of relationshipQuestionDefinitions) {
      expect(relationshipQuestionFocusIds).toContain(question.focusId);
      expect(getReadingTaxonomy(question.topicId, question.id)).toStrictEqual({
        domainId: "relationship",
        focusId: question.focusId,
        defaultAnswerTargetId: question.defaultAnswerTargetId,
      });
    }
  });

  it("lets a question refine its entry preset without classifying free text", () => {
    expect(getReadingTaxonomy("feelings")).toEqual({
      domainId: "relationship",
      focusId: "perception",
      defaultAnswerTargetId: "external-perception",
    });
    expect(getReadingTaxonomy("feelings", "ignored-signals")).toEqual({
      domainId: "relationship",
      focusId: "self-patterns",
      defaultAnswerTargetId: "self",
    });
    expect(getReadingTaxonomy("love", "how-they-see-me")).toEqual({
      domainId: "relationship",
      focusId: "perception",
      defaultAnswerTargetId: "external-perception",
    });
    expect(getReadingTaxonomy("love", "romantic-partner-impression")).toEqual({
      domainId: "relationship",
      focusId: "perception",
      defaultAnswerTargetId: "external-perception",
    });
    expect(() =>
      getReadingTaxonomy("feelings", "romantic-partner-impression"),
    ).toThrow("incompatible");
    expect(() => getReadingTaxonomy("love", "mutual-view")).toThrow(
      "incompatible",
    );
  });

  it("locks each public relationship question to its intended answer target", () => {
    const idsByTarget = Object.groupBy(
      relationshipQuestionDefinitions,
      ({ defaultAnswerTargetId }) => defaultAnswerTargetId,
    );

    expect(idsByTarget["external-perception"]?.map(({ id }) => id)).toEqual([
      "interest-or-kindness",
      "mutual-view",
      "how-they-see-me",
      "romantic-partner-impression",
    ]);
    expect(idsByTarget.relationship?.map(({ id }) => id)).toEqual([
      "pace-of-closeness",
      "before-starting",
      "unspoken-expectations",
      "strengths-and-burdens",
      "broken-contact-pattern",
      "conversation-to-start",
      "recurring-misunderstanding",
      "initiative-balance",
      "space-or-conversation",
      "repeating-conflict",
      "repair-evidence",
      "evidence-of-change",
      "repeated-pattern",
      "effort-balance",
    ]);
    expect(idsByTarget.self?.map(({ id }) => id)).toEqual([
      "first-contact",
      "overreading-signals",
      "swallowed-boundary",
      "person-or-familiarity",
      "no-contact-meaning",
      "continue-slow-stop",
      "waiting-boundary",
      "small-test",
      "drawn-to-ambiguity",
      "ignored-signals",
      "reassurance-seeking",
      "desired-relationship",
    ]);
    expect(Object.hasOwn(idsByTarget, "career")).toBe(false);
  });

  it("routes workplace perception without changing the broad career entry", () => {
    const idsByTarget = Object.groupBy(
      careerQuestionDefinitions,
      ({ defaultAnswerTargetId }) => defaultAnswerTargetId,
    );

    expect(idsByTarget["external-perception"]?.map(({ id }) => id)).toEqual([
      "career-manager-view",
      "career-workplace-image",
      "career-visible-contribution",
      "career-manager-expectations",
    ]);
    expect(idsByTarget.career).toHaveLength(10);
    expect(getReadingTaxonomy("career-direction")).toEqual({
      domainId: "career",
      focusId: "direction",
      defaultAnswerTargetId: "career",
    });
  });
});
