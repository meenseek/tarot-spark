import { describe, expect, it } from "vitest";
import {
  dailyQuestionPathSegment,
  getDailyQuestionPath,
  isDailyQuestionPathSegment,
} from "./paths";

describe("daily question paths", () => {
  it("keeps the localized routes explicit", () => {
    expect(dailyQuestionPathSegment).toBe("daily");
    expect(getDailyQuestionPath("en")).toBe("/daily");
    expect(getDailyQuestionPath("ko")).toBe("/ko/daily");
  });

  it("recognizes only the daily product segment", () => {
    expect(isDailyQuestionPathSegment("daily")).toBe(true);
    expect(isDailyQuestionPathSegment("cards")).toBe(false);
  });
});
