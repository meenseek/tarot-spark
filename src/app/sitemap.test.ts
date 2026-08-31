import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";

describe("sitemap", () => {
  it("publishes the generic question catalog in both locales", () => {
    const entries = sitemap();

    expect(
      entries.find(({ url }) => url.endsWith("/tarot-questions")),
    ).toMatchObject({
      changeFrequency: "weekly",
      priority: 0.95,
    });
    expect(
      entries.find(({ url }) => url.endsWith("/ko/tarot-questions")),
    ).toMatchObject({
      changeFrequency: "weekly",
      priority: 0.9,
    });
  });
});
