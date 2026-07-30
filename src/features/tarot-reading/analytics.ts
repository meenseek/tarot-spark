"use client";

import type {
  PromptSlotId,
  ReadingStyleId,
  SpreadId,
  SpreadPositionId,
  TarotCardId,
  TopicId,
} from "@/domain/tarot";
import type { Locale } from "@/i18n/config";
import type { ReadingUrlAttribution } from "./reading-state";

export type AnalyticsEventName =
  | "topic_click"
  | "draw_start"
  | "card_selected"
  | "result_view"
  | "prompt_copy"
  | "share_click"
  | "share_result";

export type ShareMethod =
  | "kakaotalk"
  | "native"
  | "clipboard"
  | "copy_url"
  | "instagram_copy_url";

export type ShareOutcome =
  | "shared"
  | "opened"
  | "copied"
  | "cancelled"
  | "failed";

type ReadingAnalyticsContext = {
  readonly locale: Locale;
  readonly topic_id: TopicId;
} & AnalyticsAttributionPayload;

export type AnalyticsAttributionPayload =
  | {
      readonly campaign?: never;
      readonly source?: never;
    }
  | {
      readonly campaign: ReadingUrlAttribution["campaignId"];
      readonly source: ReadingUrlAttribution["sourceId"];
    };

type DrawAnalyticsContext = ReadingAnalyticsContext & {
  readonly spread_id: SpreadId;
  readonly style_id: ReadingStyleId;
};

type AnalyticsEventPayloads = {
  readonly topic_click: ReadingAnalyticsContext;
  readonly draw_start: DrawAnalyticsContext;
  readonly card_selected: DrawAnalyticsContext & {
    readonly position_id: SpreadPositionId;
    readonly card_id: TarotCardId;
  };
  readonly result_view: DrawAnalyticsContext & {
    readonly card_count: number;
  };
  readonly prompt_copy: DrawAnalyticsContext & {
    readonly card_count: number;
    readonly prompt_slot: PromptSlotId;
    readonly prompt_version: "prompt-pack-v2";
    readonly surface: "reading_result";
  };
  readonly share_click: DrawAnalyticsContext & {
    readonly card_count: number;
    readonly method: ShareMethod;
  };
  readonly share_result: DrawAnalyticsContext & {
    readonly card_count: number;
    readonly method: ShareMethod;
    readonly outcome: ShareOutcome;
  };
};

const analyticsReadyEvent = "tarot_spark_analytics_ready";

declare global {
  interface Window {
    tarotSparkAnalyticsReady?: boolean;
  }
}

export function getAnalyticsAttributionPayload(
  attribution: ReadingUrlAttribution | undefined,
): AnalyticsAttributionPayload {
  return attribution
    ? {
        campaign: attribution.campaignId,
        source: attribution.sourceId,
      }
    : {};
}

export function trackEvent<Name extends AnalyticsEventName>(
  name: Name,
  payload: AnalyticsEventPayloads[Name],
) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("tarot_spark_event", {
      detail: {
        name,
        payload,
      },
    }),
  );
}

export function runWhenAnalyticsReady(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  if (window.tarotSparkAnalyticsReady) {
    callback();
    return () => undefined;
  }

  const listener = () => {
    callback();
  };

  window.addEventListener(analyticsReadyEvent, listener, { once: true });

  return () => {
    window.removeEventListener(analyticsReadyEvent, listener);
  };
}

export function announceAnalyticsReady() {
  window.tarotSparkAnalyticsReady = true;
  window.dispatchEvent(new Event(analyticsReadyEvent));
}

export function clearAnalyticsReady() {
  window.tarotSparkAnalyticsReady = false;
}
