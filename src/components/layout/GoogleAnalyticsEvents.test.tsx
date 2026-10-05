import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { StrictMode, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  runWhenAnalyticsReady,
  trackEvent,
} from "@/features/tarot-reading/analytics";
import { GoogleAnalyticsEvents } from "./GoogleAnalyticsEvents";

const originalUrl = window.location.href;

const navigation = vi.hoisted(() => ({ pathname: "/ko" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

describe("GoogleAnalyticsEvents", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/ko");
  });
  afterEach(() => {
    cleanup();
    navigation.pathname = "/ko";
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
      "/ko?source=disquiet&campaign=vertical-slice&context=private&topic=love&cards=the-fool",
    );

    render(<GoogleAnalyticsEvents measurementId="G-TEST1234" />);

    expect(calls).toContainEqual([
      "set",
      expect.objectContaining({
        page_location: `${window.location.origin}/ko?utm_source=disquiet&utm_campaign=vertical-slice`,
        page_path: "/ko?utm_source=disquiet&utm_campaign=vertical-slice",
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
      "set",
      expect.objectContaining({
        page_location: `${window.location.origin}/ko`,
        page_path: "/ko",
      }),
    ]);
  });

  it("normalizes the public legacy Threads UTM campaign", () => {
    const calls = mockGtag();
    window.history.replaceState(
      null,
      "",
      "/ko?topic=relationship-flow&style=relational&utm_source=threads&utm_medium=social&utm_campaign=demo",
    );

    render(<GoogleAnalyticsEvents measurementId="G-TEST1234" />);

    expect(calls).toContainEqual([
      "set",
      expect.objectContaining({
        page_location:
          window.location.origin +
          "/ko?utm_source=threads&utm_campaign=demo&utm_medium=social",
        page_path: "/ko?utm_source=threads&utm_campaign=demo&utm_medium=social",
      }),
    ]);
  });

  it("uses the YouTube profile attribution in the analytics page URL", () => {
    const calls = mockGtag();
    window.history.replaceState(
      null,
      "",
      "/ko?utm_source=youtube&utm_medium=channel&utm_campaign=profile",
    );

    render(<GoogleAnalyticsEvents measurementId="G-TEST1234" />);

    expect(calls).toContainEqual([
      "set",
      expect.objectContaining({
        page_location:
          window.location.origin +
          "/ko?utm_source=youtube&utm_campaign=profile&utm_medium=channel",
        page_path:
          "/ko?utm_source=youtube&utm_campaign=profile&utm_medium=channel",
      }),
    ]);
  });

  it("sends page views with the active route", () => {
    const calls = mockGtag();

    render(<GoogleAnalyticsEvents measurementId="G-TEST1234" />);

    expect(calls).toContainEqual([
      "set",
      expect.objectContaining({
        page_location: `${window.location.origin}/ko`,
        page_path: "/ko",
      }),
    ]);
    expect(calls).toContainEqual([
      "event",
      "page_view",
      expect.objectContaining({ send_to: "G-TEST1234" }),
    ]);
  });

  it.each(["utm_medium=private-input", "utm_medium=social&utm_medium=channel"])(
    "drops untrusted or ambiguous campaign medium: %s",
    (medium) => {
      const calls = mockGtag();
      window.history.replaceState(
        null,
        "",
        `/ko?utm_source=youtube&utm_campaign=profile&${medium}`,
      );
      render(<GoogleAnalyticsEvents measurementId="G-TEST1234" />);
      expect(calls).toContainEqual([
        "event",
        "page_view",
        expect.objectContaining({
          page_location: `${window.location.origin}/ko?utm_source=youtube&utm_campaign=profile`,
        }),
      ]);
    },
  );

  it("configures once and sends one view per navigation under StrictMode", () => {
    const calls = mockGtag();
    const view = render(
      <StrictMode>
        <GoogleAnalyticsEvents measurementId="G-TEST1234" />
      </StrictMode>,
    );
    navigation.pathname = "/ko/about";
    window.history.replaceState(null, "", "/ko/about");
    view.rerender(
      <StrictMode>
        <GoogleAnalyticsEvents measurementId="G-TEST1234" />
      </StrictMode>,
    );
    expect(calls.filter(([command]) => command === "config")).toHaveLength(1);
    expect(
      calls.filter(
        ([command, name]) => command === "event" && name === "page_view",
      ),
    ).toHaveLength(2);
    expect(calls).toContainEqual([
      "event",
      "page_view",
      expect.objectContaining({
        page_location: `${window.location.origin}/ko/about`,
        page_path: "/ko/about",
        page_referrer: "",
      }),
    ]);
    window.dispatchEvent(
      new CustomEvent("tarot_spark_event", {
        detail: {
          name: "topic_click",
          payload: { locale: "ko", topic_id: "love" },
        },
      }),
    );
    expect(calls).toContainEqual([
      "event",
      "topic_click",
      withPageMetadata({ locale: "ko", topic_id: "love" }),
    ]);
    expect(calls).toContainEqual([
      "config",
      "G-TEST1234",
      expect.objectContaining({ send_page_view: false, page_referrer: "" }),
    ]);
  });

  it("queues Arguments that the Google tag can consume before it loads", () => {
    render(<GoogleAnalyticsEvents measurementId="G-TEST1234" />);
    for (const entry of window.dataLayer ?? []) {
      expect(Object.prototype.toString.call(entry)).toBe("[object Arguments]");
    }
    expect(
      window.dataLayer?.map((entry) => Array.from(entry as IArguments)),
    ).toContainEqual([
      "event",
      "page_view",
      expect.objectContaining({ send_to: "G-TEST1234" }),
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
      withPageMetadata({
        locale: "ko",
        topic_id: "love",
      }),
    ]);
  });

  it("queues analytics calls before the Google script installs gtag", () => {
    render(<GoogleAnalyticsEvents measurementId="G-TEST1234" />);

    expect(
      window.dataLayer?.map((entry) => Array.from(entry as IArguments)),
    ).toContainEqual([
      "set",
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
          payload: {
            ...payload,
            method: "instagram_image",
            outcome: "download_started",
          },
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
      withPageMetadata({ ...payload, outcome: "shared" }),
    ]);
    expect(calls).not.toContainEqual([
      "event",
      "share_result",
      withPageMetadata({ ...payload, outcome: "private free text" }),
    ]);
    expect(calls).toContainEqual([
      "event",
      "share_result",
      withPageMetadata({
        ...payload,
        method: "instagram_image",
        outcome: "download_started",
      }),
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
          payload: {
            ...payload,
            source: "youtube",
            campaign: "prompt-education",
          },
        },
      }),
    );
    window.dispatchEvent(
      new CustomEvent("tarot_spark_event", {
        detail: {
          name: "result_view",
          payload: { ...payload, source: "youtube", campaign: "profile" },
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
      withPageMetadata({
        ...payload,
        source: "instagram",
        campaign: "vertical-slice",
      }),
    ]);
    expect(calls).not.toContainEqual([
      "event",
      "result_view",
      expect.objectContaining({ source: "private free text" }),
    ]);
    expect(calls).toContainEqual([
      "event",
      "result_view",
      withPageMetadata({
        ...payload,
        source: "youtube",
        campaign: "prompt-education",
      }),
    ]);
    expect(calls).toContainEqual([
      "event",
      "result_view",
      withPageMetadata({ ...payload, source: "youtube", campaign: "profile" }),
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
      withPageMetadata({ ...payload, question_id: "mutual-view" }),
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

    expect(calls).toContainEqual([
      "event",
      "result_view",
      withPageMetadata(payload),
    ]);
    expect(
      calls.filter(
        ([command, eventName]) =>
          command === "event" && eventName === "result_view",
      ),
    ).toHaveLength(1);
  });

  it("accepts a compatible self question and rejects mismatches or descriptive data", () => {
    const calls = mockGtag();
    const payload = {
      locale: "en",
      topic_id: "money-life",
      spread_id: "quick",
      style_id: "practical",
      draw_style_id: "practical",
      card_count: 3,
      question_id: "money-want-or-need",
    };

    render(<GoogleAnalyticsEvents measurementId="G-TEST1234" />);
    for (const candidate of [
      payload,
      { ...payload, topic_id: "love" },
      { ...payload, question_title: "Should I buy this?" },
      { ...payload, focus_id: "money-priorities" },
      { ...payload, private_context: "My account balance" },
    ]) {
      window.dispatchEvent(
        new CustomEvent("tarot_spark_event", {
          detail: { name: "result_view", payload: candidate },
        }),
      );
    }

    expect(calls).toContainEqual([
      "event",
      "result_view",
      withPageMetadata(payload),
    ]);
    expect(
      calls.filter(
        ([command, eventName]) =>
          command === "event" && eventName === "result_view",
      ),
    ).toEqual([["event", "result_view", withPageMetadata(payload)]]);
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
        withPageMetadata({
          locale: "en",
          topic_id: "relationship-flow",
          spread_id: "quick",
          style_id: "relational",
          draw_style_id: "relational",
          card_count: 3,
          source: "instagram",
          campaign: "vertical-slice",
        }),
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

function withPageMetadata(payload: Record<string, string | number | boolean>) {
  return {
    ...payload,
    page_location: window.location.origin + navigation.pathname,
    page_path: navigation.pathname,
    page_title: document.title,
    page_referrer: "",
    send_to: "G-TEST1234",
  };
}
