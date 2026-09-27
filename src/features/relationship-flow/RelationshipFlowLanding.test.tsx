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
        name: /if ai tarot answers feel generic/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "From drawing cards to an AI answer",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "What to ask your AI tool" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The prompt asks your AI tool to start/),
    ).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: "Draw three cards",
      }),
    ).toHaveAttribute("href", "/?topic=relationship-flow&style=relational");
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
      screen.getByRole("heading", { name: "What to check" }),
    ).toBeInTheDocument();
    const exampleHeadings = Array.from(
      screen
        .getByRole("heading", {
          name: /justice \+ queen of swords \+ six of pentacles/i,
        })
        .closest("section")
        ?.querySelectorAll("h3") ?? [],
    ).map((heading) => heading.textContent);
    expect(exampleHeadings.slice(0, 4)).toEqual([
      "Starting question",
      "What the cards suggest",
      "Card meanings",
      "How the cards connect",
    ]);
    expect(
      screen.getByRole("link", { name: "Draw six cards" }),
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
        name: /ai 타로 답변이 뻔하다면/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "카드 뽑기부터 AI 답변까지" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "AI에 요청할 답변" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/질문을 평소 쓰는 AI에 붙여 넣으면/)).toBeVisible();
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
