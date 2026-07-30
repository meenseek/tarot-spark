"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  promptSlotIds,
  readingStyleIds,
  spreadIds,
  spreadPositionIdsBySpread,
  tarotCardIds,
  topicIds,
} from "@/domain/tarot";
import {
  announceAnalyticsReady,
  clearAnalyticsReady,
} from "@/features/tarot-reading/analytics";
import {
  shareCampaignIds,
  shareSourceIds,
} from "@/features/tarot-reading/reading-state";
import { isLocale } from "@/i18n/config";

type AnalyticsPayload = Record<string, string | number | boolean>;
const analyticsEventPayloadKeys = {
  topic_click: ["locale", "topic_id"],
  draw_start: ["locale", "topic_id", "spread_id", "style_id"],
  card_selected: [
    "locale",
    "topic_id",
    "spread_id",
    "style_id",
    "position_id",
    "card_id",
  ],
  result_view: ["locale", "topic_id", "spread_id", "style_id", "card_count"],
  prompt_copy: [
    "locale",
    "topic_id",
    "spread_id",
    "style_id",
    "card_count",
    "prompt_slot",
    "prompt_version",
    "surface",
  ],
  share_click: [
    "locale",
    "topic_id",
    "spread_id",
    "style_id",
    "card_count",
    "method",
  ],
  share_result: [
    "locale",
    "topic_id",
    "spread_id",
    "style_id",
    "card_count",
    "method",
    "outcome",
  ],
} as const;
const analyticsAttributionPayloadKeys = ["source", "campaign"] as const;

type AnalyticsEventName = keyof typeof analyticsEventPayloadKeys;
const shareMethods = [
  "kakaotalk",
  "native",
  "clipboard",
  "copy_url",
  "instagram_copy_url",
] as const;
const shareOutcomes = [
  "shared",
  "opened",
  "copied",
  "cancelled",
  "failed",
] as const;

type GtagArguments =
  | [
      command: "config",
      targetId: string,
      config?: Record<string, string | boolean>,
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

  useEffect(() => {
    sendGtag("config", measurementId, {
      page_location: `${window.location.origin}${pathname}`,
      page_path: pathname,
      page_title: document.title,
      send_page_view: true,
    });
  }, [measurementId, pathname]);

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = getAnalyticsEventDetail(event);

      if (!detail) {
        return;
      }

      sendGtag("event", detail.name, detail.payload);
    };

    window.addEventListener("tarot_spark_event", listener);
    announceAnalyticsReady();

    return () => {
      clearAnalyticsReady();
      window.removeEventListener("tarot_spark_event", listener);
    };
  }, []);

  return null;
}

function sendGtag(...args: GtagArguments) {
  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    ((...gtagArgs: GtagArguments) => {
      window.dataLayer?.push(gtagArgs);
    });

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
  const expectedKeys =
    hasSource && hasCampaign
      ? [...allowedKeys, ...analyticsAttributionPayloadKeys]
      : allowedKeys;

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
    !isAllowedValue(value["style_id"], readingStyleIds)
  ) {
    return false;
  }

  if (name === "draw_start") {
    return true;
  }

  if (name === "card_selected") {
    const spreadId = value["spread_id"];

    return (
      isAllowedValue(value["card_id"], tarotCardIds) &&
      isAllowedValue(value["position_id"], spreadPositionIdsBySpread[spreadId])
    );
  }

  if (!isCardCount(value["card_count"])) {
    return false;
  }

  if (name === "result_view") {
    return true;
  }

  if (name === "prompt_copy") {
    return (
      isAllowedValue(value["prompt_slot"], promptSlotIds) &&
      value["prompt_version"] === "prompt-pack-v2" &&
      value["surface"] === "reading_result"
    );
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
