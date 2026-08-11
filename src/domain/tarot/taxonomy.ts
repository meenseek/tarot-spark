import type { TopicId } from "./ids";

export const readingDomainIds = ["relationship", "career"] as const;
export type ReadingDomainId = (typeof readingDomainIds)[number];

export const relationshipFocusIds = [
  "general",
  "starting",
  "perception",
  "communication",
  "dynamics",
  "distance-conflict",
  "reunion",
  "choice-boundaries",
  "self-patterns",
] as const;
export type RelationshipFocusId = (typeof relationshipFocusIds)[number];
export type RelationshipQuestionFocusId = Exclude<
  RelationshipFocusId,
  "general" | "dynamics"
>;

export const relationshipQuestionFocusIds = relationshipFocusIds.filter(
  (focusId): focusId is RelationshipQuestionFocusId =>
    focusId !== "general" && focusId !== "dynamics",
);

export const careerFocusIds = ["direction"] as const;
export type CareerFocusId = (typeof careerFocusIds)[number];

export const answerTargetIds = [
  "other-person",
  "relationship",
  "self",
  "career",
] as const;
export type AnswerTargetId = (typeof answerTargetIds)[number];
export type RelationshipAnswerTargetId = Exclude<AnswerTargetId, "career">;

export type ReadingTaxonomy =
  | {
      readonly domainId: "relationship";
      readonly focusId: RelationshipFocusId;
      readonly defaultAnswerTargetId: RelationshipAnswerTargetId;
    }
  | {
      readonly domainId: "career";
      readonly focusId: CareerFocusId;
      readonly defaultAnswerTargetId: "career";
    };

export const topicTaxonomyById = {
  love: {
    domainId: "relationship",
    focusId: "general",
    defaultAnswerTargetId: "relationship",
  },
  reunion: {
    domainId: "relationship",
    focusId: "reunion",
    defaultAnswerTargetId: "relationship",
  },
  feelings: {
    domainId: "relationship",
    focusId: "perception",
    defaultAnswerTargetId: "other-person",
  },
  "relationship-flow": {
    domainId: "relationship",
    focusId: "dynamics",
    defaultAnswerTargetId: "relationship",
  },
  "career-direction": {
    domainId: "career",
    focusId: "direction",
    defaultAnswerTargetId: "career",
  },
} as const satisfies Record<TopicId, ReadingTaxonomy>;

