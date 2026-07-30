import { afterEach, describe, expect, it } from "vitest";
import { getSpreadPositions } from "@/domain/tarot";
import { getTarotData } from "@/i18n/tarot-data";
import {
  buildReadingUrl,
  consumePrivateContextHandoff,
  getLocalizedReadingHref,
  getReadingStateFromUrl,
  storePrivateContextHandoff,
  type ReadingUrlState,
} from "./reading-state";

const privateContextHandoffStorageKey =
  "tarot-spark.private-context-handoff.v1";

describe("reading URL state", () => {
  const tarotData = getTarotData("en");

  it("keeps only public allowlisted state and omits legacy defaults", () => {
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
  });

  it("restores legacy three-card URLs as the quick balanced reading", () => {
    const restored = getReadingStateFromUrl(
      tarotData,
      "https://example.com/?topic=love&cards=the-fool,the-magician,the-high-priestess",
    );

    expect(restored).toMatchObject({
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

  it.each([
    "https://example.com/?topic=unknown",
    "https://example.com/?spread=unknown",
    "https://example.com/?style=unknown",
    "https://example.com/?cards=the-fool,the-magician",
    "https://example.com/?cards=the-fool,the-fool,the-magician",
    "https://example.com/?spread=deep&cards=the-fool,the-magician,the-high-priestess",
  ])("rejects malformed or unknown state in %s", (href) => {
    expect(getReadingStateFromUrl(tarotData, href)).toBeUndefined();
  });

  it("builds a locale link without private or unrelated state", () => {
    expect(getLocalizedReadingHref("ko", createState("deep", "direct"))).toBe(
      "/ko?topic=love&spread=deep&style=direct&cards=the-fool%2Cthe-magician%2Cthe-high-priestess%2Cthe-empress%2Cthe-emperor%2Cthe-lovers",
    );
  });

  function createState(
    spreadId: ReadingUrlState["spreadId"],
    styleId: ReadingUrlState["styleId"],
  ): ReadingUrlState {
    const spread = tarotData.spreads.find(
      (candidate) => candidate.id === spreadId,
    );

    if (!spread) {
      throw new Error(`Missing test spread ${spreadId}`);
    }

    return {
      cards: getSpreadPositions(spread, tarotData.spreadPositions).map(
        (position, index) => {
          const card = tarotData.cards[index];

          if (!card) {
            throw new Error(`Missing test card at index ${index}`);
          }

          return { card, position };
        },
      ),
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
