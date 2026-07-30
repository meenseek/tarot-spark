export const topicIds = [
  "love",
  "reunion",
  "feelings",
  "relationship-flow",
  "career-direction",
] as const;

export type TopicId = (typeof topicIds)[number];

export const spreadIds = ["quick", "deep"] as const;

export type SpreadId = (typeof spreadIds)[number];

export const quickSpreadPositionIds = ["spark", "shadow", "next-step"] as const;

export const deepSpreadPositionIds = [
  "current-situation",
  "self-perspective",
  "external-dynamics",
  "hidden-tension",
  "agency",
  "next-step",
] as const;

export const spreadPositionIds = [
  ...quickSpreadPositionIds,
  "current-situation",
  "self-perspective",
  "external-dynamics",
  "hidden-tension",
  "agency",
] as const;

export type SpreadPositionId = (typeof spreadPositionIds)[number];

export const readingStyleIds = [
  "balanced",
  "direct",
  "practical",
  "relational",
] as const;

export type ReadingStyleId = (typeof readingStyleIds)[number];

export const readingLensIds = [
  "core-pattern",
  "tension-and-balance",
  "blind-spot",
  "choice-and-agency",
  "grounded-next-step",
] as const;

export type ReadingLensId = (typeof readingLensIds)[number];

export const promptSlotIds = [
  "main",
  "other-view",
  "action",
  "emotion",
] as const;

export type PromptSlotId = (typeof promptSlotIds)[number];

export const tarotCardIds = [
  "the-fool",
  "the-magician",
  "the-high-priestess",
  "the-empress",
  "the-emperor",
  "the-lovers",
  "the-chariot",
  "strength",
  "the-hermit",
  "wheel-of-fortune",
  "temperance",
  "the-star",
] as const;

export type TarotCardId = (typeof tarotCardIds)[number];
