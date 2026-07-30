import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
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

  it("keeps the glyph visible until ready art begins its reveal", async () => {
    const { container } = render(
      <div style={{ height: 112, position: "relative", width: 80 }}>
        <TarotCardArt cardId="the-fool" shouldReveal />
      </div>,
    );
    const image = container.querySelector("img") as HTMLImageElement;
    const glyph = container.querySelector('[data-glyph-id="the-fool"]');

    expect(glyph).toBeVisible();
    expect(glyph).toHaveClass("absolute", "inset-0", "m-auto");
    expect(image).toHaveAttribute("data-art-ready", "false");
    expect(image).toHaveClass("ts-card-art-pending");
    expect(image).not.toHaveClass("ts-card-face-reveal");

    fireEvent.load(image);

    await waitFor(() => {
      const readyImage = container.querySelector("img");

      expect(readyImage).toHaveAttribute("data-art-ready", "true");
      expect(readyImage).not.toHaveClass("ts-card-art-pending");
      expect(readyImage).toHaveClass("ts-card-face-reveal");
    });
  });
});
