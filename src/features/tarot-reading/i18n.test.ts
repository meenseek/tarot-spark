import { afterEach, describe, expect, it } from "vitest";
import { getTarotReadingMetadata } from "./i18n";

const originalSiteUrl = process.env["NEXT_PUBLIC_SITE_URL"];

describe("tarot reading metadata", () => {
  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env["NEXT_PUBLIC_SITE_URL"];
    } else {
      process.env["NEXT_PUBLIC_SITE_URL"] = originalSiteUrl;
    }
  });

  it("publishes query-free localized social preview metadata", () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://tarot-spark.example";

    expect(getTarotReadingMetadata("ko")).toMatchObject({
      openGraph: {
        description: expect.stringContaining("상황 맥락"),
        images: [
          {
            alt: expect.stringContaining("세 장의 천체 타로 카드"),
            height: 630,
            url: "https://tarot-spark.example/brand/tarot-spark-social-card.png",
            width: 1200,
          },
        ],
        locale: "ko_KR",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        images: [
          {
            url: "https://tarot-spark.example/brand/tarot-spark-social-card.png",
          },
        ],
      },
    });
  });
});
