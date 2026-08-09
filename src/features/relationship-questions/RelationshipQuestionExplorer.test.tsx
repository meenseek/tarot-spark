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
        name: "여섯 단계를 전체 카드 예시로 읽는 3장 해석 가이드",
      }),
    ).toHaveAttribute("href", "/ko/three-card-tarot-reading");
    expect(
      screen.getByRole("heading", {
        name: "호기심을 완결된 리딩으로 바꾸는 여섯 단계",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "상징적 해석 재료: 달의 불확실성, 소드 에이스의 명료한 대화, 펜타클 2의 조율을 모두 사용합니다. 이 의미들은 상대의 감정을 증명하지 않습니다.",
      ),
    ).toBeVisible();
    expect(screen.getByText(/가설의 범위:/)).toBeVisible();
    expect(screen.getByText(/둘 다 버리고 질문을 다시 엽니다/)).toBeVisible();
    expect(screen.getByText(/수정 조건:/)).toBeVisible();
    expect(screen.getByText(/성찰 질문:/)).toBeVisible();

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
