import { tarotCardIds, type TarotCardId } from "@/domain/tarot/ids";

export type GlyphDefinition = {
  readonly paths: readonly string[];
};

export const tarotCardGlyphDefinitions = {
  "the-fool": {
    paths: [
      "M18 49c7-16 18-26 34-27M37 18v-8M32.5 13.5l9 9M32.5 22.5l9-9M50 49h7",
    ],
  },
  "the-magician": {
    paths: [
      "M20 24c5-8 11-8 16 0s11 8 16 0-11-8-16 0-11 8-16 0ZM36 34v20M29 54h14",
    ],
  },
  "the-high-priestess": {
    paths: ["M20 15v40M52 15v40M17 55h38M31 19c0 8 5 13 13 13-2 5-6 8-12 8"],
  },
  "the-empress": {
    paths: [
      "M36 16a13 13 0 1 0 0 26 13 13 0 0 0 0-26ZM36 42v15M29 50h14M51 14l4-4M51 10l4 4",
    ],
  },
  "the-emperor": {
    paths: ["M21 28l6-12 9 9 9-9 6 12-4 25H25l-4-25ZM25 36h22M29 53v5M43 53v5"],
  },
  "the-lovers": {
    paths: [
      "M17 50c3-15 10-23 19-23s16 8 19 23M25 24a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM47 24a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM36 14v8",
    ],
  },
  "the-chariot": {
    paths: [
      "M20 23h32l-4 24H24l-4-24ZM26 18l10-7 10 7M28 53a4 4 0 1 0 0-8M44 53a4 4 0 1 0 0-8",
    ],
  },
  strength: {
    paths: [
      "M21 20c5-8 10-8 15 0 5 8 10 8 15 0M21 20c5 8 10 8 15 0 5-8 10-8 15 0M36 34c-10 0-17 6-17 15M36 34c10 0 17 6 17 15M26 51h20",
    ],
  },
  "the-hermit": {
    paths: [
      "M30 21h12l5 9-4 16H29l-4-16 5-9ZM29 30h14M36 21v-9M32 12h8M36 46v12",
    ],
  },
  "wheel-of-fortune": {
    paths: [
      "M36 15a21 21 0 1 0 0 42 21 21 0 0 0 0-42ZM36 15v42M15 36h42M22 22l28 28M50 22 22 50",
    ],
  },
  temperance: {
    paths: [
      "M18 20h16l-3 14H21l-3-14ZM38 38h16l-3 14H41l-3-14ZM29 34c4 1 7 4 10 7M33 28c7-2 11 2 14 8",
    ],
  },
  "the-star": {
    paths: [
      "M36 18l3.5 12.5L50 23l-7.5 10.5L55 36l-12.5 2.5L50 49l-10.5-7.5L36 54l-3.5-12.5L22 49l7.5-10.5L17 36l12.5-2.5L22 23l10.5 7.5L36 18Z",
    ],
  },
} satisfies Record<TarotCardId, GlyphDefinition>;

type TarotCardGlyphProps = {
  readonly cardId: TarotCardId;
  readonly className?: string;
};

export function TarotCardGlyph({
  cardId,
  className = "",
}: TarotCardGlyphProps) {
  const definition = tarotCardGlyphDefinitions[cardId];

  return (
    <svg
      aria-hidden="true"
      className={className}
      data-glyph-id={cardId}
      fill="none"
      viewBox="0 0 72 72"
    >
      {definition.paths.map((path) => (
        <path
          d={path}
          key={path}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

export function getTarotCardGlyphSignature(cardId: TarotCardId) {
  return tarotCardGlyphDefinitions[cardId].paths.join("|");
}

export function getTarotCardGlyphIds() {
  return tarotCardIds;
}
