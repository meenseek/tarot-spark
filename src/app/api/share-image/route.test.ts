import { describe, expect, it } from "vitest";
import {
  legacyShareImageQueryParam,
  legacyShareImageQueryValue,
  privateShareImageCacheControl,
  shareImageCacheControl,
} from "@/features/share-reading/share-image-config";
import { getShareImageModel } from "./image";
import { GET } from "./route";

describe("share image route", () => {
  it("renders the current deck with bounded shared caching", () => {
    const response = GET(
      new Request(
        "https://tarot-spark.example/api/share-image?locale=en&topic=relationship-flow&spread=quick&style=relational&cards=the-fool,the-lovers,the-star",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/png");
    expect(response.headers.get("cache-control")).toBe(shareImageCacheControl);
  });

  it("uses final art for every card in a localized deep reading", () => {
    const model = getShareImageModel(
      new Request(
        "https://tarot-spark.example/api/share-image?locale=ko&topic=relationship-flow&spread=deep&style=relational&cards=pentacles-queen,the-high-priestess,wands-knight,swords-10,cups-page,wheel-of-fortune",
      ),
    );

    expect(model).not.toBeInstanceOf(Response);
    if (!(model instanceof Response)) {
      expect(model.cards).toHaveLength(6);
      expect(model.cards.map(({ name }) => name)).toEqual([
        "펜타클 퀸",
        "여사제",
        "완드 나이트",
        "소드 10",
        "컵 페이지",
        "운명의 수레바퀴",
      ]);
      expect(
        model.cards.every(({ artUrl }) =>
          artUrl.startsWith("data:image/jpeg;base64,"),
        ),
      ).toBe(true);
    }
  });

  it("accepts valid draw provenance and rejects invalid provenance", () => {
    expect(
      GET(
        new Request(
          "https://tarot-spark.example/api/share-image?locale=en&topic=relationship-flow&style=relational&drawStyle=balanced&cards=the-fool,the-lovers,the-star",
        ),
      ).status,
    ).toBe(200);
    expect(
      GET(
        new Request(
          "https://tarot-spark.example/api/share-image?locale=en&topic=relationship-flow&style=relational&drawStyle=unknown&cards=the-fool,the-lovers,the-star",
        ),
      ).status,
    ).toBe(400);
  });

  it("redirects the one previously issued cache URL to its stable URL", () => {
    const response = GET(
      new Request(
        `https://tarot-spark.example/api/share-image?${legacyShareImageQueryParam}=${legacyShareImageQueryValue}&locale=en&topic=relationship-flow&cards=the-fool,the-lovers,the-star`,
      ),
    );

    expect(response.status).toBe(308);
    expect(response.headers.get("cache-control")).toBe(
      privateShareImageCacheControl,
    );
    expect(response.headers.get("location")).toBe(
      "https://tarot-spark.example/api/share-image?locale=en&topic=relationship-flow&cards=the-fool%2Cthe-lovers%2Cthe-star",
    );
  });

  it("rejects unknown or duplicate legacy cache parameters", () => {
    for (const legacyQuery of [
      `${legacyShareImageQueryParam}=old&`,
      `${legacyShareImageQueryParam}=${legacyShareImageQueryValue}&${legacyShareImageQueryParam}=${legacyShareImageQueryValue}&`,
    ]) {
      const response = GET(
        new Request(
          `https://tarot-spark.example/api/share-image?${legacyQuery}locale=en&topic=relationship-flow&cards=the-fool,the-lovers,the-star`,
        ),
      );

      expect(response.status).toBe(400);
      expect(response.headers.get("cache-control")).toBe(
        privateShareImageCacheControl,
      );
    }
  });

  it("rejects duplicate or unknown state", () => {
    expect(
      GET(
        new Request(
          "https://tarot-spark.example/api/share-image?locale=en&locale=ko&topic=relationship-flow&cards=the-fool,the-lovers,the-star",
        ),
      ).status,
    ).toBe(400);
    expect(
      GET(
        new Request(
          "https://tarot-spark.example/api/share-image?locale=en&topic=relationship-flow&cards=the-fool,the-lovers,the-star&context=private",
        ),
      ).status,
    ).toBe(400);
    expect(
      GET(
        new Request(
          `https://tarot-spark.example/api/share-image?${legacyShareImageQueryParam}=${legacyShareImageQueryValue}&locale=en&topic=relationship-flow&cards=the-fool,the-lovers,the-star&context=private`,
        ),
      ).status,
    ).toBe(400);
  });
});
