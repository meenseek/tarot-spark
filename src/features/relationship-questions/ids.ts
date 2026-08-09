import type { TopicId } from "@/domain/tarot";

export const relationshipQuestionCategoryIds = [
  "starting",
  "perception",
  "communication",
  "distance-conflict",
  "reunion",
  "choice-boundaries",
  "self-patterns",
] as const;

export type RelationshipQuestionCategoryId =
  (typeof relationshipQuestionCategoryIds)[number];

export const relationshipQuestionDefinitions = [
  { id: "interest-or-kindness", categoryId: "starting", topicId: "feelings" },
  { id: "pace-of-closeness", categoryId: "starting", topicId: "love" },
  { id: "before-starting", categoryId: "starting", topicId: "love" },
  { id: "first-contact", categoryId: "starting", topicId: "love" },
  { id: "mutual-view", categoryId: "perception", topicId: "feelings" },
  {
    id: "unspoken-expectations",
    categoryId: "perception",
    topicId: "feelings",
  },
  {
    id: "overreading-signals",
    categoryId: "perception",
    topicId: "feelings",
  },
  {
    id: "strengths-and-burdens",
    categoryId: "perception",
    topicId: "feelings",
  },
  {
    id: "broken-contact-pattern",
    categoryId: "communication",
    topicId: "relationship-flow",
  },
  {
    id: "conversation-to-start",
    categoryId: "communication",
    topicId: "relationship-flow",
  },
  {
    id: "recurring-misunderstanding",
    categoryId: "communication",
    topicId: "relationship-flow",
  },
  {
    id: "initiative-balance",
    categoryId: "communication",
    topicId: "relationship-flow",
  },
  {
    id: "space-or-conversation",
    categoryId: "distance-conflict",
    topicId: "relationship-flow",
  },
  {
    id: "repeating-conflict",
    categoryId: "distance-conflict",
    topicId: "relationship-flow",
  },
  {
    id: "swallowed-boundary",
    categoryId: "distance-conflict",
    topicId: "relationship-flow",
  },
  {
    id: "repair-evidence",
    categoryId: "distance-conflict",
    topicId: "relationship-flow",
  },
  { id: "person-or-familiarity", categoryId: "reunion", topicId: "reunion" },
  { id: "evidence-of-change", categoryId: "reunion", topicId: "reunion" },
  { id: "repeated-pattern", categoryId: "reunion", topicId: "reunion" },
  { id: "no-contact-meaning", categoryId: "reunion", topicId: "reunion" },
  {
    id: "continue-slow-stop",
    categoryId: "choice-boundaries",
    topicId: "relationship-flow",
  },
  {
    id: "effort-balance",
    categoryId: "choice-boundaries",
    topicId: "relationship-flow",
  },
  {
    id: "waiting-boundary",
    categoryId: "choice-boundaries",
    topicId: "love",
  },
  {
    id: "small-test",
    categoryId: "choice-boundaries",
    topicId: "relationship-flow",
  },
  { id: "drawn-to-ambiguity", categoryId: "self-patterns", topicId: "love" },
  { id: "ignored-signals", categoryId: "self-patterns", topicId: "feelings" },
  {
    id: "reassurance-seeking",
    categoryId: "self-patterns",
    topicId: "feelings",
  },
  {
    id: "desired-relationship",
    categoryId: "self-patterns",
    topicId: "love",
  },
] as const satisfies readonly {
  readonly id: string;
  readonly categoryId: RelationshipQuestionCategoryId;
  readonly topicId: TopicId;
}[];

export type RelationshipQuestionId =
  (typeof relationshipQuestionDefinitions)[number]["id"];

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
