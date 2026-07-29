import type {
  ReadingLensId,
  SpreadPositionId,
  TarotCardId,
  TopicId,
} from "./ids";

export type {
  ReadingLensId,
  SpreadPositionId,
  TarotCardId,
  TopicId,
} from "./ids";

export type Topic = {
  readonly id: TopicId;
  readonly label: string;
  readonly promptLead: string;
  readonly resultFrame: string;
};

export type SpreadPosition = {
  readonly id: SpreadPositionId;
  readonly label: string;
};

export type ReadingLens = {
  readonly id: ReadingLensId;
  readonly label: string;
  readonly instruction: string;
};

export type TarotCard = {
  readonly id: TarotCardId;
  readonly name: string;
  readonly tone: string;
  readonly upright: string;
  readonly reflection: string;
  readonly promptAngle: string;
};

export type PromptTemplate = {
  readonly spreadLine: string;
  readonly lines: readonly string[];
};

export type DrawnCard = {
  readonly position: SpreadPosition;
  readonly card: TarotCard;
};

export type LocaleTarotData = {
  readonly topics: readonly Topic[];
  readonly spreadPositions: readonly SpreadPosition[];
  readonly readingLenses: readonly ReadingLens[];
  readonly promptTemplate: PromptTemplate;
  readonly cards: readonly TarotCard[];
};
