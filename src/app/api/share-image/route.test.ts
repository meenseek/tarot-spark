import { describe, expect, it } from "vitest";
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
