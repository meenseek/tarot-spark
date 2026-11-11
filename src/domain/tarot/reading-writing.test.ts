import { describe, expect, it } from "vitest";
import { getTarotData } from "@/i18n/tarot-data";
import {
  getReadingWritingInstruction,
  getReadingWritingInstructions,
  getReadingWritingProfileId,
  readingWritingProfileIds,
} from "./reading-writing";
import { publicQuestionDefinitions, type PublicQuestionId } from "./taxonomy";
import { topicIds } from "./ids";

describe("question-specific reading writing", () => {
  it.each([
    ["feelings", "unspoken-expectations", "expectations"],
    ["love", "how-they-see-me", "perception"],
    ["feelings", "mutual-view", "mutual-view"],
    ["relationship-flow", "broken-contact-pattern", "relationship-cause"],
    ["relationship-flow", "repeating-conflict", "relationship-cause"],
    ["relationship-flow", "recurring-misunderstanding", "relationship"],
    ["feelings", "strengths-and-burdens", "strength-contrast"],
    ["feelings", "overreading-signals", "signal-interpretation"],
    ["love", "first-contact", "decision"],
    ["love", "pace-of-closeness", "relationship-pace"],
    ["career-direction", "career-role-fit", "role-fit"],
    ["love", "before-starting", "preparation"],
    ["reunion", "evidence-of-change", "change-evidence"],
    ["reunion", "no-contact-meaning", "contact-pause"],
    ["relationship-flow", "small-test", "action"],
    ["career-direction", "career-manager-expectations", "career-perception"],
    ["career-direction", "career-opportunity-cost", "opportunity-cost"],
    ["career-direction", "career-growth-experience", "career-growth"],
    ["feelings", "reassurance-seeking", "self-reflection"],
    ["money-life", "money-want-or-need", "self"],
  ] as const)("routes %s / %s by intent", (topicId, questionId, expected) => {
    expect(getReadingWritingProfileId(topicId, questionId)).toBe(expected);
  });

  it("reserves change evidence writing for the exact evidence question", () => {
    const selected = publicQuestionDefinitions.filter(
      ({ topicId, id }) =>
        getReadingWritingProfileId(topicId, id) === "change-evidence",
    );
    expect(selected.map(({ id }) => id)).toEqual(["evidence-of-change"]);
    expect(getReadingWritingProfileId("love", "before-starting")).toBe(
      "preparation",
    );
  });

  it.each(["en", "ko"] as const)(
    "selects one relevant example for every question and broad topic in %s",
    (locale) => {
      const template = getTarotData(locale).promptTemplate;
      const selections = [
        ...publicQuestionDefinitions.map(({ topicId, id }) => ({
          topicId,
          questionId: id,
        })),
        ...topicIds.map((topicId) => ({ topicId, questionId: undefined })),
      ];
      for (const { topicId, questionId } of selections) {
        const selected = getReadingWritingProfileId(topicId, questionId);
        const instructions = getReadingWritingInstructions(
          template,
          topicId,
          questionId,
        );
        expect(instructions).toContain(template.narrationInstruction);
        expect(template.narrationInstruction).toContain(
          locale === "ko"
            ? "나·내로 화자를 바꾸지 마세요"
            : "unframed I/my voice",
        );
        expect(instructions).toContain(
          template.writingProfiles[selected].example,
        );
        for (const other of readingWritingProfileIds.filter(
          (profile) => profile !== selected,
        )) {
          expect(instructions).not.toContain(
            template.writingProfiles[other].example,
          );
        }
        for (const common of template.readingInstructions) {
          expect(instructions).toContain(common);
        }
      }
    },
  );

  it.each(["ko", "en"] as const)(
    "isolates broad relationship guidance from selected questions in %s",
    (locale) => {
      const template = getTarotData(locale).promptTemplate;
      const broad = getReadingWritingInstruction(template, "relationship-flow");
      const selected = getReadingWritingInstruction(
        template,
        "relationship-flow",
        "effort-balance",
      );
      expect(broad).toBe(
        template.writingProfiles.relationship.overviewInstruction,
      );
      expect(selected).toBe(
        template.questionWritingInstructions?.["effort-balance"],
      );
      expect(broad).not.toBe(selected);
      expect(
        getReadingWritingInstructions(template, "relationship-flow"),
      ).toContain(broad);
      expect(
        getReadingWritingInstructions(
          template,
          "relationship-flow",
          "effort-balance",
        ),
      ).not.toContain(broad);
    },
  );

  it("rejects a question from another topic instead of borrowing its example", () => {
    expect(() =>
      getReadingWritingProfileId("feelings", "career-manager-view"),
    ).toThrow("does not match the topic");
  });

  it.each(["", "unknown-question", "__proto__"])(
    "rejects an invalid supplied question: %s",
    (questionId) => {
      expect(() =>
        getReadingWritingProfileId("feelings", questionId as PublicQuestionId),
      ).toThrow(RangeError);
    },
  );

  it.each(["ko", "en"] as const)(
    "selects exact question policies and preserves all fallbacks in %s",
    (locale) => {
      const template = getTarotData(locale).promptTemplate;
      expect(
        Object.keys(template.questionWritingInstructions ?? {}).sort(),
      ).toEqual(
        [
          "broken-contact-pattern",
          "continue-slow-stop",
          "effort-balance",
          "career-workplace-image",
          "career-opportunity-cost",
        ].sort(),
      );
      for (const { topicId, id } of publicQuestionDefinitions) {
        const profile =
          template.writingProfiles[getReadingWritingProfileId(topicId, id)];
        const expected =
          template.questionWritingInstructions?.[id] ?? profile.instruction;
        expect(getReadingWritingInstruction(template, topicId, id)).toBe(
          expected,
        );
        expect(
          getReadingWritingInstructions(template, topicId, id).filter(
            (value) => value === expected,
          ),
        ).toHaveLength(1);
      }
      for (const topicId of topicIds) {
        const profile =
          template.writingProfiles[getReadingWritingProfileId(topicId)];
        expect(getReadingWritingInstruction(template, topicId)).toBe(
          profile.overviewInstruction ?? profile.instruction,
        );
      }
      expect(() =>
        getReadingWritingInstruction(
          template,
          "feelings",
          "career-workplace-image",
        ),
      ).toThrow(RangeError);
      for (const id of ["", "unknown-question", "__proto__"])
        expect(() =>
          getReadingWritingInstruction(
            template,
            "feelings",
            id as PublicQuestionId,
          ),
        ).toThrow(RangeError);
      for (const value of ["", "  "])
        expect(() =>
          getReadingWritingInstruction(
            {
              ...template,
              questionWritingInstructions: { "broken-contact-pattern": value },
            },
            "relationship-flow",
            "broken-contact-pattern",
          ),
        ).toThrow(RangeError);
      const inherited = Object.create({
        "broken-contact-pattern": "inherited policy",
      }) as Record<string, string>;
      expect(
        getReadingWritingInstruction(
          { ...template, questionWritingInstructions: inherited },
          "relationship-flow",
          "broken-contact-pattern",
        ),
      ).toBe(template.writingProfiles["relationship-cause"].instruction);
    },
  );
});
