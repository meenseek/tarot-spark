import { describe, expect, it } from "vitest";
import { getShareReadingSnapshot } from "./state";

describe("share reading state", () => {
  const validParams = {
    topic: "relationship-flow",
    spread: "quick",
    style: "relational",
    cards: "the-fool,the-lovers,the-star",
    source: "instagram",
    campaign: "vertical-slice",
  };

  it("materializes only a complete allowlisted reading", () => {
    const snapshot = getShareReadingSnapshot("en", validParams);

    expect(snapshot?.topic.id).toBe("relationship-flow");
    expect(snapshot?.cards.map(({ card }) => card.id)).toEqual([
      "the-fool",
      "the-lovers",
      "the-star",
    ]);
    expect(snapshot?.attribution).toEqual({
      campaignId: "vertical-slice",
      sourceId: "instagram",
    });
  });

  it.each([
    { ...validParams, source: "private-note" },
    { ...validParams, campaign: undefined },
    { ...validParams, cards: "the-fool,the-star" },
    { ...validParams, cards: "the-fool,the-fool,the-star" },
    { ...validParams, context: "private situation" },
    { ...validParams, topic: ["relationship-flow", "love"] },
    { ...validParams, source: ["instagram", "copy"] },
  ])("rejects malformed, private, or unknown state", (params) => {
    expect(getShareReadingSnapshot("en", params)).toBeUndefined();
  });
});
