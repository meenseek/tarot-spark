import { tarotCardIds, type TarotCardId } from "@/domain/tarot";

export const cardArtSources = Object.freeze(
  Object.fromEntries(
    tarotCardIds.map((cardId) => [cardId, `/cards/${cardId}.jpg`]),
  ) as Record<TarotCardId, string>,
);
