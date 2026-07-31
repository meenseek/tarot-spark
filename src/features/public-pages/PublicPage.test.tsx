import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PublicPage, getPublicPageMetadata, getPublicPagePath } from ".";

const originalSiteUrl = process.env["NEXT_PUBLIC_SITE_URL"];
const testSiteOrigin = "https://tarot-spark.example";

describe("PublicPage", () => {
  afterEach(() => {
    cleanup();
    restoreEnv("NEXT_PUBLIC_SITE_URL", originalSiteUrl);
  });

  it("renders English privacy content and public navigation", () => {
    render(<PublicPage locale="en" pageId="privacy" />);

    expect(
      screen.getByRole("heading", {
        name: "Privacy Policy",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/does not require an account/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Google AdSense and its partners/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      "/about",
    );
    expect(screen.getByRole("link", { name: "한국어" })).toHaveAttribute(
      "href",
      "/ko/privacy",
    );
  });

  it("renders Korean disclaimer content", () => {
    render(<PublicPage locale="ko" pageId="disclaimer" />);

    expect(
      screen.getByRole("heading", {
        name: "면책 고지",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/전문가의 판단이 필요한 일/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute(
      "href",
      "/disclaimer",
    );
  });

  it("states the Korean privacy boundaries without overstating optional services", () => {
    render(<PublicPage locale="ko" pageId="privacy" />);

    expect(screen.getByText(/계정을 만들 필요가 없습니다/i)).toBeVisible();
    expect(screen.getByText(/같은 탭에서 최대 60초 동안/i)).toBeVisible();
    expect(
      screen.getByText(/클립보드에 복사하는 것만으로는 외부 서비스/i),
    ).toBeVisible();
    expect(
      screen.getByText(/유효한 측정 ID가 설정되어 있고.*허용한 경우에만/i),
    ).toBeVisible();
    expect(
      screen.getByText(
        /기능 사용 이벤트와 함께 보내는 값은.*직접 적은 상황 설명이나.*포함하지 않습니다/i,
      ),
    ).toBeVisible();
    expect(screen.getByText(/Vercel에서 호스팅될 수 있습니다/i)).toBeVisible();
    expect(screen.getByText(/별도의 광고 스크립트 설정/i)).toBeVisible();
    expect(
      screen.getByText(/\/relationship-flow, \/ko\/relationship-flow/i),
    ).toBeVisible();
    expect(
      screen.getByText(/브라우저가 로컬 저장소를 지원하면/i),
    ).toBeVisible();
  });

  it("keeps metadata and paths localized", () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = testSiteOrigin;

    expect(getPublicPageMetadata("en", "contact")).toMatchObject({
      title: "Contact tarot-spark",
      alternates: {
        canonical: testSiteUrl("/contact"),
        languages: {
          en: testSiteUrl("/contact"),
          ko: testSiteUrl("/ko/contact"),
          "x-default": testSiteUrl("/contact"),
        },
      },
    });
    expect(getPublicPageMetadata("ko", "contact")).toMatchObject({
      title: "tarot-spark 문의",
      alternates: {
        canonical: testSiteUrl("/ko/contact"),
        languages: {
          en: testSiteUrl("/contact"),
          ko: testSiteUrl("/ko/contact"),
          "x-default": testSiteUrl("/contact"),
        },
      },
    });
    expect(getPublicPagePath("en", "contact")).toBe("/contact");
    expect(getPublicPagePath("ko", "contact")).toBe("/ko/contact");
  });
});

function testSiteUrl(pathname = "/") {
  return new URL(pathname, testSiteOrigin).toString();
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
