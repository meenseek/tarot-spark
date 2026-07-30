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
              "https://tarot-spark.example/api/share-image?",
            ),
            width: 1200,
          },
        ],
      },
      robots: {
        follow: true,
        index: false,
      },
    });
    expect(JSON.stringify(metadata)).not.toContain("source=instagram");
    expect(JSON.stringify(metadata)).not.toContain("campaign=vertical-slice");
  });
});
