import type { TopicId } from "./ids";
import { getPublicQuestionDefinition, type PublicQuestionId } from "./taxonomy";

export const readingWritingProfileIds = [
  "feelings",
  "expectations",
  "perception",
  "mutual-view",
  "relationship",
  "relationship-cause",
  "strength-contrast",
  "decision",
  "relationship-pace",
  "opportunity-cost",
  "contact-pause",
  "role-fit",
  "signal-interpretation",
  "preparation",
  "change-evidence",
  "action",
  "career-perception",
  "career-choice",
  "career-growth",
  "self-reflection",
  "self",
] as const;

export type ReadingWritingProfileId = (typeof readingWritingProfileIds)[number];

export type ReadingWritingMessages = {
  readonly narrationInstruction: string;
  readonly readingInstructions: readonly string[];
  readonly questionWritingInstructions?: Readonly<
    Partial<Record<PublicQuestionId, string>>
  >;
  readonly writingProfiles: Readonly<
    Record<
      ReadingWritingProfileId,
      {
        readonly instruction: string;
        readonly overviewInstruction?: string;
        readonly example: string;
        readonly deepExample?: string;
      }
    >
  >;
};

const profileByTopic = {
  love: "relationship",
  reunion: "relationship",
  feelings: "feelings",
  "relationship-flow": "relationship",
  "career-direction": "career-choice",
  "self-direction": "self",
  "money-life": "self",
  "study-projects": "self",
} as const satisfies Record<TopicId, ReadingWritingProfileId>;

const profileByQuestion = {
  "interest-or-kindness": "feelings",
  "pace-of-closeness": "relationship-pace",
  "before-starting": "preparation",
  "first-contact": "decision",
  "mutual-view": "mutual-view",
  "how-they-see-me": "perception",
  "romantic-partner-impression": "perception",
  "unspoken-expectations": "expectations",
  "overreading-signals": "signal-interpretation",
  "strengths-and-burdens": "strength-contrast",
  "broken-contact-pattern": "relationship-cause",
  "conversation-to-start": "action",
  "recurring-misunderstanding": "relationship",
  "initiative-balance": "relationship",
  "space-or-conversation": "decision",
  "repeating-conflict": "relationship-cause",
  "swallowed-boundary": "relationship",
  "repair-evidence": "preparation",
  "person-or-familiarity": "decision",
  "evidence-of-change": "change-evidence",
  "repeated-pattern": "relationship",
  "no-contact-meaning": "contact-pause",
  "continue-slow-stop": "decision",
  "effort-balance": "relationship",
  "waiting-boundary": "preparation",
  "small-test": "action",
  "drawn-to-ambiguity": "self-reflection",
  "ignored-signals": "preparation",
  "reassurance-seeking": "self-reflection",
  "desired-relationship": "self-reflection",
  "career-manager-view": "career-perception",
  "career-workplace-image": "career-perception",
  "career-visible-contribution": "career-perception",
  "career-manager-expectations": "career-perception",
  "career-stay-or-prepare": "career-choice",
  "career-opportunity-cost": "opportunity-cost",
  "career-interview-strengths": "career-growth",
  "career-application-direction": "career-choice",
  "career-underused-strength": "career-growth",
  "career-growth-experience": "career-growth",
  "career-role-fit": "role-fit",
  "career-collaboration-role": "career-growth",
  "career-sustainable-boundary": "career-choice",
  "career-manager-mismatch": "career-choice",
  "self-priority-now": "self",
  "self-expectation-source": "self",
  "self-review-condition": "self",
  "self-repeating-delay": "self",
  "self-energy-focus": "self",
  "self-supportive-pattern": "self",
  "money-spending-priority": "self",
  "money-want-or-need": "self",
  "money-sustainable-habit": "self",
  "money-big-purchase-check": "self",
  "money-shared-cost": "self",
  "money-helping-boundary": "self",
  "study-next-focus": "self",
  "study-method-fit": "self",
  "study-feedback-gap": "self",
  "project-next-step": "self",
  "project-scope-boundary": "self",
  "project-pause-signal": "self",
} as const satisfies Record<PublicQuestionId, ReadingWritingProfileId>;

export function getReadingWritingProfileId(
  topicId: TopicId,
  questionId?: PublicQuestionId,
): ReadingWritingProfileId {
  if (questionId !== undefined) {
    const question = getPublicQuestionDefinition(questionId);
    if (question.topicId !== topicId) {
      throw new RangeError(
        "Writing profile question does not match the topic.",
      );
    }
    return profileByQuestion[questionId];
  }
  if (!Object.hasOwn(profileByTopic, topicId)) {
    throw new RangeError("Unknown writing profile topic.");
  }
  return profileByTopic[topicId];
}

export function getReadingWritingInstruction(
  template: ReadingWritingMessages,
  topicId: TopicId,
  questionId?: PublicQuestionId,
): string {
  const profileId = getReadingWritingProfileId(topicId, questionId);
  const profile = template.writingProfiles[profileId];
  const overrides = template.questionWritingInstructions;
  if (
    questionId !== undefined &&
    overrides &&
    Object.hasOwn(overrides, questionId)
  ) {
    const instruction = overrides[questionId];
    if (typeof instruction !== "string" || !instruction.trim()) {
      throw new RangeError("Writing question policy must be nonempty.");
    }
    return instruction;
  }
  return questionId === undefined
    ? (profile.overviewInstruction ?? profile.instruction)
    : profile.instruction;
}

export function getReadingWritingInstructions(
  template: ReadingWritingMessages,
  topicId: TopicId,
  questionId?: PublicQuestionId,
): readonly string[] {
  const profile =
    template.writingProfiles[getReadingWritingProfileId(topicId, questionId)];
  return [
    getReadingWritingInstruction(template, topicId, questionId),
    template.narrationInstruction,
    profile.example,
    ...template.readingInstructions,
  ];
}
