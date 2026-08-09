import { describe, expect, it } from "vitest";
import {
  shareImageCacheControl,
  shareImageCacheRevision,
  shareImageCacheRevisionParam,
} from "@/features/share-reading/share-image-config";
import { getShareImageModel } from "./image";
import { GET } from "./route";

const currentRevision = `${shareImageCacheRevisionParam}=${shareImageCacheRevision}`;

describe("share image route", () => {
  it("renders the current deck with an immutable cache key", () => {
    const response = GET(
      new Request(
        `https://tarot-spark.example/api/share-image?${currentRevision}&locale=en&topic=relationship-flow&spread=quick&style=relational&cards=the-fool,the-lovers,the-star`,
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/png");
    expect(response.headers.get("cache-control")).toBe(shareImageCacheControl);
  });

  it("uses final art for every card in a localized deep reading", () => {
    const model = getShareImageModel(
      new Request(
        `https://tarot-spark.example/api/share-image?${currentRevision}&locale=ko&topic=relationship-flow&spread=deep&style=relational&cards=pentacles-queen,the-high-priestess,wands-knight,swords-10,cups-page,wheel-of-fortune`,
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
          `https://tarot-spark.example/api/share-image?${currentRevision}&locale=en&topic=relationship-flow&style=relational&drawStyle=balanced&cards=the-fool,the-lovers,the-star`,
        ),
      ).status,
    ).toBe(200);
    expect(
      GET(
        new Request(
          `https://tarot-spark.example/api/share-image?${currentRevision}&locale=en&topic=relationship-flow&style=relational&drawStyle=unknown&cards=the-fool,the-lovers,the-star`,
        ),
      ).status,
    ).toBe(400);
  });

  it("requires exactly the current cache revision", () => {
    for (const revisionQuery of [
      "",
      `${shareImageCacheRevisionParam}=old&`,
      `${currentRevision}&${currentRevision}&`,
    ]) {
      const response = GET(
        new Request(
          `https://tarot-spark.example/api/share-image?${revisionQuery}locale=en&topic=relationship-flow&cards=the-fool,the-lovers,the-star`,
        ),
      );

      expect(response.status).toBe(400);
      expect(response.headers.get("cache-control") ?? "").not.toContain(
        "immutable",
      );
    }
  });

  it("rejects duplicate or unknown state", () => {
    expect(
      GET(
        new Request(
          `https://tarot-spark.example/api/share-image?${currentRevision}&locale=en&locale=ko&topic=relationship-flow&cards=the-fool,the-lovers,the-star`,
        ),
      ).status,
    ).toBe(400);
    expect(
      GET(
        new Request(
          `https://tarot-spark.example/api/share-image?${currentRevision}&locale=en&topic=relationship-flow&cards=the-fool,the-lovers,the-star&context=private`,
        ),
      ).status,
    ).toBe(400);
  });
});
