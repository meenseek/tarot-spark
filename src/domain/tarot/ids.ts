export const topicIds = [
  "love",
  "reunion",
  "feelings",
  "relationship-flow",
  "career-direction",
  "self-direction",
  "money-life",
  "study-projects",
] as const;

export type TopicId = (typeof topicIds)[number];

export const spreadIds = ["quick", "deep"] as const;

export type SpreadId = (typeof spreadIds)[number];

export const readingStyleIds = [
  "balanced",
  "direct",
  "practical",
  "relational",
] as const;

export type ReadingStyleId = (typeof readingStyleIds)[number];

export const tarotCardIds = canonicalTarotCardIds;

export type { TarotCardId } from "./card-catalog";
import { canonicalTarotCardIds } from "./card-catalog";
