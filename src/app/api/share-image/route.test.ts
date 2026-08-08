import { describe, expect, it } from "vitest";
import {
  completeDeckLegacyShareImageVersion,
  legacyShareImageVersion,
  legacyShareImageCacheControl,
  shareImageVersion,
  versionedShareImageCacheControl,
} from "@/features/share-reading/share-image-config";
import { getShareImageModel } from "./image";
import { GET } from "./route";

describe("share image route", () => {
  it("renders an image response from allowlisted reading state", () => {
    const response = GET(
      new Request(
        `https://tarot-spark.example/api/share-image?v=${shareImageVersion}&locale=en&topic=relationship-flow&spread=quick&style=relational&cards=the-fool,the-lovers,the-star`,
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/png");
    expect(response.headers.get("cache-control")).toBe(
      versionedShareImageCacheControl,
    );
  });

  it("keeps legacy image URLs available with a shorter CDN cache", () => {
    const response = GET(
      new Request(
        "https://tarot-spark.example/api/share-image?locale=en&topic=relationship-flow&cards=the-fool,the-lovers,the-star",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      legacyShareImageCacheControl,
    );
  });

  it("keeps the immutable v1 artwork-only model for existing links", () => {
    const state =
      "topic=relationship-flow&spread=quick&style=relational&cards=the-fool,the-lovers,the-star";
    const englishModel = getShareImageModel(
      new Request(
        `https://tarot-spark.example/api/share-image?v=${legacyShareImageVersion}&locale=en&${state}`,
      ),
    );
    const koreanModel = getShareImageModel(
      new Request(
        `https://tarot-spark.example/api/share-image?v=${legacyShareImageVersion}&locale=ko&${state}`,
      ),
    );

    expect(englishModel).not.toBeInstanceOf(Response);
    expect(koreanModel).toEqual(englishModel);
    expect(JSON.stringify(koreanModel)).not.toMatch(
      /The Fool|Relationship flow|Quick|Balanced|바보|관계 흐름/,
    );
  });

  it("preserves localized name-face models for existing v2 links", () => {
    const state =
      "topic=relationship-flow&spread=deep&style=relational&cards=pentacles-queen,the-high-priestess,wands-knight,swords-10,cups-page,wheel-of-fortune";
    const englishModel = getShareImageModel(
      new Request(
        `https://tarot-spark.example/api/share-image?v=${completeDeckLegacyShareImageVersion}&locale=en&${state}`,
      ),
    );
    const koreanModel = getShareImageModel(
      new Request(
        `https://tarot-spark.example/api/share-image?v=${completeDeckLegacyShareImageVersion}&locale=ko&${state}`,
      ),
    );

    expect(englishModel).toMatchObject({ kind: "complete-deck" });
    expect(koreanModel).toMatchObject({ kind: "complete-deck" });
    expect(JSON.stringify(englishModel)).toContain("Queen of Pentacles");
    expect(JSON.stringify(koreanModel)).toContain("펜타클 퀸");
    expect(JSON.stringify(koreanModel)).not.toContain("pentacles-queen</text>");
  });

  it("uses approved v3 art for every card in new share images", () => {
    const model = getShareImageModel(
      new Request(
        `https://tarot-spark.example/api/share-image?v=${shareImageVersion}&locale=ko&topic=relationship-flow&spread=deep&style=relational&cards=pentacles-queen,the-high-priestess,wands-knight,swords-10,cups-page,wheel-of-fortune`,
      ),
    );

    expect(model).not.toBeInstanceOf(Response);
    expect(model).toMatchObject({ kind: "complete-deck" });
    if (!(model instanceof Response) && model.kind === "complete-deck") {
      expect(model.cards).toHaveLength(6);
      expect(
        model.cards.every(({ artUrl }) =>
          artUrl?.startsWith("data:image/jpeg;base64,"),
        ),
      ).toBe(true);
    }
  });

  it("does not reinterpret legacy v1 URLs with cards that never had v1 art", () => {
    for (const versionQuery of ["", `v=${legacyShareImageVersion}&`]) {
      expect(
        GET(
          new Request(
            `https://tarot-spark.example/api/share-image?${versionQuery}locale=ko&topic=love&cards=wands-queen,swords-3,cups-ace`,
          ),
        ).status,
      ).toBe(400);
    }
  });

  it("accepts a valid original draw style and rejects invalid provenance", () => {
    expect(
      GET(
        new Request(
          `https://tarot-spark.example/api/share-image?v=${shareImageVersion}&locale=en&topic=relationship-flow&style=relational&drawStyle=balanced&cards=the-fool,the-lovers,the-star`,
        ),
      ).status,
    ).toBe(200);
    expect(
      GET(
        new Request(
          `https://tarot-spark.example/api/share-image?v=${shareImageVersion}&locale=en&topic=relationship-flow&style=relational&drawStyle=unknown&cards=the-fool,the-lovers,the-star`,
        ),
      ).status,
    ).toBe(400);
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
    for (const versionQuery of [
      "v=4",
      `v=${shareImageVersion}&v=${shareImageVersion}`,
    ]) {
      const response = GET(
        new Request(
          `https://tarot-spark.example/api/share-image?${versionQuery}&locale=en&topic=relationship-flow&cards=the-fool,the-lovers,the-star`,
        ),
      );

      expect(response.status).toBe(400);
      expect(response.headers.get("cache-control") ?? "").not.toContain(
        "immutable",
      );
    }
  });
});
