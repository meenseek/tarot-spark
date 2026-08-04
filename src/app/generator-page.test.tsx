import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GeneratorRoute } from "./generator-route";

describe("generator route server state", () => {
  it("renders a restored result in the initial HTML", async () => {
    const page = await GeneratorRoute({
      locale: "en",
      searchParams: Promise.resolve({
        cards: "the-fool,the-magician,the-high-priestess",
        drawStyle: "balanced",
        style: "direct",
        topic: "love",
      }),
    });
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("The Fool");
    expect(markup).toContain("The Magician");
    expect(markup).toContain("The High Priestess");
    expect(markup).toContain("Copy selected prompt");
  });

  it("renders a cardless preset and keeps valid attribution separate from an invalid reading", async () => {
    const presetPage = await GeneratorRoute({
      locale: "en",
      searchParams: Promise.resolve({
        spread: "deep",
        style: "direct",
        topic: "career-direction",
      }),
    });
    const presetMarkup = renderToStaticMarkup(presetPage);
    const presetDocument = new DOMParser().parseFromString(
      presetMarkup,
      "text/html",
    );

    expect(
      presetDocument.querySelector<HTMLInputElement>(
        'input[name="tarot-topic"]:checked',
      )?.value,
    ).toBe("career-direction");
    expect(
      presetDocument.querySelector<HTMLInputElement>(
        'input[name="tarot-spread"]:checked',
      )?.value,
    ).toBe("deep");
    expect(
      presetDocument.querySelector<HTMLInputElement>(
        'input[name="reading-style"]:checked',
      )?.value,
    ).toBe("direct");

    const invalidReadingPage = await GeneratorRoute({
      locale: "en",
      searchParams: Promise.resolve({
        campaign: "vertical-slice",
        source: "copy",
        topic: ["love", "career-direction"],
      }),
    });
    const invalidReadingProps = invalidReadingPage.props as {
      readonly initialAttribution?: unknown;
      readonly initialReadingState?: unknown;
    };

    expect(invalidReadingProps.initialReadingState).toBeUndefined();
    expect(invalidReadingProps.initialAttribution).toEqual({
      campaignId: "vertical-slice",
      sourceId: "copy",
    });
  });

  it("renders localized restored cards in the initial HTML", async () => {
    const page = await GeneratorRoute({
      locale: "ko",
      searchParams: Promise.resolve({
        cards: "the-fool,the-magician,the-high-priestess",
        topic: "love",
      }),
    });
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("바보");
    expect(markup).toContain("마법사");
    expect(markup).toContain("여사제");
  });
});
