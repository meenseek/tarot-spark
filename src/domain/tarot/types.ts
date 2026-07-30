import type {
  PromptSlotId,
  ReadingLensId,
  ReadingStyleId,
  SpreadId,
  SpreadPositionId,
  TarotCardId,
  TopicId,
} from "./ids";

export type {
  PromptSlotId,
  ReadingLensId,
  ReadingStyleId,
  SpreadId,
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

export type Spread = {
  readonly id: SpreadId;
  readonly label: string;
  readonly description: string;
  readonly promptLabel: string;
  readonly outputLengthInstruction: string;
  readonly positionIds: readonly SpreadPositionId[];
};

export type ReadingLens = {
  readonly id: ReadingLensId;
  readonly label: string;
  readonly instruction: string;
};

export type ReadingStyle = {
  readonly id: ReadingStyleId;
  readonly label: string;
  readonly description: string;
  readonly instruction: string;
};

export type TarotCard = {
  readonly id: TarotCardId;
  readonly name: string;
  readonly tone: string;
  readonly archetype: string;
  readonly keywords: readonly string[];
  readonly symbols: readonly string[];
  readonly upright: string;
  readonly light: string;
  readonly shadow: string;
  readonly agency: string;
  readonly caution: string;
  readonly reflection: string;
  readonly promptAngle: string;
};

export type PromptTemplate = {
  readonly spreadLine: string;
  readonly userContextBlock: string;
  readonly emptyUserContext: string;
  readonly lines: readonly string[];
  readonly slotInstructions: Readonly<Record<PromptSlotId, readonly string[]>>;
};

export type PromptPack = Readonly<Record<PromptSlotId, string>>;

export type DrawnCard = {
  readonly position: SpreadPosition;
  readonly card: TarotCard;
};

export type LocaleTarotData = {
  readonly topics: readonly Topic[];
  readonly spreads: readonly Spread[];
  readonly spreadPositions: readonly SpreadPosition[];
  readonly readingLenses: readonly ReadingLens[];
  readonly readingStyles: readonly ReadingStyle[];
  readonly promptTemplate: PromptTemplate;
  readonly cards: readonly TarotCard[];
};
