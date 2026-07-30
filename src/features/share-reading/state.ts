import {
  getReadingAttributionFromUrl,
  getReadingStateFromUrl,
} from "@/features/tarot-reading";
import type { Locale } from "@/i18n/config";
import { getTarotData } from "@/i18n/tarot-data";

const allowedSearchParamNames = [
  "topic",
  "cards",
  "spread",
  "style",
  "source",
  "campaign",
] as const;

export type ShareSearchParams = Readonly<
  Record<string, string | readonly string[] | undefined>
>;

export function getShareReadingSnapshot(
  locale: Locale,
  searchParams: ShareSearchParams,
) {
  if (
    Object.keys(searchParams).some(
      (key) =>
        !allowedSearchParamNames.includes(
          key as (typeof allowedSearchParamNames)[number],
        ),
    ) ||
    Object.values(searchParams).some(
      (value) => value !== undefined && typeof value !== "string",
    )
  ) {
    return undefined;
  }

  const url = new URL("https://tarot-spark.local/share");

  for (const paramName of allowedSearchParamNames) {
    const value = getSingleValue(searchParams[paramName]);

    if (value === undefined) {
      continue;
    }

    url.searchParams.set(paramName, value);
  }

  const attribution = getReadingAttributionFromUrl(url.toString());

  if (attribution === null) {
    return undefined;
  }

  const tarotData = getTarotData(locale);
  const state = getReadingStateFromUrl(tarotData, url.toString());

  if (!state || state.cards.length === 0) {
    return undefined;
  }

  const topic = tarotData.topics.find(
    (candidate) => candidate.id === state.topicId,
  );
  const spread = tarotData.spreads.find(
    (candidate) => candidate.id === state.spreadId,
  );
  const readingStyle = tarotData.readingStyles.find(
    (candidate) => candidate.id === state.styleId,
  );

  if (!topic || !spread || !readingStyle) {
    return undefined;
  }

  return {
    attribution,
    cards: state.cards,
    readingStyle,
    spread,
    topic,
  };
}

function getSingleValue(value: string | readonly string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}
