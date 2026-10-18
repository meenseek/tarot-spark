import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { OptionalGoogleServices } from "./OptionalGoogleServices";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

const originalAnalyticsId = process.env["NEXT_PUBLIC_GA_ID"];
const originalSiteUrl = process.env["NEXT_PUBLIC_SITE_URL"];
const originalAdvertisingId = process.env["NEXT_PUBLIC_ADSENSE_CLIENT_ID"];
const originalAdvertisingScriptEnabled =
  process.env["NEXT_PUBLIC_ADSENSE_SCRIPT_ENABLED"];

describe("OptionalGoogleServices", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document
      .querySelectorAll('script[src*="googletagmanager.com"]')
      .forEach((script) => script.remove());
    Reflect.deleteProperty(window, "dataLayer");
    Reflect.deleteProperty(window, "gtag");
    Reflect.deleteProperty(window, "tarotSparkAnalyticsReady");
    restoreEnvironmentVariable("NEXT_PUBLIC_GA_ID", originalAnalyticsId);
    restoreEnvironmentVariable("NEXT_PUBLIC_SITE_URL", originalSiteUrl);
    restoreEnvironmentVariable(
      "NEXT_PUBLIC_ADSENSE_CLIENT_ID",
      originalAdvertisingId,
    );
    restoreEnvironmentVariable(
      "NEXT_PUBLIC_ADSENSE_SCRIPT_ENABLED",
      originalAdvertisingScriptEnabled,
    );
  });

  it.each(["", "UA-1234", "G-INVALID ID", "not-a-measurement-id"])(
    "fails closed for malformed Google Analytics id %j",
    (measurementId) => {
      process.env["NEXT_PUBLIC_GA_ID"] = measurementId;
      disableAdvertising();

      render(
        <OptionalGoogleServices locale="ko">
          <main>카드 리딩</main>
        </OptionalGoogleServices>,
      );

      expect(screen.getByRole("main")).toHaveTextContent("카드 리딩");
      expect(
        screen.queryByRole("heading", { name: "선택 서비스 설정" }),
      ).toBeNull();
      expect(
        document.querySelector('script[src*="googletagmanager.com"]'),
      ).toBeNull();
    },
  );

  it("offers analytics only when the measurement id is valid", async () => {
    process.env["NEXT_PUBLIC_GA_ID"] = "G-TEST1234";
    process.env["NEXT_PUBLIC_SITE_URL"] = window.location.origin;
    disableAdvertising();

    render(
      <OptionalGoogleServices locale="ko">
        <main>카드 리딩</main>
        <SiteFooter ariaLabel="페이지 탐색" links={[]} />
      </OptionalGoogleServices>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "개인정보 설정" }),
    );

    expect(
      screen.getByRole("heading", { name: "선택 서비스 설정" }),
    ).toBeVisible();
    expect(
      screen.getByRole("checkbox", { name: /서비스 이용 분석/ }),
    ).toBeChecked();
    expect(screen.queryByRole("checkbox", { name: /광고/ })).toBeNull();
    expect(
      document.querySelector('script[src*="googletagmanager.com"]'),
    ).not.toBeNull();
    expect(
      window.localStorage.getItem("tarot-spark.optional-services-consent"),
    ).toBeNull();
  });

  it("does not send analytics from an alternate deployment origin", async () => {
    process.env["NEXT_PUBLIC_GA_ID"] = "G-ALTERNATE1234";
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://canonical.example";
    disableAdvertising();
    window.localStorage.setItem(
      "tarot-spark.optional-services-consent",
      JSON.stringify({ analytics: true, advertising: false }),
    );
    render(
      <OptionalGoogleServices locale="ko">
        <main>카드 리딩</main>
        <SiteFooter ariaLabel="페이지 탐색" links={[]} />
      </OptionalGoogleServices>,
    );
    await screen.findByRole("button", { name: "개인정보 설정" });
    expect(
      document.querySelector('script[src*="googletagmanager.com"]'),
    ).toBeNull();
    expect(window.tarotSparkAnalyticsReady).not.toBe(true);
    expect(
      window.localStorage.getItem("tarot-spark.optional-services-consent"),
    ).toBe(JSON.stringify({ analytics: true, advertising: false }));
  });
});

function disableAdvertising() {
  Reflect.deleteProperty(process.env, "NEXT_PUBLIC_ADSENSE_CLIENT_ID");
  Reflect.deleteProperty(process.env, "NEXT_PUBLIC_ADSENSE_SCRIPT_ENABLED");
}

function restoreEnvironmentVariable(key: string, value: string | undefined) {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, key);
    return;
  }

  process.env[key] = value;
}
