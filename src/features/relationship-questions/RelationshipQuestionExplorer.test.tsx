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
        name: "카드 세 장 읽는 법 보기",
      }),
    ).toHaveAttribute("href", "/ko/three-card-tarot-reading");
    expect(
      screen.getByRole("heading", {
        name: "질문을 고른 뒤 카드를 읽는 순서",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "카드 세 장을 뽑은 뒤 완성된 질문을 복사해 평소 쓰는 AI에 붙여 넣으세요. 이름이나 개인 상황은 링크에 담기지 않습니다.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        "카드 뜻: 달의 불확실성, 소드 에이스의 분명한 대화, 펜타클 2의 조율을 함께 읽습니다. 이 뜻이 두 사람의 실제 생각을 증명하지는 않습니다.",
      ),
    ).toBeVisible();
    expect(
      screen.getAllByText(/상대가 나를 어떻게 보고, 내가 상대를 어떻게 보고/)
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/서로의 기대를 확신하지 못해 조심스러울 수 있습니다/)
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/두 해석의 범위:/)).toBeVisible();
    expect(
      screen.getByText(/두 해석을 버리고 질문을 다시 엽니다/),
    ).toBeVisible();
    expect(screen.getByText(/해석을 다시 볼 때:/)).toBeVisible();
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
      screen.getByText(
        "After drawing three cards, copy the finished prompt and paste it into an AI tool you use. Names and personal details are not put in the link.",
      ),
    ).toBeVisible();
    expect(
      screen.getAllByText(
        /how might the other person see me, and how might I see them/,
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/uncertainty about expectations keeps them cautious/)
        .length,
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

    expect(koExample).toMatch(/상대가 나를 어떻게 보고/u);
    expect(koExample).toMatch(/내가 상대를 어떻게 보고/u);
    expect(koExample).toMatch(/기대/u);
    expect(koExample).not.toMatch(/호감|연애적 끌림/u);
    expect(enExample).toMatch(/other person see me/iu);
    expect(enExample).toMatch(/I see them/iu);
    expect(enExample).toMatch(/expectations/iu);
    expect(enExample).not.toMatch(/attraction|romantic interest/iu);
    expect(ko.workedExampleItems[1]).toMatch(/^카드가 시사하는 답:/u);
    expect(en.workedExampleItems[1]).toMatch(/^What the cards suggest:/u);
  });

  it("keeps the first answer separate from two readings and compares both people's expectations", () => {
    const ko = getRelationshipQuestionExplorerShellCopy("ko");
    const en = getRelationshipQuestionExplorerShellCopy("en");

    expect(ko.methodSteps[3]).toMatch(/답을 먼저.*서로 다른 해석 두 가지/u);
    expect(ko.workedExampleItems[9]).toMatch(
      /두 사람이 말한 기대가 서로 비슷하고 이후 행동도 그 말과 맞으면/u,
    );
    expect(en.methodSteps[3]).toMatch(
      /answer.*first.*two different readings/iu,
    );
    expect(en.workedExampleItems[9]).toMatch(
      /both people describe similar expectations and later act in line with them/iu,
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
