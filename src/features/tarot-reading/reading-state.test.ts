import { afterEach, describe, expect, it } from "vitest";
import { getTarotData } from "@/i18n/tarot-data";
import {
  buildReadingUrl,
  clearPrivateContextHandoff,
  consumePrivateContextHandoff,
  getLocalizedReadingHref,
  getLocalizedGeneratorHref,
  getLocalizedShareReadingHref,
  getReadingAttributionFromSearchParams,
  getReadingAttributionFromUrl,
  getReadingStateFromSearchParams,
  getReadingStateFromUrl,
  readPrivateContextHandoff,
  storePrivateContextHandoff,
  type ReadingUrlState,
} from "./reading-state";

const privateContextHandoffStorageKey = "tarot-spark.private-context-handoff";

describe("reading URL state", () => {
  const tarotData = getTarotData("en");

  it("keeps only public allowlisted state and omits canonical defaults", () => {
    const state = createState("quick", "balanced");
    const url = new URL(
      buildReadingUrl(
        "https://example.com/?utm_source=private#sensitive-fragment",
        state,
      ),
    );

    expect(url.searchParams.get("topic")).toBe("love");
    expect(url.searchParams.get("cards")).toBe(
      "the-fool,the-magician,the-high-priestess",
    );
    expect(url.searchParams.has("spread")).toBe(false);
    expect(url.searchParams.has("style")).toBe(false);
    expect(url.searchParams.has("utm_source")).toBe(false);
    expect(url.hash).toBe("");
    expect(getReadingStateFromUrl(tarotData, url.toString())).toEqual(state);
  });

  it("adds only allowlisted share attribution when explicitly requested", () => {
    const url = new URL(
      buildReadingUrl(
        "https://example.com/?source=private-notes",
        createState("quick", "balanced"),
        {
          campaignId: "vertical-slice",
          sourceId: "instagram",
        },
      ),
    );

    expect(url.searchParams.get("source")).toBe("instagram");
    expect(url.searchParams.get("campaign")).toBe("vertical-slice");
    expect(url.toString()).not.toContain("private-notes");
  });

  it("parses only a complete allowlisted attribution pair", () => {
    expect(
      getReadingAttributionFromUrl(
        "https://example.com/share?source=instagram&campaign=vertical-slice",
      ),
    ).toEqual({
      campaignId: "vertical-slice",
      sourceId: "instagram",
    });
    expect(
      getReadingAttributionFromUrl("https://example.com/share"),
    ).toBeUndefined();

    for (const href of [
      "https://example.com/share?source=instagram",
      "https://example.com/share?campaign=vertical-slice",
      "https://example.com/share?source=private&campaign=vertical-slice",
      "https://example.com/share?source=instagram&source=copy&campaign=vertical-slice",
    ]) {
      expect(getReadingAttributionFromUrl(href)).toBeNull();
    }
  });

  it("parses only one complete allowlisted server search-param pair", () => {
    expect(
      getReadingAttributionFromSearchParams({
        campaign: "topic-guide",
        source: "naver",
      }),
    ).toEqual({ campaignId: "topic-guide", sourceId: "naver" });

    for (const searchParams of [
      { source: "naver" },
      { campaign: "topic-guide" },
      { campaign: "topic-guide", source: "private" },
      { campaign: "topic-guide", source: ["naver", "threads"] },
      { campaign: ["topic-guide", "vertical-slice"], source: "naver" },
    ]) {
      expect(
        getReadingAttributionFromSearchParams(searchParams),
      ).toBeUndefined();
    }
  });

  it("restores the canonical three-card URL as the quick balanced reading", () => {
    const restored = getReadingStateFromUrl(
      tarotData,
      "https://example.com/?topic=love&cards=the-fool,the-magician,the-high-priestess",
    );

    expect(restored).toMatchObject({
      drawStyleId: "balanced",
      spreadId: "quick",
      styleId: "balanced",
      topicId: "love",
    });
    expect(restored?.cards).toHaveLength(3);
  });

  it("restores a deep six-card reading with a selected style", () => {
    const state = createState("deep", "direct");
    const restored = getReadingStateFromUrl(
      tarotData,
      buildReadingUrl("https://example.com/", state),
    );

    expect(restored).toEqual(state);
  });

  it("round-trips a compatible relationship question without private text", () => {
    const state = {
      ...createState("quick", "balanced"),
      topicId: "feelings",
      questionId: "mutual-view",
    } as const satisfies ReadingUrlState;
    const url = new URL(buildReadingUrl("https://example.com/", state));

    expect(url.searchParams.get("question")).toBe("mutual-view");
    expect(url.toString()).not.toContain("How");
    expect(getReadingStateFromUrl(tarotData, url.toString())).toEqual(state);
  });

  it("rejects unknown, duplicated, empty, and topic-mismatched questions", () => {
    for (const href of [
      "https://example.com/?topic=feelings&question=unknown",
      "https://example.com/?topic=feelings&question=",
      "https://example.com/?topic=feelings&question=mutual-view&question=ignored-signals",
      "https://example.com/?topic=love&question=mutual-view",
    ]) {
      expect(getReadingStateFromUrl(tarotData, href)).toBeUndefined();
    }
  });

  it("preserves an immutable draw style only for result URLs", () => {
    const resultUrl = new URL(
      buildReadingUrl(
        "https://example.com/",
        createState("quick", "direct", "balanced"),
      ),
    );

    expect(resultUrl.searchParams.get("style")).toBe("direct");
    expect(resultUrl.searchParams.get("drawStyle")).toBe("balanced");
    expect(getReadingStateFromUrl(tarotData, resultUrl.toString())).toEqual(
      createState("quick", "direct", "balanced"),
    );

    const defaultCurrentStyleUrl = new URL(
      buildReadingUrl(
        "https://example.com/",
        createState("quick", "balanced", "direct"),
      ),
    );

    expect(defaultCurrentStyleUrl.searchParams.has("style")).toBe(false);
    expect(defaultCurrentStyleUrl.searchParams.get("drawStyle")).toBe("direct");

    const setupUrl = new URL(
      buildReadingUrl("https://example.com/", {
        ...createState("quick", "direct", "balanced"),
        cards: [],
      }),
    );

    expect(setupUrl.searchParams.has("drawStyle")).toBe(false);
  });

  it("strictly parses generator reading fields while keeping unknown fields out of the seed", () => {
    expect(
      getReadingStateFromSearchParams(tarotData, {
        privateContext: "must-not-enter-state",
        source: "copy",
        spread: "deep",
        style: "direct",
        topic: "career-direction",
        unknown: ["ignored", "even-as-an-array"],
      }),
    ).toEqual({
      cards: [],
      drawStyleId: "direct",
      spreadId: "deep",
      styleId: "direct",
      topicId: "career-direction",
    });

    for (const searchParams of [
      { topic: ["love", "career"] },
      { cards: "" },
      { style: "unknown" },
      { cards: "the-fool,the-magician,the-high-priestess", drawStyle: "x" },
      { drawStyle: "direct", topic: "love" },
    ]) {
      expect(
        getReadingStateFromSearchParams(tarotData, searchParams),
      ).toBeUndefined();
    }
  });

  it("rejects duplicate recognized reading fields from URL parsing", () => {
    expect(
      getReadingStateFromUrl(
        tarotData,
        "https://example.com/?topic=love&topic=career",
      ),
    ).toBeUndefined();
  });

  it.each([
    "https://example.com/?topic=unknown",
    "https://example.com/?spread=unknown",
    "https://example.com/?style=unknown",
    "https://example.com/?cards=the-fool,the-magician",
    "https://example.com/?cards=the-fool,the-fool,the-magician",
    "https://example.com/?spread=deep&cards=the-fool,the-magician,the-high-priestess",
    "https://example.com/?drawStyle=direct",
    "https://example.com/?cards=the-fool,the-magician,the-high-priestess&drawStyle=unknown",
  ])("rejects malformed or unknown state in %s", (href) => {
    expect(getReadingStateFromUrl(tarotData, href)).toBeUndefined();
  });

  it("builds a locale link without private or unrelated state", () => {
    expect(getLocalizedReadingHref("ko", createState("deep", "direct"))).toBe(
      "/ko?topic=love&spread=deep&style=direct&cards=the-fool%2Cthe-magician%2Cthe-high-priestess%2Cthe-empress%2Cthe-emperor%2Cthe-hierophant",
    );
  });

  it("preserves typed attribution in a locale link", () => {
    const href = getLocalizedReadingHref(
      "ko",
      createState("quick", "balanced"),
      {
        campaignId: "prompt-education",
        sourceId: "threads",
      },
    );
    const url = new URL(href, "https://example.com");

    expect(url.searchParams.get("source")).toBe("threads");
    expect(url.searchParams.get("campaign")).toBe("prompt-education");
  });

  it("keeps a shared snapshot on localized share routes", () => {
    expect(
      getLocalizedShareReadingHref("ko", createState("quick", "balanced"), {
        campaignId: "vertical-slice",
        sourceId: "copy",
      }),
    ).toBe(
      "/ko/share?topic=love&cards=the-fool%2Cthe-magician%2Cthe-high-priestess&source=copy&campaign=vertical-slice",
    );
  });

  it("preserves draw provenance across locale and share links", () => {
    const state = createState("quick", "direct", "balanced");
    const localeUrl = new URL(
      getLocalizedReadingHref("ko", state),
      "https://example.com",
    );
    const shareUrl = new URL(
      getLocalizedShareReadingHref("ko", state),
      "https://example.com",
    );

    expect(localeUrl.searchParams.get("style")).toBe("direct");
    expect(localeUrl.searchParams.get("drawStyle")).toBe("balanced");
    expect(shareUrl.searchParams.get("style")).toBe("direct");
    expect(shareUrl.searchParams.get("drawStyle")).toBe("balanced");
  });

  it("builds a clean generator CTA with attribution only", () => {
    expect(
      getLocalizedGeneratorHref("ko", {
        campaignId: "vertical-slice",
        sourceId: "instagram",
      }),
    ).toBe("/ko?source=instagram&campaign=vertical-slice");
    expect(getLocalizedGeneratorHref("en")).toBe("/");
  });

  function createState(
    spreadId: ReadingUrlState["spreadId"],
    styleId: ReadingUrlState["styleId"],
    drawStyleId: ReadingUrlState["drawStyleId"] = styleId,
  ): ReadingUrlState {
    const spread = tarotData.spreads.find(
      (candidate) => candidate.id === spreadId,
    );

    if (!spread) {
      throw new Error(`Missing test spread ${spreadId}`);
    }

    return {
      cards: Array.from({ length: spread.cardCount }, (_, index) => {
        const card = tarotData.cards[index];

        if (!card) {
          throw new Error(`Missing test card at index ${index}`);
        }

        return { card };
      }),
      drawStyleId,
      spreadId,
      styleId,
      topicId: "love",
    };
  }
});

