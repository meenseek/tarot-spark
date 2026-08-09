import type { ReadingStyleId, SpreadId, TarotCardId, TopicId } from "./ids";

export type { ReadingStyleId, SpreadId, TarotCardId, TopicId } from "./ids";

export type Topic = {
  readonly id: TopicId;
  readonly label: string;
  readonly contextPlaceholder: string;
  readonly promptLead: string;
  readonly resultFrame: string;
};

export type Spread = {
  readonly id: SpreadId;
  readonly label: string;
  readonly description: string;
  readonly promptLabel: string;
  readonly outputLengthInstruction: string;
  readonly cardCount: 3 | 6;
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
  readonly meaning: string;
  readonly reflection: string;
};

export type PromptTemplate = {
  readonly cardLine: string;
  readonly questionFocusBlock: string;
  readonly userContextBlock: string;
  readonly lines: readonly string[];
};

export type DrawnCard = {
  readonly card: TarotCard;
};

export type LocaleTarotData = {
  readonly topics: readonly Topic[];
  readonly spreads: readonly Spread[];
  readonly readingStyles: readonly ReadingStyle[];
  readonly promptTemplate: PromptTemplate;
  readonly cards: readonly TarotCard[];
};
