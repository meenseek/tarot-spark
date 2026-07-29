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
      "temperance",
    );
    expect(
      screen.getByRole("heading", { name: "Temperance" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "What would become easier if you gave it a slower rhythm?",
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
      "temperance",
    );
    expect(screen.getByRole("heading", { name: "절제" })).toBeInTheDocument();
    expect(
      screen.getByText("더 느린 리듬을 준다면 무엇이 쉬워질까요?"),
    ).toBeInTheDocument();
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
      "temperance",
    );

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(screen.getByTestId("daily-card")).toHaveAttribute(
      "data-card-id",
      "the-star",
    );
    expect(
      screen.getByText("What small sign of renewal is worth protecting?"),
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
