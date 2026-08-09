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
      <TarotCardArt cardId={undefined} retryLabel="Try again" />,
    );

    expect(
      container.querySelector('[data-card-visual-state="prepared"]'),
    ).toBeVisible();
    expect(container.querySelector("[data-card-back]")).toBeVisible();
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(
      container.querySelector("[data-card-art-retry]"),
    ).not.toBeInTheDocument();
  });

  it("keeps the back visible and offers localized retry after an error", async () => {
    const { container, getByRole } = render(
      <TarotCardArt
        cardId="the-fool"
        retryLabel="다시 시도하기"
        revealSequence={1}
        shouldReveal
      />,
    );
    const image = container.querySelector("img") as HTMLImageElement;
    const plane = container.querySelector("[data-card-plane]");

    fireEvent.error(image);

    await waitFor(() => {
      expect(
        container.querySelector('[data-card-visual-state="error"]'),
      ).toBeInTheDocument();
      expect(container.querySelector("[data-card-back]")).toBeVisible();
      expect(getByRole("button", { name: "다시 시도하기" })).toBeVisible();
      expect(plane).not.toHaveClass("ts-card-plane-flip");
    });
  });

  it("makes a new load attempt and reveals only after retry succeeds", async () => {
    const { container, getByRole } = render(
      <TarotCardArt
        cardId="the-fool"
        retryLabel="Try again"
        revealSequence={1}
        shouldReveal
      />,
    );
    const firstImage = container.querySelector("img") as HTMLImageElement;

    fireEvent.error(firstImage);
    fireEvent.click(getByRole("button", { name: "Try again" }));

    const retryImage = container.querySelector("img") as HTMLImageElement;
    expect(retryImage).not.toBe(firstImage);
    expect(
      container.querySelector('[data-card-visual-state="pending"]'),
    ).toBeInTheDocument();
    expect(container.querySelector("[data-card-back]")).toBeVisible();
    expect(container.querySelector("[data-card-plane]")).not.toHaveClass(
      "ts-card-plane-flip",
    );

    fireEvent.load(retryImage);

    await waitFor(() => {
      expect(
        container.querySelector('[data-card-visual-state="flipping"]'),
      ).toBeInTheDocument();
      expect(container.querySelector("[data-card-plane]")).toHaveClass(
        "ts-card-plane-flip",
      );
      expect(
        container.querySelector("[data-card-art-retry]"),
      ).not.toBeInTheDocument();
    });
  });

  it("does not carry an earlier failure to a different card", () => {
    const { container, rerender } = render(
      <TarotCardArt cardId="the-fool" retryLabel="Try again" />,
    );

    fireEvent.error(container.querySelector("img") as HTMLImageElement);
    rerender(<TarotCardArt cardId="the-lovers" retryLabel="Try again" />);

    expect(container.querySelector('[data-art-id="the-lovers"]')).toBeVisible();
    expect(
      container.querySelector('[data-card-visual-state="pending"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector("[data-card-art-retry]"),
    ).not.toBeInTheDocument();
    expect(container.querySelector("[data-card-back]")).toBeVisible();
  });

  it("keeps the card back visible until a ready face begins one flip", async () => {
    const { container } = render(
      <div style={{ height: 112, position: "relative", width: 80 }}>
        <TarotCardArt
          cardId="the-fool"
          retryLabel="Try again"
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
        <TarotCardArt cardId="the-star" retryLabel="Try again" />
      </div>,
    );
    const image = container.querySelector("img") as HTMLImageElement;

    expect(container.querySelector("[data-card-back]")).toBeVisible();
    expect(image).toHaveAttribute("data-art-ready", "false");
    fireEvent.load(image);

    await waitFor(() => {
      const plane = container.querySelector("[data-card-plane]");

      expect(
        container.querySelector('[data-card-visual-state="front"]'),
      ).toBeInTheDocument();
      expect(plane).toHaveClass("ts-card-plane-complete");
      expect(plane).not.toHaveClass("ts-card-plane-flip");
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
      <TarotCardArt cardId="the-hermit" retryLabel="Try again" />,
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
