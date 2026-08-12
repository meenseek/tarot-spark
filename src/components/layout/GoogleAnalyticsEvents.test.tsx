import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  runWhenAnalyticsReady,
  trackEvent,
} from "@/features/tarot-reading/analytics";
import { GoogleAnalyticsEvents } from "./GoogleAnalyticsEvents";

const originalUrl = window.location.href;

vi.mock("next/navigation", () => ({
  usePathname: () => "/ko",
}));

describe("GoogleAnalyticsEvents", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, "gtag");
    Reflect.deleteProperty(window, "dataLayer");
    window.history.replaceState(null, "", originalUrl);
  });

  it("keeps only complete allowlisted attribution in acquisition page views", () => {
    const calls = mockGtag();
    window.history.replaceState(
      null,
      "",
      "/ko?source=naver&campaign=topic-guide&context=private&topic=love&cards=the-fool",
    );

    render(<GoogleAnalyticsEvents measurementId="G-TEST1234" />);

    expect(calls).toContainEqual([
      "config",
      "G-TEST1234",
      expect.objectContaining({
        page_location: `${window.location.origin}/ko?source=naver&campaign=topic-guide`,
        page_path: "/ko?source=naver&campaign=topic-guide",
      }),
    ]);
  });

  it("drops the whole attribution pair when it is incomplete or ambiguous", () => {
    const calls = mockGtag();
    window.history.replaceState(
      null,
      "",
      "/ko?source=instagram&source=copy&campaign=vertical-slice&context=private",
    );

    render(<GoogleAnalyticsEvents measurementId="G-TEST1234" />);

    expect(calls).toContainEqual([
      "config",
      "G-TEST1234",
      expect.objectContaining({
        page_location: `${window.location.origin}/ko`,
        page_path: "/ko",
      }),
    ]);
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
      draw_style_id: "balanced",
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
      draw_style_id: "balanced",
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

  it("forwards only a topic-compatible stable question preset id", () => {
    const calls = mockGtag();
    const payload = {
      locale: "ko",
      topic_id: "feelings",
      spread_id: "quick",
      style_id: "relational",
      draw_style_id: "relational",
      card_count: 3,
    };

    render(<GoogleAnalyticsEvents measurementId="G-TEST1234" />);
    for (const question_id of [
      "mutual-view",
      "private free text",
      "pace-of-closeness",
    ]) {
      window.dispatchEvent(
        new CustomEvent("tarot_spark_event", {
          detail: {
            name: "result_view",
            payload: { ...payload, question_id },
          },
        }),
      );
    }

    expect(calls).toContainEqual([
      "event",
      "result_view",
      { ...payload, question_id: "mutual-view" },
    ]);
    expect(
      calls.filter(
        ([command, eventName]) =>
          command === "event" && eventName === "result_view",
      ),
    ).toHaveLength(1);
  });

  it("forwards a career question only with its canonical topic", () => {
    const calls = mockGtag();
    const payload = {
      locale: "en",
      topic_id: "career-direction",
      spread_id: "quick",
      style_id: "practical",
      draw_style_id: "practical",
      card_count: 3,
      question_id: "career-growth-experience",
    };

    render(<GoogleAnalyticsEvents measurementId="G-TEST1234" />);
    window.dispatchEvent(
      new CustomEvent("tarot_spark_event", {
        detail: { name: "result_view", payload },
      }),
    );
    window.dispatchEvent(
      new CustomEvent("tarot_spark_event", {
        detail: {
          name: "result_view",
          payload: { ...payload, topic_id: "love" },
        },
      }),
    );

    expect(calls).toContainEqual(["event", "result_view", payload]);
    expect(
      calls.filter(
        ([command, eventName]) =>
          command === "event" && eventName === "result_view",
      ),
    ).toHaveLength(1);
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
          draw_style_id: "relational",
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
          draw_style_id: "relational",
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
