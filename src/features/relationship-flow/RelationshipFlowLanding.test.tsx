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
      screen.getByRole("link", {
        name: "Start with three cards",
      }),
    ).toHaveAttribute("href", "/?topic=relationship-flow&style=relational");
    expect(
      screen.getByRole("heading", {
        name: /justice \+ queen of swords \+ six of pentacles/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Observable discriminator" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open the six-card spread" }),
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
        name: /상대의 속마음을 맞히려 하지 않고/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute(
      "href",
      "/relationship-flow",
    );
    expect(
      screen.getByRole("link", {
        name: "세 장으로 시작하기",
      }),
    ).toHaveAttribute("href", "/ko?topic=relationship-flow&style=relational");
  });

  it("preserves only a typed attribution pair through locale and generator links", () => {
    render(
      <RelationshipFlowLanding
        attribution={{ campaignId: "topic-guide", sourceId: "naver" }}
        locale="ko"
      />,
    );

    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute(
      "href",
      "/relationship-flow?source=naver&campaign=topic-guide",
    );
    expect(
      screen.getByRole("link", {
        name: "세 장으로 시작하기",
      }),
    ).toHaveAttribute(
      "href",
      "/ko?topic=relationship-flow&style=relational&source=naver&campaign=topic-guide",
    );
  });
});
