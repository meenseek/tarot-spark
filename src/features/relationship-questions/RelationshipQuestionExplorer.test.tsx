import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  getRelationshipQuestionCatalog,
  getRelationshipQuestionExplorerMetadata,
  RelationshipQuestionExplorer,
} from ".";

describe("RelationshipQuestionExplorer", () => {
  afterEach(cleanup);

  it("renders seven Korean categories and 28 generator-ready questions", () => {
    const { container } = render(<RelationshipQuestionExplorer locale="ko" />);

    expect(
      screen.getByRole("heading", {
        name: "그 사람과 나 사이, 무엇을 물어보면 좋을까요?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "그 사람과 나는 서로를 어떻게 보고 있을까?",
      }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('a[href*="question="]')).toHaveLength(28);
    expect(screen.getAllByText("이 질문으로 살펴볼 것")).toHaveLength(28);
    expect(
      screen.getByRole("link", { name: "서로에 대한 기대 보기" }),
    ).toHaveAttribute("href", "/ko?topic=feelings&question=mutual-view");
    expect(
      screen.getByText(
        /내가 상대에게 기대하는 모습, 상대가 행동으로 보여준 신호/,
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: "카드별 근거와 연결을 읽는 3장 해석 가이드",
      }),
    ).toHaveAttribute("href", "/ko/three-card-tarot-reading");

    const catalog = getRelationshipQuestionCatalog("ko");
    expect(catalog.categories).toHaveLength(7);
    expect(catalog.questions).toHaveLength(28);
  });

  it("keeps the English page equivalent and localized", () => {
    render(<RelationshipQuestionExplorer locale="en" />);

    expect(
      screen.getByRole("heading", {
        name: "What should I ask about this person and our relationship?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Explore mutual expectations" }),
    ).toHaveAttribute("href", "/?topic=feelings&question=mutual-view");
    expect(screen.getByRole("link", { name: "한국어" })).toHaveAttribute(
      "href",
      "/ko/relationship-tarot-questions",
    );
  });

  it("publishes canonical and alternate metadata for both locales", () => {
    expect(getRelationshipQuestionExplorerMetadata("ko")).toMatchObject({
      alternates: {
        canonical: "http://localhost:3000/ko/relationship-tarot-questions",
        languages: {
          en: "http://localhost:3000/relationship-tarot-questions",
          ko: "http://localhost:3000/ko/relationship-tarot-questions",
          "x-default": "http://localhost:3000/relationship-tarot-questions",
        },
      },
    });
  });
});
