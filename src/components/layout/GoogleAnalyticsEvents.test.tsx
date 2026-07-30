import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  runWhenAnalyticsReady,
  trackEvent,
} from "@/features/tarot-reading/analytics";
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

  it("forwards allowlisted share outcomes and rejects unknown outcomes", () => {
    const calls = mockGtag();
    const payload = {
      locale: "ko",
      topic_id: "love",
      spread_id: "quick",
      style_id: "balanced",
      card_count: 3,
      method: "native",
    };

    render(<GoogleAnalyticsEvents measurementId="G-TEST1234" />);
    window.dispatchEvent(
      new CustomEvent("tarot_spark_event", {
        detail: {
          name: "share_result",
          payload: { ...payload, outcome: "shared" },
        },
      }),
    );
    window.dispatchEvent(
      new CustomEvent("tarot_spark_event", {
        detail: {
          name: "share_result",
          payload: { ...payload, outcome: "private free text" },
        },
      }),
    );

    expect(calls).toContainEqual([
      "event",
      "share_result",
      { ...payload, outcome: "shared" },
    ]);
    expect(calls).not.toContainEqual([
      "event",
      "share_result",
      { ...payload, outcome: "private free text" },
    ]);
  });

  it("accepts only complete allowlisted attribution", () => {
    const calls = mockGtag();
    const payload = {
      locale: "ko",
      topic_id: "love",
      spread_id: "quick",
      style_id: "balanced",
      card_count: 3,
    };

    render(<GoogleAnalyticsEvents measurementId="G-TEST1234" />);
    window.dispatchEvent(
      new CustomEvent("tarot_spark_event", {
        detail: {
          name: "result_view",
          payload: {
            ...payload,
            source: "instagram",
            campaign: "vertical-slice",
          },
        },
      }),
    );
    window.dispatchEvent(
      new CustomEvent("tarot_spark_event", {
        detail: {
          name: "result_view",
          payload: { ...payload, source: "private free text" },
        },
      }),
    );

    expect(calls).toContainEqual([
      "event",
      "result_view",
      {
        ...payload,
        source: "instagram",
        campaign: "vertical-slice",
      },
    ]);
    expect(calls).not.toContainEqual([
      "event",
      "result_view",
      expect.objectContaining({ source: "private free text" }),
    ]);
  });

  it("captures an event waiting for the analytics listener exactly once", () => {
    const calls = mockGtag();

    render(
      <>
        <PendingResultView />
        <GoogleAnalyticsEvents measurementId="G-TEST1234" />
      </>,
    );

    expect(
      calls.filter(
        ([command, eventName]) =>
          command === "event" && eventName === "result_view",
      ),
    ).toEqual([
      [
        "event",
        "result_view",
        {
          locale: "en",
          topic_id: "relationship-flow",
          spread_id: "quick",
          style_id: "relational",
          card_count: 3,
          source: "instagram",
          campaign: "vertical-slice",
        },
      ],
    ]);
  });
});

function PendingResultView() {
  useEffect(
    () =>
      runWhenAnalyticsReady(() => {
        trackEvent("result_view", {
          locale: "en",
          topic_id: "relationship-flow",
          spread_id: "quick",
          style_id: "relational",
          card_count: 3,
          source: "instagram",
          campaign: "vertical-slice",
        });
      }),
    [],
  );

  return null;
}

function mockGtag() {
  const calls: unknown[][] = [];
  window.gtag = (...args) => {
    calls.push([...args]);
  };
  return calls;
}
