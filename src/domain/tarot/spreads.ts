import {
  deepSpreadPositionIds,
  quickSpreadPositionIds,
  type SpreadId,
} from "./ids";
import type { DrawnCard, Spread, SpreadPosition, TarotCard } from "./types";

export const spreadPositionIdsBySpread = {
  quick: quickSpreadPositionIds,
  deep: deepSpreadPositionIds,
} satisfies Record<SpreadId, readonly SpreadPosition["id"][]>;

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

export function getSpreadPositions(
  spread: Spread,
  positions: readonly SpreadPosition[],
) {
  return spread.positionIds.map((positionId) => {
    const position = positions.find((candidate) => candidate.id === positionId);

    if (!position) {
      throw new RangeError(`Missing spread position: ${positionId}`);
    }

    return position;
  });
}

export function drawCards(
  cards: readonly TarotCard[],
  spreadPositions: readonly SpreadPosition[],
  random: () => number = Math.random,
): DrawnCard[] {
  const pool = [...cards];

  return spreadPositions.map((position) => {
    const index = Math.min(Math.floor(random() * pool.length), pool.length - 1);
    const [card] = pool.splice(index, 1);

    if (!card) {
      throw new Error("Unable to draw a tarot card.");
    }

    return { position, card };
  });
}
