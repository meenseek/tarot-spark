import { describe, expect, it } from "vitest";
import {
  getTarotCardGlyphSignature,
  getTarotCardGlyphIds,
  tarotCardGlyphDefinitions,
} from "./TarotCardGlyph";

describe("TarotCardGlyph", () => {
  it("keeps the legacy glyph set unique for the twelve approved art cards", () => {
    const definitionIds = Object.keys(tarotCardGlyphDefinitions);
    const glyphIds = getTarotCardGlyphIds();
    const signatures = glyphIds.map(getTarotCardGlyphSignature);

    expect(definitionIds).toEqual(glyphIds);
    expect(glyphIds).toHaveLength(12);
    expect(new Set(signatures).size).toBe(glyphIds.length);
    expect(signatures.every((signature) => Boolean(signature?.length))).toBe(
      true,
    );
  });
});
