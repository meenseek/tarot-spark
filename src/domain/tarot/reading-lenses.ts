import { stableHash } from "./stable-hash";
import type { DrawnCard, ReadingLens, TopicId } from "./types";

export const readingLensAlgorithmVersion = "reading-lens-v1";

export function getReadingLens(
  lenses: readonly ReadingLens[],
  topicId: TopicId,
  cards: readonly DrawnCard[],
) {
  const seed = [
    readingLensAlgorithmVersion,
    topicId,
    cards.map(({ card }) => card.id).join(","),
  ].join("|");
  const lens = lenses[stableHash(seed) % lenses.length];

  if (!lens) {
    throw new RangeError("Reading lens set must not be empty.");
  }

  return lens;
}
