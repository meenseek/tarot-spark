import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleAnalyticsEvents } from "./GoogleAnalyticsEvents";

vi.mock("next/navigation", () => ({
  usePathname: () => "/ko",
}));

describe("GoogleAnalyticsEvents", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, "gtag");
    Reflect.deleteProperty(window, "dataLayer");
  });

  it("sends page views with the active route", () => {
    const calls = mockGtag();

    render(<GoogleAnalyticsEvents measurementId="G-TEST1234" />);

    expect(calls).toContainEqual([
      "config",
      "G-TEST1234",
      expect.objectContaining({
        page_location: `${window.location.origin}/ko`,
        page_path: "/ko",
        send_page_view: true,
      }),
    ]);
  });

  it("forwards tarot behavior events to Google Analytics", () => {
    const calls = mockGtag();

    render(<GoogleAnalyticsEvents measurementId="G-TEST1234" />);
    window.dispatchEvent(
      new CustomEvent("tarot_spark_event", {
        detail: {
          name: "topic_click",
          payload: {
            locale: "ko",
            topic_id: "love",
          },
        },
      }),
    );

    expect(calls).toContainEqual([
      "event",
      "topic_click",
      {
        locale: "ko",
        topic_id: "love",
      },
    ]);
  });

  it("queues analytics calls before the Google script installs gtag", () => {
    render(<GoogleAnalyticsEvents measurementId="G-TEST1234" />);

    expect(window.dataLayer).toContainEqual([
      "config",
      "G-TEST1234",
      expect.objectContaining({
        page_path: "/ko",
      }),
    ]);
  });

  it("ignores malformed analytics events", () => {
    const calls = mockGtag();

    render(<GoogleAnalyticsEvents measurementId="G-TEST1234" />);
    window.dispatchEvent(
      new CustomEvent("tarot_spark_event", {
        detail: {
          name: "topic_click",
          payload: {
            locale: "ko",
            unsafe: {
              nested: true,
            },
          },
        },
      }),
    );

    expect(calls).not.toContainEqual([
      "event",
      "topic_click",
      expect.anything(),
    ]);
  });

  it("rejects free text even when it uses an allowed analytics key", () => {
    const calls = mockGtag();

    render(<GoogleAnalyticsEvents measurementId="G-TEST1234" />);
    window.dispatchEvent(
      new CustomEvent("tarot_spark_event", {
        detail: {
          name: "topic_click",
          payload: {
            locale: "ko",
            topic_id: "My private relationship context",
          },
        },
      }),
    );

    expect(calls).not.toContainEqual([
      "event",
      "topic_click",
      expect.anything(),
    ]);
  });
});

function mockGtag() {
  const calls: unknown[][] = [];
  window.gtag = (...args) => {
    calls.push([...args]);
  };
  return calls;
}
