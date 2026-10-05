"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  readingStyleIds,
  spreadIds,
  tarotCardIds,
  topicIds,
} from "@/domain/tarot";
import {
  getPublicQuestionDefinition,
  isPublicQuestionId,
} from "@/features/reading-questions/registry";
import {
  announceAnalyticsReady,
  clearAnalyticsReady,
} from "@/features/tarot-reading/analytics";
import {
  getReadingAttributionFromUrl,
  shareCampaignIds,
  shareSourceIds,
} from "@/features/tarot-reading/reading-state";
import { isLocale } from "@/i18n/config";

type AnalyticsPayload = Record<string, string | number | boolean>;
const analyticsEventPayloadKeys = {
  topic_click: ["locale", "topic_id"],
  draw_start: ["locale", "topic_id", "spread_id", "style_id", "draw_style_id"],
  card_selected: [
    "locale",
    "topic_id",
    "spread_id",
    "style_id",
    "draw_style_id",
    "card_order",
    "card_id",
  ],
  result_view: [
    "locale",
    "topic_id",
    "spread_id",
    "style_id",
    "draw_style_id",
    "card_count",
  ],
  prompt_copy: [
    "locale",
    "topic_id",
    "spread_id",
    "style_id",
    "draw_style_id",
    "card_count",
    "surface",
  ],
  share_click: [
    "locale",
    "topic_id",
    "spread_id",
    "style_id",
    "draw_style_id",
    "card_count",
    "method",
  ],
  share_result: [
    "locale",
    "topic_id",
    "spread_id",
    "style_id",
    "draw_style_id",
    "card_count",
    "method",
    "outcome",
  ],
} as const;
const analyticsAttributionPayloadKeys = ["source", "campaign"] as const;
const analyticsQuestionPayloadKey = "question_id";

type AnalyticsEventName = keyof typeof analyticsEventPayloadKeys;
const shareMethods = [
  "kakaotalk",
  "native",
  "copy_url",
  "instagram_image",
] as const;
const shareOutcomes = [
  "shared",
  "opened",
  "copied",
  "download_started",
  "cancelled",
  "failed",
] as const;

type GtagArguments =
  | [command: "js", startedAt: Date]
  | [command: "set", settings: Record<string, string>]
  | [
      command: "config",
      targetId: string,
      config?: Record<string, string | boolean>,
    ]
  | [
      command: "consent",
      action: "update",
      settings: Partial<
        Record<
          | "ad_personalization"
          | "ad_storage"
          | "ad_user_data"
          | "analytics_storage",
          "denied" | "granted"
        >
      >,
    ]
  | [command: "event", eventName: string, eventParams?: AnalyticsPayload];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: GtagArguments) => void;
  }
}

type GoogleAnalyticsEventsProps = {
  readonly measurementId: string;
};

export function GoogleAnalyticsEvents({
  measurementId,
}: GoogleAnalyticsEventsProps) {
  const pathname = usePathname();
  const previousPage = useRef<{ measurementId: string; url: string } | null>(
    null,
  );

  useEffect(() => {
    const pageUrl = getAnalyticsPageUrl(pathname, window.location.href);
    const url = pageUrl.toString();
    if (
      previousPage.current?.measurementId === measurementId &&
      previousPage.current.url === url
    ) {
      return;
    }
    const page = {
      page_location: url,
      page_path: `${pageUrl.pathname}${pageUrl.search}`,
      page_title: document.title,
      page_referrer: "",
    };
    if (!previousPage.current) sendGtag("js", new Date());
    if (previousPage.current?.measurementId !== measurementId) {
      sendGtag("config", measurementId, { ...page, send_page_view: false });
    }
    sendGtag("set", page);
    sendGtag("event", "page_view", { ...page, send_to: measurementId });
    previousPage.current = { measurementId, url };
  }, [measurementId, pathname]);

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = getAnalyticsEventDetail(event);

      if (!detail) {
        return;
      }

      const pageUrl = getAnalyticsPageUrl(
        window.location.pathname,
        window.location.href,
      );
      sendGtag("event", detail.name, {
        ...detail.payload,
        page_location: pageUrl.toString(),
        page_path: `${pageUrl.pathname}${pageUrl.search}`,
        page_title: document.title,
        page_referrer: "",
        send_to: measurementId,
      });
    };

    window.addEventListener("tarot_spark_event", listener);
    announceAnalyticsReady();

    return () => {
      clearAnalyticsReady();
      window.removeEventListener("tarot_spark_event", listener);
    };
  }, [measurementId]);

  return null;
}

