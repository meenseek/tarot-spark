import { describe, expect, it } from "vitest";
import { getShareImageModel } from "./image";
import { GET } from "./route";

describe("share image route", () => {
  it("renders an image response from allowlisted reading state", () => {
    const response = GET(
      new Request(
        "https://tarot-spark.example/api/share-image?locale=en&topic=relationship-flow&spread=quick&style=relational&cards=the-fool,the-lovers,the-star",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/png");
  });

  it("uses the same language-neutral card art model for both locales", () => {
    const state =
      "topic=relationship-flow&spread=quick&style=relational&cards=the-fool,the-lovers,the-star";
    const englishModel = getShareImageModel(
      new Request(
        `https://tarot-spark.example/api/share-image?locale=en&${state}`,
      ),
    );
    const koreanModel = getShareImageModel(
      new Request(
        `https://tarot-spark.example/api/share-image?locale=ko&${state}`,
      ),
    );

    expect(englishModel).not.toBeInstanceOf(Response);
    expect(koreanModel).toEqual(englishModel);
    expect(JSON.stringify(koreanModel)).not.toMatch(
      /The Fool|Relationship flow|Quick|Balanced|바보|관계 흐름/,
    );
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
  });
});