export const relationshipQuestionDefinitions = [
  {
    id: "interest-or-kindness",
    focusId: "starting",
    topicId: "feelings",
    defaultAnswerTargetId: "other-person",
  },
  {
    id: "pace-of-closeness",
    focusId: "starting",
    topicId: "love",
    defaultAnswerTargetId: "relationship",
  },
  {
    id: "before-starting",
    focusId: "starting",
    topicId: "love",
    defaultAnswerTargetId: "relationship",
  },
  {
    id: "first-contact",
    focusId: "starting",
    topicId: "love",
    defaultAnswerTargetId: "self",
  },
  {
    id: "mutual-view",
    focusId: "perception",
    topicId: "feelings",
    defaultAnswerTargetId: "other-person",
  },
  {
    id: "unspoken-expectations",
    focusId: "perception",
    topicId: "feelings",
    defaultAnswerTargetId: "relationship",
  },
  {
    id: "overreading-signals",
    focusId: "perception",
    topicId: "feelings",
    defaultAnswerTargetId: "self",
  },
  {
    id: "strengths-and-burdens",
    focusId: "perception",
    topicId: "feelings",
    defaultAnswerTargetId: "relationship",
  },
  {
    id: "broken-contact-pattern",
    focusId: "communication",
    topicId: "relationship-flow",
    defaultAnswerTargetId: "relationship",
  },
  {
    id: "conversation-to-start",
    focusId: "communication",
    topicId: "relationship-flow",
    defaultAnswerTargetId: "relationship",
  },
  {
    id: "recurring-misunderstanding",
    focusId: "communication",
    topicId: "relationship-flow",
    defaultAnswerTargetId: "relationship",
  },
  {
    id: "initiative-balance",
    focusId: "communication",
    topicId: "relationship-flow",
    defaultAnswerTargetId: "relationship",
  },
  {
    id: "space-or-conversation",
    focusId: "distance-conflict",
    topicId: "relationship-flow",
    defaultAnswerTargetId: "relationship",
  },
  {
    id: "repeating-conflict",
    focusId: "distance-conflict",
    topicId: "relationship-flow",
    defaultAnswerTargetId: "relationship",
  },
  {
    id: "swallowed-boundary",
    focusId: "distance-conflict",
    topicId: "relationship-flow",
    defaultAnswerTargetId: "self",
  },
  {
    id: "repair-evidence",
    focusId: "distance-conflict",
    topicId: "relationship-flow",
    defaultAnswerTargetId: "relationship",
  },
  {
    id: "person-or-familiarity",
    focusId: "reunion",
    topicId: "reunion",
    defaultAnswerTargetId: "self",
  },
  {
    id: "evidence-of-change",
    focusId: "reunion",
    topicId: "reunion",
    defaultAnswerTargetId: "relationship",
  },
  {
    id: "repeated-pattern",
    focusId: "reunion",
    topicId: "reunion",
    defaultAnswerTargetId: "relationship",
  },
  {
    id: "no-contact-meaning",
    focusId: "reunion",
    topicId: "reunion",
    defaultAnswerTargetId: "self",
  },
  {
    id: "continue-slow-stop",
    focusId: "choice-boundaries",
    topicId: "relationship-flow",
    defaultAnswerTargetId: "self",
  },
  {
    id: "effort-balance",
    focusId: "choice-boundaries",
    topicId: "relationship-flow",
    defaultAnswerTargetId: "relationship",
  },
  {
    id: "waiting-boundary",
    focusId: "choice-boundaries",
    topicId: "love",
    defaultAnswerTargetId: "self",
  },
  {
    id: "small-test",
    focusId: "choice-boundaries",
    topicId: "relationship-flow",
    defaultAnswerTargetId: "self",
  },
  {
    id: "drawn-to-ambiguity",
    focusId: "self-patterns",
    topicId: "love",
    defaultAnswerTargetId: "self",
  },
  {
    id: "ignored-signals",
    focusId: "self-patterns",
    topicId: "feelings",
    defaultAnswerTargetId: "self",
  },
  {
    id: "reassurance-seeking",
    focusId: "self-patterns",
    topicId: "feelings",
    defaultAnswerTargetId: "self",
  },
  {
    id: "desired-relationship",
    focusId: "self-patterns",
    topicId: "love",
    defaultAnswerTargetId: "self",
  },
] as const satisfies readonly {
  readonly id: string;
  readonly focusId: RelationshipQuestionFocusId;
  readonly topicId: TopicId;
  readonly defaultAnswerTargetId: RelationshipAnswerTargetId;
}[];

export type RelationshipQuestionId =
  (typeof relationshipQuestionDefinitions)[number]["id"];

export function getTopicTaxonomy(topicId: TopicId): ReadingTaxonomy {
  return topicTaxonomyById[topicId];
}

export function isRelationshipQuestionId(
  value: string,
): value is RelationshipQuestionId {
  return relationshipQuestionDefinitions.some(({ id }) => id === value);
}

export function getRelationshipQuestionDefinition(
  questionId: RelationshipQuestionId,
) {
  const definition = relationshipQuestionDefinitions.find(
    ({ id }) => id === questionId,
  );

  if (!definition) {
    throw new RangeError(`Unknown relationship question: ${questionId}`);
  }

  return definition;
}

export function getReadingTaxonomy(
  topicId: TopicId,
  questionId?: RelationshipQuestionId,
): ReadingTaxonomy {
  if (!questionId) return getTopicTaxonomy(topicId);

  const question = getRelationshipQuestionDefinition(questionId);
  if (question.topicId !== topicId) {
    throw new RangeError(
      `Relationship question ${questionId} is incompatible with topic ${topicId}.`,
    );
  }

  return {
    domainId: "relationship",
    focusId: question.focusId,
    defaultAnswerTargetId: question.defaultAnswerTargetId,
  };
}
