import { afterEach, describe, expect, it } from "vitest";
import {
  getAbsoluteAlternateLanguageUrls,
  getAbsoluteLocaleUrl,
  getShareSiteUrl,
  getSiteUrl,
  withLocalizedAlternates,
} from "./seo";

const originalSiteUrl = process.env["NEXT_PUBLIC_SITE_URL"];
const originalShareSiteUrl = process.env["NEXT_PUBLIC_SHARE_SITE_URL"];
const originalVercelProjectProductionUrl =
  process.env["VERCEL_PROJECT_PRODUCTION_URL"];
const originalVercelUrl = process.env["VERCEL_URL"];
const testSiteOrigin = "https://tarot-spark.example";

describe("i18n SEO", () => {
  afterEach(() => {
    restoreEnv("NEXT_PUBLIC_SITE_URL", originalSiteUrl);
    restoreEnv("NEXT_PUBLIC_SHARE_SITE_URL", originalShareSiteUrl);
    restoreEnv(
      "VERCEL_PROJECT_PRODUCTION_URL",
      originalVercelProjectProductionUrl,
    );
    restoreEnv("VERCEL_URL", originalVercelUrl);
  });

  it("falls back to the local origin when no site origin is configured", () => {
    delete process.env["NEXT_PUBLIC_SITE_URL"];
    delete process.env["VERCEL_PROJECT_PRODUCTION_URL"];
    delete process.env["VERCEL_URL"];

    expect(getSiteUrl().toString()).toBe("http://localhost:3000/");
    expect(getAbsoluteLocaleUrl("ko")).toBe("http://localhost:3000/ko");
  });

  it("normalizes configured site origins for locale urls", () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = `${testSiteOrigin}///?draft=true#top`;
    delete process.env["NEXT_PUBLIC_SHARE_SITE_URL"];
    delete process.env["VERCEL_PROJECT_PRODUCTION_URL"];
    delete process.env["VERCEL_URL"];

    expect(getSiteUrl().toString()).toBe(testSiteUrl());
    expect(getAbsoluteLocaleUrl("en")).toBe(testSiteUrl());
    expect(getAbsoluteLocaleUrl("ko")).toBe(testSiteUrl("/ko"));
  });

  it("uses the share origin override without changing canonical urls", () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = testSiteOrigin;
    process.env["NEXT_PUBLIC_SHARE_SITE_URL"] =
      "http://localhost:3000///?draft=true#top";
    delete process.env["VERCEL_PROJECT_PRODUCTION_URL"];
    delete process.env["VERCEL_URL"];

    expect(getSiteUrl().toString()).toBe(testSiteUrl());
    expect(getShareSiteUrl().toString()).toBe("http://localhost:3000/");
    expect(getAbsoluteLocaleUrl("ko")).toBe(testSiteUrl("/ko"));
  });

  it("falls back to the canonical origin when the share origin is unset", () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = testSiteOrigin;
    delete process.env["NEXT_PUBLIC_SHARE_SITE_URL"];
    delete process.env["VERCEL_PROJECT_PRODUCTION_URL"];
    delete process.env["VERCEL_URL"];

    expect(getShareSiteUrl().toString()).toBe(testSiteUrl());
  });

  it("falls back to the canonical origin when the share origin is invalid", () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = testSiteOrigin;
    process.env["NEXT_PUBLIC_SHARE_SITE_URL"] = "not-a-url";
    delete process.env["VERCEL_PROJECT_PRODUCTION_URL"];
    delete process.env["VERCEL_URL"];

    expect(getShareSiteUrl().toString()).toBe(testSiteUrl());
  });

  it("prefers Vercel's production origin over the deployment origin", () => {
    delete process.env["NEXT_PUBLIC_SITE_URL"];
    delete process.env["NEXT_PUBLIC_SHARE_SITE_URL"];
    process.env["VERCEL_PROJECT_PRODUCTION_URL"] = "tarot-spark.vercel.app";
    process.env["VERCEL_URL"] = "tarot-spark-e7dnbeeaa-tarotspark.vercel.app";

    expect(getAbsoluteLocaleUrl("ko")).toBe(
      "https://tarot-spark.vercel.app/ko",
    );
  });

  it("uses Vercel's deployment origin when no production origin is available", () => {
    delete process.env["NEXT_PUBLIC_SITE_URL"];
    delete process.env["NEXT_PUBLIC_SHARE_SITE_URL"];
    delete process.env["VERCEL_PROJECT_PRODUCTION_URL"];
    process.env["VERCEL_URL"] = "tarot-spark.vercel.app";

    expect(getAbsoluteLocaleUrl("ko")).toBe(
      "https://tarot-spark.vercel.app/ko",
    );
  });

  it("builds absolute alternate language urls", () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = testSiteOrigin;
    delete process.env["NEXT_PUBLIC_SHARE_SITE_URL"];
    delete process.env["VERCEL_PROJECT_PRODUCTION_URL"];
    delete process.env["VERCEL_URL"];

    expect(getAbsoluteAlternateLanguageUrls()).toEqual({
      en: testSiteUrl(),
      ko: testSiteUrl("/ko"),
      "x-default": testSiteUrl(),
    });
  });

  it("builds route-specific alternate language urls", () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = testSiteOrigin;
    delete process.env["NEXT_PUBLIC_SHARE_SITE_URL"];
    delete process.env["VERCEL_PROJECT_PRODUCTION_URL"];
    delete process.env["VERCEL_URL"];

    expect(
      getAbsoluteAlternateLanguageUrls((locale) =>
        locale === "en" ? "/privacy" : "/ko/privacy",
      ),
    ).toEqual({
      en: testSiteUrl("/privacy"),
      ko: testSiteUrl("/ko/privacy"),
      "x-default": testSiteUrl("/privacy"),
    });
  });

  it("adds canonical and hreflang metadata to localized pages", () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = testSiteOrigin;
    delete process.env["NEXT_PUBLIC_SHARE_SITE_URL"];
    delete process.env["VERCEL_PROJECT_PRODUCTION_URL"];
    delete process.env["VERCEL_URL"];

    expect(
      withLocalizedAlternates(
        {
          title: "Localized title",
          description: "Localized description",
        },
        "ko",
      ),
    ).toMatchObject({
      metadataBase: new URL(testSiteOrigin),
      alternates: {
        canonical: testSiteUrl("/ko"),
        languages: {
          en: testSiteUrl(),
          ko: testSiteUrl("/ko"),
          "x-default": testSiteUrl(),
        },
      },
    });
  });

  it("adds canonical and hreflang metadata to route-specific pages", () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = testSiteOrigin;
    delete process.env["NEXT_PUBLIC_SHARE_SITE_URL"];
    delete process.env["VERCEL_PROJECT_PRODUCTION_URL"];
    delete process.env["VERCEL_URL"];

    expect(
      withLocalizedAlternates(
        {
          title: "Privacy",
          description: "Privacy description",
        },
        "ko",
        (locale) => (locale === "en" ? "/privacy" : "/ko/privacy"),
      ),
    ).toMatchObject({
      metadataBase: new URL(testSiteOrigin),
      alternates: {
        canonical: testSiteUrl("/ko/privacy"),
        languages: {
          en: testSiteUrl("/privacy"),
          ko: testSiteUrl("/ko/privacy"),
          "x-default": testSiteUrl("/privacy"),
        },
      },
    });
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
