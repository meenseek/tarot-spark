import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  PublicQuestionExplorer,
  getPublicQuestionCatalog,
  getPublicQuestionExplorerMetadata,
  getPublicQuestionPath,
  getPublicQuestionReadingPath,
} from ".";

describe("PublicQuestionExplorer", () => {
  afterEach(cleanup);

  it("server-renders all 62 questions in three life areas", () => {
    const { container } = render(<PublicQuestionExplorer locale="ko" />);
    const catalog = getPublicQuestionCatalog("ko");
    const disclosures = Array.from(
      container.querySelectorAll<HTMLDetailsElement>(
        '[data-testid="question-category"]',
      ),
    );

    expect(
      screen.getByRole("heading", {
        name: "지금 확인할 일이 선명해지는 타로 질문을 골라보세요.",
      }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("[data-question-domain]")).toHaveLength(
      3,
    );
    expect(disclosures).toHaveLength(18);
    expect(disclosures.map(({ id }) => id)).toEqual(
      catalog.groups.map(({ id }) => id),
    );
    expect(disclosures.filter(({ open }) => open)).toHaveLength(1);
    expect(disclosures[0]).toHaveAttribute("open");
    expect(container.querySelectorAll('a[href*="question="]')).toHaveLength(62);
    expect(screen.getByRole("link", { name: "소비 구분하기" })).toHaveAttribute(
      "href",
      "/ko?topic=money-life&question=money-want-or-need",
    );
    expect(
      screen.getAllByText(/돈 질문은 수입·가격·대출·빚·투자 수익/),
    ).toHaveLength(2);
    expect(
      screen.getByText(/카드상 답, 서로 다른 해석 두 가지, 현실 확인/),
    ).toBeInTheDocument();
  });

  it("keeps English paths, locale switch, and fragments canonical", () => {
    const { container } = render(<PublicQuestionExplorer locale="en" />);
    const question = getPublicQuestionCatalog("en").questions.find(
      ({ id }) => id === "project-pause-signal",
    )!;

    expect(getPublicQuestionPath("en")).toBe("/tarot-questions");
    expect(getPublicQuestionPath("ko")).toBe("/ko/tarot-questions");
    expect(getPublicQuestionReadingPath("en", question)).toBe(
      "/?topic=study-projects&question=project-pause-signal",
    );
    expect(screen.getByRole("link", { name: "한국어" })).toHaveAttribute(
      "href",
      "/ko/tarot-questions",
    );
    expect(container.querySelector("#values-decisions")).not.toBeNull();
    expect(container.querySelector("#project-momentum")).not.toBeNull();
    expect(container.querySelector("#domain-self")).not.toBeNull();
  });

  it("publishes localized canonical and alternate metadata", () => {
    for (const locale of ["en", "ko"] as const) {
      const metadata = getPublicQuestionExplorerMetadata(locale);
      const localizedPath =
        locale === "ko" ? "/ko/tarot-questions" : "/tarot-questions";

      expect(metadata).toMatchObject({
        alternates: {
          canonical: `http://localhost:3000${localizedPath}`,
          languages: {
            en: "http://localhost:3000/tarot-questions",
            ko: "http://localhost:3000/ko/tarot-questions",
            "x-default": "http://localhost:3000/tarot-questions",
          },
        },
        openGraph: {
          description: metadata.description,
          images: [
            {
              height: 630,
              url: "http://localhost:3000/brand/tarot-spark-social-card.png",
              width: 1200,
            },
          ],
          locale: locale === "ko" ? "ko_KR" : "en_US",
          title: metadata.title,
          url: `http://localhost:3000${localizedPath}`,
        },
        twitter: {
          card: "summary_large_image",
          description: metadata.description,
          title: metadata.title,
        },
      });
    }
  });

  it("moves the shared footer question link to the generic catalog", () => {
    render(<PublicQuestionExplorer locale="en" />);

    expect(
      screen.getByRole("link", { name: "Tarot questions" }),
    ).toHaveAttribute("href", "/tarot-questions");
    expect(
      screen.queryByRole("link", { name: "Relationship tarot questions" }),
    ).not.toBeInTheDocument();
  });
});
