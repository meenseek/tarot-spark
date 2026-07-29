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
    expect(screen.getByText(/자격을 갖춘 전문가/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute(
      "href",
      "/disclaimer",
    );
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
