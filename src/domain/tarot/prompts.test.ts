import { describe, expect, it } from "vitest";
import { getTarotData } from "@/i18n/tarot-data";
import { buildPrompt } from "./prompts";
import { getReadingLens } from "./reading-lenses";

describe("tarot prompt building", () => {
  it("uses card-specific angles and a deterministic synthesis lens", () => {
    const data = getTarotData("en");
    const topic = data.topics[0];
    const cards = data.spreadPositions.map((position, index) => {
      const card = data.cards[index];

      if (!card) {
        throw new RangeError("Test prompt needs a canonical card.");
      }

      return { card, position };
    });

    if (!topic) {
      throw new RangeError("Test prompt needs a canonical topic.");
    }

    const lens = getReadingLens(data.readingLenses, topic.id, cards);
    const prompt = buildPrompt(data.promptTemplate, topic, cards, lens);

    expect(prompt).toContain(`Interpretation lens: ${lens.label}`);
    expect(prompt).toContain(lens.instruction);
    expect(prompt).toContain(
      `Card-specific angle: ${cards[0]?.card.promptAngle}`,
    );
    expect(prompt).toContain("one connected pattern");
    expect(prompt).toContain(
      "reinforcement, tension, progression, or integration",
    );
    expect(prompt).not.toContain("One insight for each card position");
  });
});
