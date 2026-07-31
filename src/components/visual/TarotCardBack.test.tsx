import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TarotCardBack } from "./TarotCardBack";

describe("TarotCardBack", () => {
  afterEach(cleanup);

  it("renders one decorative full-frame celestial pattern", () => {
    const { container } = render(
      <TarotCardBack className="absolute inset-0 h-full w-full" />,
    );
    const cardBack = container.querySelector("[data-card-back]");

    expect(cardBack).toBeInTheDocument();
    expect(cardBack).toHaveAttribute("aria-hidden", "true");
    expect(cardBack).toHaveAttribute(
      "data-card-back-pattern",
      "quiet-celestial-medallion",
    );
    expect(cardBack).toHaveAttribute("viewBox", "0 0 80 112");
    expect(cardBack).toHaveClass("absolute", "inset-0", "h-full", "w-full");
    expect(
      cardBack?.querySelector("[data-card-back-medallion]"),
    ).toBeInTheDocument();
    expect(
      cardBack?.querySelector("[data-card-back-ornament]"),
    ).toBeInTheDocument();
  });
});