function getAnalyticsPageUrl(pathname: string, href: string) {
  const currentUrl = new URL(href);
  const pageUrl = new URL(pathname, currentUrl.origin);
  const attribution = getReadingAttributionFromUrl(href);

  if (attribution) {
    pageUrl.searchParams.set("utm_source", attribution.sourceId);
    pageUrl.searchParams.set("utm_campaign", attribution.campaignId);
    const sources = currentUrl.searchParams.getAll("utm_source");
    const campaigns = currentUrl.searchParams.getAll("utm_campaign");
    const mediums = currentUrl.searchParams.getAll("utm_medium");
    if (
      sources.length === 1 &&
      sources[0] === attribution.sourceId &&
      campaigns.length === 1 &&
      campaigns[0] === attribution.campaignId &&
      mediums.length === 1 &&
      (mediums[0] === "social" || mediums[0] === "channel")
    ) {
      pageUrl.searchParams.set("utm_medium", mediums[0]);
    }
  }

  return pageUrl;
}

function sendGtag(...args: GtagArguments) {
  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    function () {
      // The Google tag consumes Arguments entries rather than arrays.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };

  window.gtag(...args);
}

function getAnalyticsEventDetail(event: Event) {
  if (!(event instanceof CustomEvent) || !isRecord(event.detail)) {
    return undefined;
  }

  const { name, payload } = event.detail;

  if (!isAnalyticsEventName(name)) {
    return undefined;
  }

  if (!isAnalyticsPayload(name, payload)) {
    return undefined;
  }

  return {
    name,
    payload,
  };
}

function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return (
    typeof value === "string" && Object.hasOwn(analyticsEventPayloadKeys, value)
  );
}

function isAnalyticsPayload(
  name: AnalyticsEventName,
  value: unknown,
): value is AnalyticsPayload {
  if (!isRecord(value)) {
    return false;
  }

  const allowedKeys: readonly string[] = analyticsEventPayloadKeys[name];
  const receivedKeys = Object.keys(value);
  const hasSource = Object.hasOwn(value, "source");
  const hasCampaign = Object.hasOwn(value, "campaign");
  const hasQuestion = Object.hasOwn(value, analyticsQuestionPayloadKey);
  const expectedKeys =
    hasSource && hasCampaign
      ? [
          ...allowedKeys,
          ...(hasQuestion ? [analyticsQuestionPayloadKey] : []),
          ...analyticsAttributionPayloadKeys,
        ]
      : [...allowedKeys, ...(hasQuestion ? [analyticsQuestionPayloadKey] : [])];

  if (
    hasSource !== hasCampaign ||
    receivedKeys.length !== expectedKeys.length ||
    !receivedKeys.every((key) => expectedKeys.includes(key)) ||
    !isLocaleValue(value["locale"]) ||
    !isAllowedValue(value["topic_id"], topicIds)
  ) {
    return false;
  }

  if (
    hasQuestion &&
    (!isPublicQuestionValue(value[analyticsQuestionPayloadKey]) ||
      getPublicQuestionDefinition(value[analyticsQuestionPayloadKey])
        .topicId !== value["topic_id"])
  ) {
    return false;
  }

  if (
    hasSource &&
    (!isAllowedValue(value["source"], shareSourceIds) ||
      !isAllowedValue(value["campaign"], shareCampaignIds))
  ) {
    return false;
  }

  if (name === "topic_click") {
    return true;
  }

  if (
    !isAllowedValue(value["spread_id"], spreadIds) ||
    !isAllowedValue(value["style_id"], readingStyleIds) ||
    !isAllowedValue(value["draw_style_id"], readingStyleIds)
  ) {
    return false;
  }

  if (name === "draw_start") {
    return true;
  }

  if (name === "card_selected") {
    return (
      isAllowedValue(value["card_id"], tarotCardIds) &&
      isCardOrder(value["card_order"], value["spread_id"])
    );
  }

  if (!isCardCount(value["card_count"])) {
    return false;
  }

  if (name === "result_view") {
    return true;
  }

  if (name === "prompt_copy") {
    return value["surface"] === "reading_result";
  }

  if (name === "share_click") {
    return isAllowedValue(value["method"], shareMethods);
  }

  return (
    name === "share_result" &&
    isAllowedValue(value["method"], shareMethods) &&
    isAllowedValue(value["outcome"], shareOutcomes)
  );
}

function isCardOrder(value: unknown, spreadId: unknown) {
  const maximum = spreadId === "quick" ? 3 : spreadId === "deep" ? 6 : 0;

  return (
    Number.isSafeInteger(value) &&
    Number(value) >= 1 &&
    Number(value) <= maximum
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLocaleValue(value: unknown) {
  return typeof value === "string" && isLocale(value);
}

function isAllowedValue<const Values extends readonly string[]>(
  value: unknown,
  allowedValues: Values,
): value is Values[number] {
  return typeof value === "string" && allowedValues.includes(value);
}

function isCardCount(value: unknown) {
  return value === 3 || value === 6;
}

function isPublicQuestionValue(
  value: unknown,
): value is Parameters<typeof getPublicQuestionDefinition>[0] {
  return typeof value === "string" && isPublicQuestionId(value);
}
