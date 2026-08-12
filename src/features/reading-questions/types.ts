import type {
  AnswerTargetId,
  PublicQuestionFocusId,
  PublicQuestionId,
  ReadingDomainId,
  TopicId,
} from "@/domain/tarot";

export type PublicQuestion = {
  readonly id: PublicQuestionId;
  readonly domainId: ReadingDomainId;
  readonly focusId: PublicQuestionFocusId;
  readonly topicId: TopicId;
  readonly defaultAnswerTargetId: AnswerTargetId;
  readonly title: string;
  readonly summary: string;
  readonly focus: string;
  readonly ctaLabel: string;
};

export type PublicQuestionGroup = {
  readonly id: PublicQuestionFocusId;
  readonly domainId: ReadingDomainId;
  readonly title: string;
  readonly intro: string;
  readonly questions: readonly PublicQuestion[];
};

export type PublicQuestionCatalog = {
  readonly groups: readonly PublicQuestionGroup[];
  readonly questions: readonly PublicQuestion[];
};
