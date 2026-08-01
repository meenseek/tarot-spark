import { afterEach, describe, expect, it } from "vitest";
import { getShareReadingMetadata } from "./metadata";

const originalSiteUrl = process.env["NEXT_PUBLIC_SITE_URL"];

describe("share reading metadata", () => {
  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env["NEXT_PUBLIC_SITE_URL"];
    } else {
      process.env["NEXT_PUBLIC_SITE_URL"] = originalSiteUrl;
    }
  });

  it("uses a privacy-safe dynamic image and noindex canonical", () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://tarot-spark.example";

    const metadata = getShareReadingMetadata("en", {
      topic: "relationship-flow",
      spread: "quick",
      style: "relational",
      cards: "the-fool,the-lovers,the-star",
      source: "instagram",
      campaign: "vertical-slice",
    });

    expect(metadata).toMatchObject({
      alternates: {
        canonical: "https://tarot-spark.example/relationship-flow",
      },
      openGraph: {
        images: [
          {
            height: 630,
            url: expect.stringContaining(
              "https://tarot-spark.example/api/share-image?v=1&",
            ),
            width: 1200,
          },
        ],
        url: "https://tarot-spark.example/share?topic=relationship-flow&style=relational&cards=the-fool%2Cthe-lovers%2Cthe-star",
      },
      robots: {
        follow: true,
        index: false,
      },
    });
    expect(JSON.stringify(metadata)).not.toContain("source=instagram");
    expect(JSON.stringify(metadata)).not.toContain("campaign=vertical-slice");
  });

  it("uses a distinct Open Graph object URL for each valid reading", () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://tarot-spark.example";

    const firstMetadata = getShareReadingMetadata("en", {
      cards: "the-fool,the-lovers,the-star",
      topic: "relationship-flow",
    });
    const secondMetadata = getShareReadingMetadata("en", {
      cards: "the-magician,the-empress,the-hermit",
      topic: "relationship-flow",
    });

    expect(firstMetadata.openGraph?.url).not.toBe(
      secondMetadata.openGraph?.url,
    );
    expect(String(firstMetadata.openGraph?.url)).not.toContain("source=");
    expect(String(firstMetadata.openGraph?.url)).not.toContain("campaign=");
  });
});
