import type { SpreadId } from "./ids";
import type { DrawnCard, Spread, TarotCard } from "./types";

export function getDefaultSpread(spreads: readonly Spread[]) {
  return getSpread(spreads, "quick");
}

export function getSpread(spreads: readonly Spread[], spreadId: SpreadId) {
  const spread = spreads.find((candidate) => candidate.id === spreadId);

  if (!spread) {
    throw new RangeError(`Unknown tarot spread: ${spreadId}`);
  }

  return spread;
}

export function drawCards(
  cards: readonly TarotCard[],
  cardCount: number,
  random: () => number = Math.random,
): DrawnCard[] {
  if (!Number.isSafeInteger(cardCount) || cardCount < 1) {
    throw new RangeError("Tarot card count must be a positive integer.");
  }

  if (cardCount > cards.length) {
    throw new RangeError("Tarot card count exceeds the available deck.");
  }

  const pool = [...cards];

  return Array.from({ length: cardCount }, () => {
    const index = Math.min(Math.floor(random() * pool.length), pool.length - 1);
    const [card] = pool.splice(index, 1);

    if (!card) {
      throw new Error("Unable to draw a tarot card.");
    }

    return { card };
  });
}
