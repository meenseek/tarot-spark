import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RelationshipFlowLanding } from "./RelationshipFlowLanding";

describe("RelationshipFlowLanding", () => {
  afterEach(cleanup);

  it("presents a focused English guide and preconfigured CTA", () => {
    render(<RelationshipFlowLanding locale="en" />);

    expect(
      screen.getByRole("heading", {
        name: /see the relationship pattern without pretending/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", {
        name: "Start the relationship-flow spread",
      })[0],
    ).toHaveAttribute(
      "href",
      "/?topic=relationship-flow&spread=deep&style=relational",
    );
    expect(
      screen.getByText(/optional context stays in your browser/i),
    ).toBeInTheDocument();
  });

  it("keeps the Korean guide and locale switch canonical", () => {
    render(<RelationshipFlowLanding locale="ko" />);

    expect(
      screen.getByRole("heading", {
        name: /상대의 속마음을 단정하지 않고/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute(
      "href",
      "/relationship-flow",
    );
    expect(
      screen.getAllByRole("link", {
        name: "관계 흐름 스프레드 시작하기",
      })[0],
    ).toHaveAttribute(
      "href",
      "/ko?topic=relationship-flow&spread=deep&style=relational",
    );
  });
});
