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
    expect(snapshot?.state).toMatchObject({
      drawStyleId: "relational",
      spreadId: "quick",
      styleId: "relational",
      topicId: "relationship-flow",
    });
  });

  it("preserves the original draw style independently from the current style", () => {
    const snapshot = getShareReadingSnapshot("en", {
      ...validParams,
      drawStyle: "balanced",
    });

    expect(snapshot?.state).toMatchObject({
      drawStyleId: "balanced",
      styleId: "relational",
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
    { ...validParams, drawStyle: ["balanced", "direct"] },
    { ...validParams, drawStyle: "unknown" },
  ])("rejects malformed, private, or unknown state", (params) => {
    expect(getShareReadingSnapshot("en", params)).toBeUndefined();
  });
});
