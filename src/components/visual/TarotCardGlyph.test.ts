import { describe, expect, it } from "vitest";
import { tarotCardIds } from "@/domain/tarot/ids";
import {
  getTarotCardGlyphSignature,
  tarotCardGlyphDefinitions,
} from "./TarotCardGlyph";

describe("TarotCardGlyph", () => {
  it("defines one unique glyph for every stable tarot card id", () => {
    const definitionIds = Object.keys(tarotCardGlyphDefinitions);
    const signatures = tarotCardIds.map(getTarotCardGlyphSignature);

    expect(definitionIds).toEqual(tarotCardIds);
    expect(new Set(signatures).size).toBe(tarotCardIds.length);
    expect(signatures.every((signature) => signature.length > 0)).toBe(true);
  });
});
