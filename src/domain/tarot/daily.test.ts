import { describe, expect, it } from "vitest";
import { getTarotData } from "@/i18n/tarot-data";
import {
  getDailyTarotCard,
  getDailyTarotCardId,
  getLocalDateKey,
} from "./daily";
import { tarotCardIds } from "./ids";

describe("daily question tarot selection", () => {
  it("formats a browser-local calendar date without UTC conversion", () => {
    const localDate = new Date(2026, 6, 28, 23, 59, 59);

    expect(getLocalDateKey(localDate)).toBe("2026-07-28");
  });

  it("keeps the daily mapping deterministic", () => {
    expect(tarotCardIds).toHaveLength(78);
    expect(getDailyTarotCardId("2026-07-28")).toBe("swords-8");
    expect(getDailyTarotCardId("2026-07-29")).toBe("cups-7");
    expect(getDailyTarotCardId("2026-07-28")).toBe(
      getDailyTarotCardId("2026-07-28"),
    );
  });

  it("selects the same stable card id across locales", () => {
    const dateKey = "2026-07-28";
    const englishCard = getDailyTarotCard(getTarotData("en").cards, dateKey);
    const koreanCard = getDailyTarotCard(getTarotData("ko").cards, dateKey);

    expect(englishCard.id).toBe(koreanCard.id);
    expect(englishCard.name).not.toBe(koreanCard.name);
  });

  it.each(["2026-02-29", "2026-13-01", "2026-7-28", "not-a-date"])(
    "rejects invalid date key %s",
    (dateKey) => {
      expect(() => getDailyTarotCardId(dateKey)).toThrow(RangeError);
    },
  );

  it("rejects invalid Date objects and missing localized cards", () => {
    expect(() => getLocalDateKey(new Date(Number.NaN))).toThrow(RangeError);
    expect(() => getDailyTarotCard([], "2026-07-28")).toThrow(
      /card is missing/,
    );
  });
});
