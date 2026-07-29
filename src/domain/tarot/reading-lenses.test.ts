import { describe, expect, it } from "vitest";
import { getTarotData } from "@/i18n/tarot-data";
import { readingLensIds } from "./ids";
import { getReadingLens, readingLensAlgorithmVersion } from "./reading-lenses";
import type { DrawnCard, LocaleTarotData } from "./types";

describe("reading lens selection", () => {
  it("keeps a versioned, deterministic lens across locales", () => {
    const englishData = getTarotData("en");
    const koreanData = getTarotData("ko");
    const englishCards = getDrawnCards(englishData, [0, 1, 2]);
    const koreanCards = getDrawnCards(koreanData, [0, 1, 2]);

    const englishLens = getReadingLens(
      englishData.readingLenses,
      "reunion",
      englishCards,
    );
    const koreanLens = getReadingLens(
      koreanData.readingLenses,
      "reunion",
      koreanCards,
    );

    expect(readingLensAlgorithmVersion).toBe("reading-lens-v1");
    expect(englishLens.id).toBe(koreanLens.id);
    expect(englishLens.label).not.toBe(koreanLens.label);
    expect(
      getReadingLens(englishData.readingLenses, "reunion", englishCards).id,
    ).toBe(englishLens.id);
  });

  it("makes every configured lens reachable from canonical inputs", () => {
    const data = getTarotData("en");
    const reachedLensIds = new Set<string>();

    for (const topic of data.topics) {
      for (let first = 0; first < data.cards.length; first += 1) {
        for (let second = 0; second < data.cards.length; second += 1) {
          if (second === first) {
            continue;
          }

          for (let third = 0; third < data.cards.length; third += 1) {
            if (third === first || third === second) {
              continue;
            }

            const cards = getDrawnCards(data, [first, second, third]);
            reachedLensIds.add(
              getReadingLens(data.readingLenses, topic.id, cards).id,
            );
          }
        }
      }
    }

    expect([...reachedLensIds].sort()).toEqual([...readingLensIds].sort());
  });

  it("rejects an empty reading lens set", () => {
    const data = getTarotData("en");

    expect(() =>
      getReadingLens([], "love", getDrawnCards(data, [0, 1, 2])),
    ).toThrow(/must not be empty/);
  });
});

function getDrawnCards(data: LocaleTarotData, cardIndexes: readonly number[]) {
  return cardIndexes.map((cardIndex, positionIndex) => {
    const card = data.cards[cardIndex];
    const position = data.spreadPositions[positionIndex];

    if (!card || !position) {
      throw new RangeError("Test reading needs canonical cards and positions.");
    }

    return { card, position };
  }) satisfies DrawnCard[];
}
