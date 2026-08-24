import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  getRelationshipQuestionCatalog,
  getRelationshipQuestionExplorerMetadata,
  getRelationshipQuestionExplorerShellCopy,
  RelationshipQuestionExplorer,
} from ".";

describe("RelationshipQuestionExplorer", () => {
  afterEach(cleanup);

  it("renders seven Korean categories and 30 generator-ready questions", () => {
    const { container } = render(<RelationshipQuestionExplorer locale="ko" />);

    expect(
      screen.getByRole("heading", {
        name: "그 사람과 나 사이, 무엇을 물어보면 좋을까요?",
      }),
    ).toBeInTheDocument();
    const categoryDisclosures = Array.from(
      container.querySelectorAll<HTMLDetailsElement>(
        '[data-testid="question-category"]',
      ),
    );
    const catalog = getRelationshipQuestionCatalog("ko");

    expect(categoryDisclosures).toHaveLength(7);
    expect(categoryDisclosures.map(({ id }) => id)).toEqual(
      catalog.categories.map(({ id }) => id),
    );
    expect(categoryDisclosures.filter(({ open }) => open)).toHaveLength(1);
    expect(categoryDisclosures[0]).toHaveAttribute("open");
    expect(container.querySelectorAll('a[href*="question="]')).toHaveLength(30);
    expect(
      container.querySelector('a[href*="question=mutual-view"]'),
    ).toHaveTextContent("서로의 기대 보기");

    const perceptionCategory =
      container.querySelector<HTMLDetailsElement>("#perception");
    expect(perceptionCategory).not.toBeNull();
    fireEvent.click(
      perceptionCategory?.querySelector("summary") as HTMLElement,
    );
    expect(perceptionCategory).toHaveAttribute("open");
    expect(
      screen.getByRole("link", { name: "서로의 기대 보기" }),
    ).toBeVisible();
    expect(container).not.toHaveTextContent(
      catalog.questions.find(({ id }) => id === "mutual-view")?.focus ?? "",
    );
    expect(
      screen.getByRole("heading", { name: "가능성을 읽는 질문" }),
    ).toBeInTheDocument();
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
        "상징적 해석 재료: 달의 불확실성, 소드 에이스의 명료한 대화, 펜타클 2의 조율을 모두 사용합니다. 이 의미들은 어느 쪽의 실제 생각도 증명하지 않습니다.",
      ),
    ).toBeVisible();
    expect(
      screen.getAllByText(/상대가 나를 보는 시선과 내가 상대를 보는 시선/)
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/두 사람의 기대가 어디에서 맞거나 어긋날 수 있는지/)
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/가설의 범위:/)).toBeVisible();
    expect(screen.getByText(/둘 다 버리고 질문을 다시 엽니다/)).toBeVisible();
    expect(screen.getByText(/수정 조건:/)).toBeVisible();
    expect(screen.getByText(/성찰 질문:/)).toBeVisible();

    expect(catalog.categories).toHaveLength(7);
    expect(catalog.questions).toHaveLength(30);
  });

  it("keeps the English page equivalent and localized", () => {
    const { container } = render(<RelationshipQuestionExplorer locale="en" />);

    expect(
      screen.getByRole("heading", {
        name: "What should I ask about this person and our relationship?",
      }),
    ).toBeInTheDocument();
    expect(
      container.querySelector('a[href*="question=mutual-view"]'),
    ).toHaveTextContent("Read our views");
    expect(screen.getByRole("link", { name: "한국어" })).toHaveAttribute(
      "href",
      "/ko/relationship-tarot-questions",
    );
    expect(
      screen.getAllByText(
        /how the other person may see me and how I may see them/,
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/where our expectations may align or diverge/).length,
    ).toBeGreaterThan(0);
  });

  it("keeps the mutual-view example focused on reciprocal views, not added attraction", () => {
    const ko = getRelationshipQuestionExplorerShellCopy("ko");
    const en = getRelationshipQuestionExplorerShellCopy("en");
    const koExample = [ko.workedExampleBody, ...ko.workedExampleItems].join(
      "\n",
    );
    const enExample = [en.workedExampleBody, ...en.workedExampleItems].join(
      "\n",
    );

    expect(koExample).toMatch(/상대가 나를 보는 시선/u);
    expect(koExample).toMatch(/내가 상대를 보는 시선/u);
    expect(koExample).toMatch(/기대/u);
    expect(koExample).not.toMatch(/호감|연애적 끌림/u);
    expect(enExample).toMatch(/other person may see me/iu);
    expect(enExample).toMatch(/I may see them/iu);
    expect(enExample).toMatch(/expectations/iu);
    expect(enExample).not.toMatch(/attraction|romantic interest/iu);
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
