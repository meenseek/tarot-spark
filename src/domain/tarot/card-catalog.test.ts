import { describe, expect, it } from "vitest";
import {
  canonicalTarotCardIds,
  getTarotCardDefinition,
  majorArcanaDefinitions,
  majorArcanaIds,
  minorArcanaDefinitions,
  minorArcanaRankIds,
  minorArcanaSuitIds,
} from "./card-catalog";

const expectedMajorIds = [
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
const expectedSuitIds = ["wands", "cups", "swords", "pentacles"] as const;
const expectedRankIds = [
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
const expectedMinorIds = [
  "wands-ace",
  "wands-2",
  "wands-3",
  "wands-4",
  "wands-5",
  "wands-6",
  "wands-7",
  "wands-8",
  "wands-9",
  "wands-10",
  "wands-page",
  "wands-knight",
  "wands-queen",
  "wands-king",
  "cups-ace",
  "cups-2",
  "cups-3",
  "cups-4",
  "cups-5",
  "cups-6",
  "cups-7",
  "cups-8",
  "cups-9",
  "cups-10",
  "cups-page",
  "cups-knight",
  "cups-queen",
  "cups-king",
  "swords-ace",
  "swords-2",
  "swords-3",
  "swords-4",
  "swords-5",
  "swords-6",
  "swords-7",
  "swords-8",
  "swords-9",
  "swords-10",
  "swords-page",
  "swords-knight",
  "swords-queen",
  "swords-king",
  "pentacles-ace",
  "pentacles-2",
  "pentacles-3",
  "pentacles-4",
  "pentacles-5",
  "pentacles-6",
  "pentacles-7",
  "pentacles-8",
  "pentacles-9",
  "pentacles-10",
  "pentacles-page",
  "pentacles-knight",
  "pentacles-queen",
  "pentacles-king",
] as const;

describe("canonical tarot card catalog", () => {
  it("contains one unique definition for every card in a 78-card deck", () => {
    expect(canonicalTarotCardIds).toHaveLength(78);
    expect(new Set(canonicalTarotCardIds).size).toBe(78);
    expect(majorArcanaDefinitions).toHaveLength(22);
    expect(minorArcanaDefinitions).toHaveLength(56);
  });

  it("uses the locked RWS major ordering with Strength VIII and Justice XI", () => {
    expect(majorArcanaIds).toEqual(expectedMajorIds);
    expect(majorArcanaDefinitions.map(({ id }) => id)).toEqual(
      expectedMajorIds,
    );
    expect(majorArcanaDefinitions[8]).toMatchObject({
      id: "strength",
      number: 8,
    });
    expect(majorArcanaDefinitions[11]).toMatchObject({
      id: "justice",
      number: 11,
    });
    expect(majorArcanaDefinitions.map(({ number }) => number)).toEqual(
      Array.from({ length: 22 }, (_, number) => number),
    );
  });

  it("contains all fourteen ranks in each of the four suits", () => {
    expect(minorArcanaSuitIds).toEqual(expectedSuitIds);
    expect(minorArcanaRankIds).toEqual(expectedRankIds);
    expect(minorArcanaDefinitions.map(({ id }) => id)).toEqual(
      expectedMinorIds,
    );

    for (const suit of minorArcanaSuitIds) {
      expect(
        minorArcanaDefinitions
          .filter((definition) => definition.suit === suit)
          .map(({ rank }) => rank),
      ).toEqual(minorArcanaRankIds);
    }
  });

  it("locks the full canonical deck order independently of implementation", () => {
    expect(canonicalTarotCardIds).toEqual([
      ...expectedMajorIds,
      ...expectedMinorIds,
    ]);
  });

  it("keeps structural metadata separate from localized card copy", () => {
    expect(getTarotCardDefinition("wands-queen")).toEqual({
      arcana: "minor",
      id: "wands-queen",
      rank: "queen",
      suit: "wands",
    });
    expect(getTarotCardDefinition("the-fool")).toEqual({
      arcana: "major",
      id: "the-fool",
      number: 0,
    });
  });
});
