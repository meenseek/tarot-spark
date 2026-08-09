import { tarotCardIds, type TarotCardId } from "@/domain/tarot";

export const cardArtSources = Object.freeze(
  Object.fromEntries(
    tarotCardIds.map((cardId) => [cardId, `/cards/v3/${cardId}.jpg`]),
  ) as Record<TarotCardId, string>,
);
