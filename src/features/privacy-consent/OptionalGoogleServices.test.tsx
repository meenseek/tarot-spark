import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OptionalGoogleServices } from "./OptionalGoogleServices";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

const originalAnalyticsId = process.env["NEXT_PUBLIC_GA_ID"];
const originalAdvertisingId = process.env["NEXT_PUBLIC_ADSENSE_CLIENT_ID"];
const originalAdvertisingScriptEnabled =
  process.env["NEXT_PUBLIC_ADSENSE_SCRIPT_ENABLED"];

describe("OptionalGoogleServices", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    restoreEnvironmentVariable("NEXT_PUBLIC_GA_ID", originalAnalyticsId);
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
    disableAdvertising();

    render(
      <OptionalGoogleServices locale="ko">
        <main>카드 리딩</main>
      </OptionalGoogleServices>,
    );

    expect(
      await screen.findByRole("heading", { name: "선택 서비스 설정" }),
    ).toBeVisible();
    expect(
      screen.getByRole("checkbox", { name: /서비스 이용 분석/ }),
    ).toBeVisible();
    expect(screen.queryByRole("checkbox", { name: /광고/ })).toBeNull();
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
