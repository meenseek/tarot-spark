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
      description: expect.stringContaining("평소 쓰는 AI"),
      openGraph: {
        description: expect.stringContaining("평소 쓰는 AI"),
        images: [
          {
            alt: "별빛 타로 카드 세 장과 tarot-spark 이름이 있는 공유 이미지",
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
        description: expect.stringContaining("평소 쓰는 AI"),
        images: [
          {
            url: "https://tarot-spark.example/brand/tarot-spark-social-card.png",
          },
        ],
      },
    });

    expect(getTarotReadingMetadata("en")).toMatchObject({
      description: expect.stringContaining("AI tool you already use"),
      openGraph: {
        description: expect.stringContaining("AI tool you already use"),
        images: [
          {
            alt: "Share image with three celestial tarot cards and the tarot-spark name",
            height: 630,
            url: "https://tarot-spark.example/brand/tarot-spark-social-card.png",
            width: 1200,
          },
        ],
        locale: "en_US",
      },
      twitter: {
        description: expect.stringContaining("AI tool you already use"),
      },
    });
  });
});
