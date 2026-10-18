import "@testing-library/jest-dom/vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleAnalytics } from "./GoogleAnalytics";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("GoogleAnalytics origin boundary", () => {
  afterEach(() => {
    cleanup();
    document
      .querySelectorAll('script[src*="googletagmanager.com"]')
      .forEach((script) => script.remove());
    Reflect.deleteProperty(window, "dataLayer");
    Reflect.deleteProperty(window, "gtag");
    Reflect.deleteProperty(window, "tarotSparkAnalyticsReady");
  });

  it("loads the tag and event bridge on the configured origin", async () => {
    render(
      <GoogleAnalytics
        allowedOrigin={window.location.origin}
        measurementId="G-ORIGIN1234"
      />,
    );
    await waitFor(() => {
      expect(window.tarotSparkAnalyticsReady).toBe(true);
      expect(
        document.querySelector('script[src*="googletagmanager.com"]'),
      ).not.toBeNull();
    });
    expect(
      (window.dataLayer ?? []).map((entry) => Array.from(entry as IArguments)),
    ).toContainEqual([
      "event",
      "page_view",
      expect.objectContaining({ send_to: "G-ORIGIN1234" }),
    ]);
  });

  it.each(["https://canonical.example", "http://localhost:9999", ""])(
    "loads neither the tag nor the event bridge on another or missing origin: %s",
    (allowedOrigin) => {
      render(
        <GoogleAnalytics
          allowedOrigin={allowedOrigin}
          measurementId="G-BLOCK1234"
        />,
      );
      window.dispatchEvent(
        new CustomEvent("tarot_spark_event", {
          detail: {
            name: "draw_start",
            payload: {
              locale: "en",
              topic_id: "love",
              spread_id: "quick",
              style_id: "balanced",
              draw_style_id: "balanced",
            },
          },
        }),
      );
      expect(
        document.querySelector('script[src*="googletagmanager.com"]'),
      ).toBeNull();
      expect(window.dataLayer).toBeUndefined();
      expect(window.tarotSparkAnalyticsReady).not.toBe(true);
    },
  );
});
