import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TarotCardArt } from "./TarotCardArt";

const originalCompleteDescriptor = Object.getOwnPropertyDescriptor(
  HTMLImageElement.prototype,
  "complete",
);
const originalNaturalWidthDescriptor = Object.getOwnPropertyDescriptor(
  HTMLImageElement.prototype,
  "naturalWidth",
);

describe("TarotCardArt", () => {
  afterEach(() => {
    cleanup();
    restoreImageProperty("complete", originalCompleteDescriptor);
    restoreImageProperty("naturalWidth", originalNaturalWidthDescriptor);
  });

  it("uses the shared card back before a card is drawn", () => {
    const { container } = render(
      <TarotCardArt cardId={undefined} cardName="Prepared card" />,
    );

    expect(
      container.querySelector('[data-card-visual-state="prepared"]'),
    ).toBeVisible();
    expect(container.querySelector("[data-card-back]")).toBeVisible();
    expect(container.querySelector("[data-glyph-id]")).not.toBeInTheDocument();
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("flips to a named text face when approved art fails during a draw", async () => {
    const { container } = render(
      <TarotCardArt
        cardId="the-fool"
        cardName="The Fool"
        revealSequence={1}
        shouldReveal
      />,
    );
    const image = container.querySelector("img");

    expect(image).not.toBeNull();
    expect(container.querySelector("[data-card-back]")).toBeVisible();
    fireEvent.error(image as HTMLImageElement);

    await waitFor(() => {
      expect(
        container.querySelector('[data-card-text-face="the-fool"]'),
      ).toBeInTheDocument();
      expect(
        container.querySelector('[data-card-visual-state="flipping-fallback"]'),
      ).toBeInTheDocument();
      expect(container.querySelector("[data-card-back]")).toBeInTheDocument();
      expect(container.querySelector("img")).toBeNull();
    });

    const plane = container.querySelector("[data-card-plane]");
    fireEvent(plane as Element, new Event("animationend", { bubbles: true }));
    fireEvent(
      plane as Element,
      new Event("webkitAnimationEnd", { bubbles: true }),
    );

    await waitFor(() => {
      expect(
        container.querySelector('[data-card-visual-state="fallback"]'),
      ).toBeInTheDocument();
      expect(plane).toHaveClass("ts-card-plane-complete");
      expect(plane).not.toHaveClass("ts-card-plane-flip");
    });
  });

  it("falls back to the exact name when any approved card art fails", async () => {
    const { container } = render(
      <TarotCardArt cardId="swords-3" cardName="Three of Swords" />,
    );

    const image = container.querySelector("img");
    expect(image).toHaveAttribute("data-art-id", "swords-3");
    fireEvent.error(image as HTMLImageElement);

    await waitFor(() => {
      expect(
        container.querySelector('[data-card-text-face="swords-3"]'),
      ).toHaveTextContent("Three of Swords");
      expect(
        container.querySelector('[data-card-visual-state="fallback"]'),
      ).toBeInTheDocument();
    });
  });

  it("tries a different approved source after an earlier source failed", () => {
    const { container, rerender } = render(
      <TarotCardArt cardId="the-fool" cardName="The Fool" />,
    );

    fireEvent.error(container.querySelector("img") as HTMLImageElement);
    rerender(<TarotCardArt cardId="the-lovers" cardName="The Lovers" />);

    expect(container.querySelector('[data-art-id="the-lovers"]')).toBeVisible();
    expect(container.querySelector("[data-card-back]")).toBeVisible();
  });

  it("keeps the card back visible until a ready face begins one flip", async () => {
    const { container } = render(
      <div style={{ height: 112, position: "relative", width: 80 }}>
        <TarotCardArt
          cardId="the-fool"
          cardName="The Fool"
          revealSequence={1}
          shouldReveal
        />
      </div>,
    );
    const image = container.querySelector("img") as HTMLImageElement;
    const cardBack = container.querySelector("[data-card-back]");
    const plane = container.querySelector("[data-card-plane]");

    expect(cardBack).toBeVisible();
    expect(cardBack).toHaveClass("absolute", "inset-0", "h-full", "w-full");
    expect(container.querySelector("[data-glyph-id]")).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-card-visual-state="pending"]'),
    ).toBeInTheDocument();
    expect(image).toHaveAttribute("data-art-ready", "false");
    expect(image).toHaveAttribute("loading", "eager");
    expect(image).toHaveClass("ts-card-art-pending");
    expect(plane).not.toHaveClass("ts-card-plane-flip");

    fireEvent.load(image);

    await waitFor(() => {
      const readyImage = container.querySelector("img");

      expect(readyImage).toHaveAttribute("data-art-ready", "true");
      expect(readyImage).not.toHaveClass("ts-card-art-pending");
      expect(
        container.querySelector('[data-card-visual-state="flipping"]'),
      ).toBeInTheDocument();
      expect(plane).toHaveClass("ts-card-plane-flip");
      expect(plane).toHaveAttribute("data-reveal-sequence", "1");
    });

    fireEvent(plane as Element, new Event("animationend", { bubbles: true }));
    fireEvent(
      plane as Element,
      new Event("webkitAnimationEnd", { bubbles: true }),
    );

    await waitFor(() => {
      expect(
        container.querySelector('[data-card-visual-state="front"]'),
      ).toBeInTheDocument();
      expect(plane).toHaveClass("ts-card-plane-complete");
      expect(plane).not.toHaveClass("ts-card-plane-flip");
    });
  });

  it("keeps static art hidden until ready without replaying the reveal", async () => {
    const { container } = render(
      <div style={{ height: 112, position: "relative", width: 80 }}>
        <TarotCardArt cardId="the-star" cardName="The Star" />
      </div>,
    );
    const image = container.querySelector("img") as HTMLImageElement;

    expect(container.querySelector("[data-card-back]")).toBeVisible();
    expect(image).toHaveAttribute("data-art-ready", "false");
    expect(image).toHaveClass("ts-card-art-pending");

    fireEvent.load(image);

    await waitFor(() => {
      const readyImage = container.querySelector("img");
      const plane = container.querySelector("[data-card-plane]");

      expect(readyImage).toHaveAttribute("data-art-ready", "true");
      expect(readyImage).not.toHaveClass("ts-card-art-pending");
      expect(
        container.querySelector('[data-card-visual-state="front"]'),
      ).toBeInTheDocument();
      expect(plane).toHaveClass("ts-card-plane-complete");
      expect(plane).not.toHaveClass("ts-card-plane-flip");
      expect(plane).toHaveStyle({ animationName: "" });
    });
  });

  it("recovers when approved art loaded before the onLoad handler attached", async () => {
    Object.defineProperty(HTMLImageElement.prototype, "complete", {
      configurable: true,
      get: () => true,
    });
    Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", {
      configurable: true,
      get: () => 80,
    });

    const { container } = render(
      <TarotCardArt cardId="the-hermit" cardName="The Hermit" />,
    );

    await waitFor(() => {
      expect(
        container.querySelector('[data-art-id="the-hermit"]'),
      ).toHaveAttribute("data-art-ready", "true");
      expect(
        container.querySelector('[data-card-visual-state="front"]'),
      ).toBeInTheDocument();
    });
  });
});

function restoreImageProperty(
  property: "complete" | "naturalWidth",
  descriptor: PropertyDescriptor | undefined,
) {
  if (descriptor) {
    Object.defineProperty(HTMLImageElement.prototype, property, descriptor);
    return;
  }

  Reflect.deleteProperty(HTMLImageElement.prototype, property);
}
