import type { TopicId } from "@/domain/tarot";
import type {
  RelationshipQuestionCategoryId,
  RelationshipQuestionId,
} from "./ids";

export type RelationshipQuestion = {
  readonly id: RelationshipQuestionId;
  readonly categoryId: RelationshipQuestionCategoryId;
  readonly topicId: TopicId;
  readonly title: string;
  readonly summary: string;
  readonly focus: string;
  readonly ctaLabel: string;
};

export type RelationshipQuestionCategory = {
  readonly id: RelationshipQuestionCategoryId;
  readonly title: string;
  readonly intro: string;
  readonly questions: readonly RelationshipQuestion[];
};

export type RelationshipQuestionCatalog = {
  readonly categories: readonly RelationshipQuestionCategory[];
  readonly questions: readonly RelationshipQuestion[];
};
