import { afterEach, describe, expect, it } from "vitest";
import { shareImageVersion } from "./share-image-config";
import { formatCardTitleSummary, getShareReadingMetadata } from "./metadata";

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
              `https://tarot-spark.example/api/share-image?v=${shareImageVersion}&`,
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

  it("keeps six-card titles compact while descriptions retain card order", () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://tarot-spark.example";
    const orderedNames = [
      "Queen of Pentacles",
      "The High Priestess",
      "Knight of Wands",
      "Ten of Swords",
      "Page of Cups",
      "Wheel of Fortune",
    ];
    const metadata = getShareReadingMetadata("en", {
      cards:
        "pentacles-queen,the-high-priestess,wands-knight,swords-10,cups-page,wheel-of-fortune",
      spread: "deep",
      topic: "relationship-flow",
    });
    const serializedDescription = String(metadata.description);

    expect(metadata.title).toContain(
      "Queen of Pentacles, The High Priestess, Knight of Wands, and 3 more",
    );
    expect(
      orderedNames.map((name) => serializedDescription.indexOf(name)),
    ).toEqual(
      [...orderedNames]
        .map((name) => serializedDescription.indexOf(name))
        .sort((left, right) => left - right),
    );
    expect(serializedDescription.length).toBeLessThan(300);
    expect(
      formatCardTitleSummary("ko", [
        "펜타클 퀸",
        "여사제",
        "완드 나이트",
        "소드 10",
      ]),
    ).toBe("펜타클 퀸, 여사제, 완드 나이트 외 1장");
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

  it("preserves draw provenance in Open Graph and image URLs", () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://tarot-spark.example";

    const metadata = getShareReadingMetadata("en", {
      cards: "the-fool,the-lovers,the-star",
      drawStyle: "balanced",
      style: "relational",
      topic: "relationship-flow",
    });
    expect(String(metadata.openGraph?.url)).toContain("drawStyle=balanced");
    expect(metadata.openGraph).toMatchObject({
      images: [
        {
          url: expect.stringContaining("drawStyle=balanced"),
        },
      ],
    });
    expect(metadata.twitter).toMatchObject({
      images: [expect.stringContaining("drawStyle=balanced")],
    });
  });
});
