import type {
  RelationshipAnswerTargetId,
  RelationshipQuestionFocusId,
  RelationshipQuestionId,
  TopicId,
} from "@/domain/tarot";

export type RelationshipQuestion = {
  readonly id: RelationshipQuestionId;
  readonly domainId: "relationship";
  readonly focusId: RelationshipQuestionFocusId;
  readonly topicId: TopicId;
  readonly defaultAnswerTargetId: RelationshipAnswerTargetId;
  readonly title: string;
  readonly summary: string;
  readonly focus: string;
  readonly ctaLabel: string;
};

export type RelationshipQuestionCategory = {
  readonly id: RelationshipQuestionFocusId;
  readonly domainId: "relationship";
  readonly title: string;
  readonly intro: string;
  readonly questions: readonly RelationshipQuestion[];
};

export type RelationshipQuestionCatalog = {
  readonly categories: readonly RelationshipQuestionCategory[];
  readonly questions: readonly RelationshipQuestion[];
};