describe("one-time locale context transfer", () => {
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("normalizes, consumes, and deletes private context once", () => {
    storePrivateContextHandoff(
      window.sessionStorage,
      "  We work together.\r\nThere is tension.  ",
      1_000,
    );

    expect(consumePrivateContextHandoff(window.sessionStorage, 2_000)).toBe(
      "We work together.\nThere is tension.",
    );
    expect(consumePrivateContextHandoff(window.sessionStorage, 2_000)).toBe(
      undefined,
    );
  });

  it("keeps a valid handoff until restoration explicitly commits", () => {
    storePrivateContextHandoff(
      window.sessionStorage,
      "  Private context survives Strict Effects.  ",
      1_000,
    );

    expect(readPrivateContextHandoff(window.sessionStorage, 2_000)).toBe(
      "Private context survives Strict Effects.",
    );
    expect(readPrivateContextHandoff(window.sessionStorage, 2_000)).toBe(
      "Private context survives Strict Effects.",
    );
    expect(
      window.sessionStorage.getItem(privateContextHandoffStorageKey),
    ).not.toBeNull();

    clearPrivateContextHandoff(window.sessionStorage);

    expect(
      window.sessionStorage.getItem(privateContextHandoffStorageKey),
    ).toBeNull();
  });

  it("rejects expired and invalid records after deleting them", () => {
    storePrivateContextHandoff(window.sessionStorage, "Private context", 1_000);
    expect(
      consumePrivateContextHandoff(window.sessionStorage, 61_001),
    ).toBeUndefined();

    window.sessionStorage.setItem(privateContextHandoffStorageKey, "{not-json");
    expect(
      consumePrivateContextHandoff(window.sessionStorage, 2_000),
    ).toBeUndefined();
    expect(
      window.sessionStorage.getItem(privateContextHandoffStorageKey),
    ).toBeNull();
  });

  it("rejects extra fields, far-future expiry, and clears legacy keys", () => {
    window.sessionStorage.setItem(
      `${privateContextHandoffStorageKey}.legacy`,
      JSON.stringify({ context: "old", expiresAt: 2_000 }),
    );
    window.sessionStorage.setItem(
      privateContextHandoffStorageKey,
      JSON.stringify({ context: "Private", expiresAt: 2_000, extra: true }),
    );

    expect(
      consumePrivateContextHandoff(window.sessionStorage, 1_000),
    ).toBeUndefined();
    expect(
      window.sessionStorage.getItem(
        `${privateContextHandoffStorageKey}.legacy`,
      ),
    ).toBeNull();

    window.sessionStorage.setItem(
      privateContextHandoffStorageKey,
      JSON.stringify({ context: "Private", expiresAt: 62_000 }),
    );
    expect(
      consumePrivateContextHandoff(window.sessionStorage, 1_000),
    ).toBeUndefined();
  });

  it("does not throw when storage is unavailable", () => {
    const unavailableStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Storage;

    expect(() =>
      storePrivateContextHandoff(unavailableStorage, "Private context"),
    ).not.toThrow();
    expect(consumePrivateContextHandoff(unavailableStorage)).toBeUndefined();
  });

  it("does not store context beyond the public input limit", () => {
    expect(() =>
      storePrivateContextHandoff(window.sessionStorage, "x".repeat(501)),
    ).not.toThrow();
    expect(
      window.sessionStorage.getItem(privateContextHandoffStorageKey),
    ).toBeNull();
  });
});
