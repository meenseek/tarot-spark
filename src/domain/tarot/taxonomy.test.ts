import { describe, expect, it } from "vitest";
import { topicIds } from "./ids";
import {
  getReadingTaxonomy,
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
  });

  it("gives every relationship question one compatible primary taxonomy", () => {
    expect(relationshipQuestionDefinitions).toHaveLength(28);
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
      defaultAnswerTargetId: "other-person",
    });
    expect(getReadingTaxonomy("feelings", "ignored-signals")).toEqual({
      domainId: "relationship",
      focusId: "self-patterns",
      defaultAnswerTargetId: "self",
    });
    expect(() => getReadingTaxonomy("love", "mutual-view")).toThrow(
      "incompatible",
    );
  });

  it("locks each public relationship question to its intended answer target", () => {
    const idsByTarget = Object.groupBy(
      relationshipQuestionDefinitions,
      ({ defaultAnswerTargetId }) => defaultAnswerTargetId,
    );

    expect(idsByTarget["other-person"]?.map(({ id }) => id)).toEqual([
      "interest-or-kindness",
      "mutual-view",
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
});
