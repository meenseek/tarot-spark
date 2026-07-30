import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TarotCardArt } from "./TarotCardArt";

describe("TarotCardArt", () => {
  afterEach(cleanup);

  it("falls back to the matching glyph when approved art fails to load", () => {
    const { container } = render(<TarotCardArt cardId="the-fool" />);
    const image = container.querySelector("img");

    expect(image).not.toBeNull();
    fireEvent.error(image as HTMLImageElement);

    expect(
      container.querySelector('[data-glyph-id="the-fool"]'),
    ).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("tries a different approved source after an earlier source failed", () => {
    const { container, rerender } = render(<TarotCardArt cardId="the-fool" />);

    fireEvent.error(container.querySelector("img") as HTMLImageElement);
    rerender(<TarotCardArt cardId="the-lovers" />);

    expect(container.querySelector('[data-art-id="the-lovers"]')).toBeVisible();
  });
});
