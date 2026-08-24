import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { GoogleConsentModeDefaults } from "./GoogleConsentModeDefaults";

describe("GoogleConsentModeDefaults", () => {
  afterEach(cleanup);

  it("grants globally and denies EEA, UK, and Swiss consent before Google tags", () => {
    render(<GoogleConsentModeDefaults />);

    const script = document.querySelector("#google-consent-mode-defaults");
    const source = script?.textContent ?? "";

    expect(script).toBeInTheDocument();
    const restrictedRegions = [
      "AT",
      "BE",
      "BG",
      "CH",
      "CY",
      "CZ",
      "DE",
      "DK",
      "EE",
      "ES",
      "FI",
      "FR",
      "GB",
      "GR",
      "HR",
      "HU",
      "IE",
      "IS",
      "IT",
      "LI",
      "LT",
      "LU",
      "LV",
      "MT",
      "NL",
      "NO",
      "PL",
      "PT",
      "RO",
      "SE",
      "SI",
      "SK",
    ];

    expect(source).toContain(`region: ${JSON.stringify(restrictedRegions)}`);

    for (const signal of [
      "analytics_storage",
      "ad_storage",
      "ad_user_data",
      "ad_personalization",
    ]) {
      expect(source.indexOf(`${signal}: 'granted'`)).toBeLessThan(
        source.indexOf(`${signal}: 'denied'`),
      );
      expect(
        source.match(new RegExp(`${signal}: 'granted'`, "g")),
      ).toHaveLength(1);
      expect(source.match(new RegExp(`${signal}: 'denied'`, "g"))).toHaveLength(
        1,
      );
    }

    expect(source).toContain("wait_for_update: 500");
    expect(source).toContain("window.gtag('set', 'ads_data_redaction', true)");
  });
});
