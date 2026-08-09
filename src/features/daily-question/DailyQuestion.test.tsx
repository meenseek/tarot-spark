import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicPageLinks } from "@/features/public-pages";
import { getTarotData } from "@/i18n/tarot-data";
import { DailyQuestion } from "./DailyQuestion";
import { DailyQuestionClient } from "./DailyQuestionClient";
import { getDailyQuestionCopy, getDailyQuestionMetadata } from "./i18n";

const originalSiteUrl = process.env["NEXT_PUBLIC_SITE_URL"];

describe("DailyQuestion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 28, 12));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();

    if (originalSiteUrl === undefined) {
      Reflect.deleteProperty(process.env, "NEXT_PUBLIC_SITE_URL");
    } else {
      process.env["NEXT_PUBLIC_SITE_URL"] = originalSiteUrl;
    }
  });

  it("server-renders a neutral placeholder before the local date is known", () => {
    const html = renderToString(
      <DailyQuestionClient
        copy={getDailyQuestionCopy("en")}
        locale="en"
        publicPageLinks={getPublicPageLinks("en")}
        publicPageNavigationLabel="Public pages"
        tarotData={getTarotData("en")}
      />,
    );

    expect(html).toContain("Finding today&#x27;s reflection...");
    expect(html).toContain('data-testid="daily-placeholder"');
    expect(html).not.toContain('data-testid="daily-card"');
  });

  it("reveals the deterministic English card and reflection after hydration", () => {
    render(<DailyQuestion locale="en" />);

    expect(screen.getByTestId("daily-card")).toHaveAttribute(
      "data-card-id",
      "swords-8",
    );
    expect(
      screen.getByRole("heading", { name: "Eight of Swords" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "What assumption may be narrowing your choices more than necessary?",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "한국어" })).toHaveAttribute(
      "href",
      "/ko/daily",
    );
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });

  it("keeps the stable card id while localizing the Korean experience", () => {
    render(<DailyQuestion locale="ko" />);

    expect(screen.getByTestId("daily-card")).toHaveAttribute(
      "data-card-id",
      "swords-8",
    );
    expect(screen.getByRole("heading", { name: "소드 8" })).toBeInTheDocument();
    expect(
      screen.getByText("내 선택을 실제보다 좁게 만드는 가정은 무엇인가요?"),
    ).toBeInTheDocument();
    expect(screen.getByText(/재정·투자·정신 건강/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute(
      "href",
      "/daily",
    );
  });

  it("refreshes the card after the browser-local date crosses midnight", () => {
    vi.setSystemTime(new Date(2026, 6, 28, 23, 59, 59, 900));
    render(<DailyQuestion locale="en" />);

    expect(screen.getByTestId("daily-card")).toHaveAttribute(
      "data-card-id",
      "swords-8",
    );

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(screen.getByTestId("daily-card")).toHaveAttribute(
      "data-card-id",
      "cups-7",
    );
    expect(
      screen.getByText(
        "What criterion can separate an appealing option from a suitable one?",
      ),
    ).toBeInTheDocument();
  });

  it("does not emit 3-card funnel analytics events", () => {
    const events: unknown[] = [];
    const listener = (event: Event) => {
      events.push((event as CustomEvent).detail);
    };
    window.addEventListener("tarot_spark_event", listener);

    try {
      render(<DailyQuestion locale="en" />);
      expect(screen.getByTestId("daily-card")).toBeInTheDocument();

      expect(events).toEqual([]);
    } finally {
      window.removeEventListener("tarot_spark_event", listener);
    }
  });

  it("publishes localized noindex metadata for the experiment route", () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://example.com";

    expect(getDailyQuestionMetadata("en")).toMatchObject({
      alternates: {
        canonical: "https://example.com/daily",
        languages: {
          en: "https://example.com/daily",
          ko: "https://example.com/ko/daily",
          "x-default": "https://example.com/daily",
        },
      },
      robots: {
        follow: true,
        index: false,
      },
    });
  });
});
