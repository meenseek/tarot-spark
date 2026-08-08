import { tarotCardIds, type TarotCardId } from "@/domain/tarot";

export const legacyCardArtSources: Partial<Record<TarotCardId, string>> = {
  "the-fool": "/cards/the-fool.jpg",
  "the-magician": "/cards/the-magician.jpg",
  "the-high-priestess": "/cards/the-high-priestess.jpg",
  "the-empress": "/cards/the-empress.jpg",
  "the-emperor": "/cards/the-emperor.jpg",
  "the-lovers": "/cards/the-lovers.jpg",
  "the-chariot": "/cards/the-chariot.jpg",
  strength: "/cards/strength.jpg",
  "the-hermit": "/cards/the-hermit.jpg",
  "wheel-of-fortune": "/cards/wheel-of-fortune.jpg",
  temperance: "/cards/temperance.jpg",
  "the-star": "/cards/the-star.jpg",
};

export const cardArtSources = Object.freeze(
  Object.fromEntries(
    tarotCardIds.map((cardId) => [cardId, `/cards/v3/${cardId}.jpg`]),
  ) as Record<TarotCardId, string>,
);
