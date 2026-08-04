export const majorArcanaIds = [
  "the-fool",
  "the-magician",
  "the-high-priestess",
  "the-empress",
  "the-emperor",
  "the-hierophant",
  "the-lovers",
  "the-chariot",
  "strength",
  "the-hermit",
  "wheel-of-fortune",
  "justice",
  "the-hanged-man",
  "death",
  "temperance",
  "the-devil",
  "the-tower",
  "the-star",
  "the-moon",
  "the-sun",
  "judgement",
  "the-world",
] as const;

export const minorArcanaSuitIds = [
  "wands",
  "cups",
  "swords",
  "pentacles",
] as const;

export const minorArcanaRankIds = [
  "ace",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "page",
  "knight",
  "queen",
  "king",
] as const;

export type MajorArcanaId = (typeof majorArcanaIds)[number];
export type MinorArcanaSuitId = (typeof minorArcanaSuitIds)[number];
export type MinorArcanaRankId = (typeof minorArcanaRankIds)[number];
export type MinorArcanaId = `${MinorArcanaSuitId}-${MinorArcanaRankId}`;
export type TarotCardId = MajorArcanaId | MinorArcanaId;

export type MajorArcanaDefinition = {
  readonly id: MajorArcanaId;
  readonly arcana: "major";
  readonly number: number;
};

export type MinorArcanaDefinition = {
  readonly id: MinorArcanaId;
  readonly arcana: "minor";
  readonly suit: MinorArcanaSuitId;
  readonly rank: MinorArcanaRankId;
};

export type TarotCardDefinition = MajorArcanaDefinition | MinorArcanaDefinition;

export const majorArcanaDefinitions = majorArcanaIds.map((id, number) => ({
  arcana: "major" as const,
  id,
  number,
}));

export const minorArcanaDefinitions = minorArcanaSuitIds.flatMap((suit) =>
  minorArcanaRankIds.map((rank) => ({
    arcana: "minor" as const,
    id: `${suit}-${rank}` as MinorArcanaId,
    rank,
    suit,
  })),
);

export const tarotCardDefinitions: readonly TarotCardDefinition[] = [
  ...majorArcanaDefinitions,
  ...minorArcanaDefinitions,
];

export const canonicalTarotCardIds = tarotCardDefinitions.map(
  ({ id }) => id,
) as readonly TarotCardId[];

const definitionById = new Map(
  tarotCardDefinitions.map((definition) => [definition.id, definition]),
);

export function getTarotCardDefinition(cardId: TarotCardId) {
  const definition = definitionById.get(cardId);

  if (!definition) {
    throw new RangeError(`Unknown tarot card: ${cardId}`);
  }

  return definition;
}
