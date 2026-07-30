"use client";

import type {
  ReadingStyleId,
  SpreadId,
  SpreadPositionId,
  TarotCardId,
  TopicId,
} from "@/domain/tarot";
import type { Locale } from "@/i18n/config";

export type AnalyticsEventName =
  | "topic_click"
  | "draw_start"
  | "card_selected"
  | "result_view"
  | "prompt_copy"
  | "share_click";

type ReadingAnalyticsContext = {
  readonly locale: Locale;
  readonly topic_id: TopicId;
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
  };
  readonly share_click: DrawAnalyticsContext & {
    readonly card_count: number;
    readonly method:
      | "kakaotalk"
      | "native"
      | "clipboard"
      | "copy_url"
      | "instagram_copy_url";
  };
};

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
