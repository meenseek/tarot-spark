import { getLocalePath, type Locale } from "@/i18n/config";
import { shareReadingPathSegment } from "@/i18n/routing";
import {
  getSpreadPositions,
  normalizeUserContext,
  type DrawnCard,
  type LocaleTarotData,
  type ReadingStyleId,
  type SpreadId,
  type TopicId,
} from "@/domain/tarot";

const readingTopicParam = "topic";
const readingCardsParam = "cards";
const readingSpreadParam = "spread";
const readingStyleParam = "style";
const shareSourceParam = "source";
const shareCampaignParam = "campaign";
const privateContextHandoffStorageKey =
  "tarot-spark.private-context-handoff.v1";
const privateContextHandoffVersion = 1;
const privateContextHandoffLifetimeMilliseconds = 60_000;

export type ReadingUrlState = {
  readonly cards: readonly DrawnCard[];
  readonly spreadId: SpreadId;
  readonly styleId: ReadingStyleId;
  readonly topicId: TopicId;
};

export const shareSourceIds = [
  "instagram",
  "naver",
  "threads",
  "kakao",
  "native",
  "copy",
  "pinterest",
  "reddit",
] as const;
export type ShareSourceId = (typeof shareSourceIds)[number];

export const shareCampaignIds = [
  "vertical-slice",
  "pick-a-card",
  "prompt-education",
  "deck-progress",
  "topic-guide",
] as const;
export type ShareCampaignId = (typeof shareCampaignIds)[number];

export type ReadingUrlAttribution = {
  readonly campaignId: ShareCampaignId;
  readonly sourceId: ShareSourceId;
};

export function buildReadingUrl(
  href: string,
  state: ReadingUrlState,
  attribution?: ReadingUrlAttribution,
) {
  const url = new URL(href);
  url.search = "";
  url.hash = "";
  url.searchParams.set(readingTopicParam, state.topicId);

  if (state.spreadId !== "quick") {
    url.searchParams.set(readingSpreadParam, state.spreadId);
  }

  if (state.styleId !== "balanced") {
    url.searchParams.set(readingStyleParam, state.styleId);
  }

  if (state.cards.length > 0) {
    url.searchParams.set(
      readingCardsParam,
      state.cards.map(({ card }) => card.id).join(","),
    );
  }

  if (attribution) {
    url.searchParams.set(shareSourceParam, attribution.sourceId);
    url.searchParams.set(shareCampaignParam, attribution.campaignId);
  }

  return url.toString();
}

export function getLocalizedReadingHref(
  locale: Locale,
  state: ReadingUrlState,
  attribution?: ReadingUrlAttribution,
) {
  const absoluteUrl = buildReadingUrl(
    new URL(getLocalePath(locale), "https://tarot-spark.local").toString(),
    state,
    attribution,
  );
  const url = new URL(absoluteUrl);

  return `${url.pathname}${url.search}`;
}

export function getReadingAttributionFromUrl(
  href: string,
): ReadingUrlAttribution | null | undefined {
  const url = new URL(href);
  const sourceValues = url.searchParams.getAll(shareSourceParam);
  const campaignValues = url.searchParams.getAll(shareCampaignParam);

  if (sourceValues.length === 0 && campaignValues.length === 0) {
    return undefined;
  }

  if (sourceValues.length !== 1 || campaignValues.length !== 1) {
    return null;
  }

  const [sourceId] = sourceValues;
  const [campaignId] = campaignValues;

  if (
    !sourceId ||
    !campaignId ||
    !isShareSourceId(sourceId) ||
    !isShareCampaignId(campaignId)
  ) {
    return null;
  }

  return { campaignId, sourceId };
}

function isShareSourceId(value: string): value is ShareSourceId {
  return shareSourceIds.some((candidate) => candidate === value);
}

function isShareCampaignId(value: string): value is ShareCampaignId {
  return shareCampaignIds.some((candidate) => candidate === value);
}

export function getShareBaseUrl(shareSiteUrl: string, locale: Locale) {
  const shareBaseUrl = new URL(shareSiteUrl);
  const pathname =
    locale === "en"
      ? `/${shareReadingPathSegment}`
      : `/${locale}/${shareReadingPathSegment}`;

  return new URL(pathname, shareBaseUrl).toString();
}

export function getReadingStateFromUrl(
  tarotData: LocaleTarotData,
  href: string,
): ReadingUrlState | undefined {
  const url = new URL(href);
  const hasReadingState = [
    readingTopicParam,
    readingCardsParam,
    readingSpreadParam,
    readingStyleParam,
  ].some((param) => url.searchParams.has(param));

  if (!hasReadingState) {
    return undefined;
  }

  const topicParam = url.searchParams.get(readingTopicParam);
  const topic = topicParam
    ? tarotData.topics.find((candidate) => candidate.id === topicParam)
    : tarotData.topics[0];
  const spreadParam = url.searchParams.get(readingSpreadParam);
  const spread = spreadParam
    ? tarotData.spreads.find((candidate) => candidate.id === spreadParam)
    : tarotData.spreads.find((candidate) => candidate.id === "quick");
  const styleParam = url.searchParams.get(readingStyleParam);
  const style = styleParam
    ? tarotData.readingStyles.find((candidate) => candidate.id === styleParam)
    : tarotData.readingStyles.find((candidate) => candidate.id === "balanced");
  const cardsParam = url.searchParams.get(readingCardsParam);

  if (!topic || !spread || !style) {
    return undefined;
  }

  if (!cardsParam) {
    return {
      cards: [],
      spreadId: spread.id,
      styleId: style.id,
      topicId: topic.id,
    };
  }

  const cardIds = cardsParam.split(",");
  const positions = getSpreadPositions(spread, tarotData.spreadPositions);

  if (
    cardIds.length !== positions.length ||
    new Set(cardIds).size !== cardIds.length
  ) {
    return undefined;
  }

  const cards: DrawnCard[] = [];

  for (const [index, cardId] of cardIds.entries()) {
    const position = positions[index];
    const card = tarotData.cards.find((candidate) => candidate.id === cardId);

    if (!position || !card) {
      return undefined;
    }

    cards.push({ position, card });
  }

  return {
    cards,
    spreadId: spread.id,
    styleId: style.id,
    topicId: topic.id,
  };
}

export function storePrivateContextHandoff(
  storage: Storage,
  value: string,
  now = Date.now(),
) {
  try {
    const normalizedValue = normalizeUserContext(value);

    if (!normalizedValue) {
      storage.removeItem(privateContextHandoffStorageKey);
      return;
    }

    storage.setItem(
      privateContextHandoffStorageKey,
      JSON.stringify({
        context: normalizedValue,
        expiresAt: now + privateContextHandoffLifetimeMilliseconds,
        version: privateContextHandoffVersion,
      }),
    );
  } catch {
    tryRemovePrivateContextHandoff(storage);
  }
}

export function consumePrivateContextHandoff(
  storage: Storage,
  now = Date.now(),
) {
  const context = readPrivateContextHandoff(storage, now);
  clearPrivateContextHandoff(storage);

  return context;
}

export function readPrivateContextHandoff(storage: Storage, now = Date.now()) {
  let storedValue: string | null;

  try {
    storedValue = storage.getItem(privateContextHandoffStorageKey);
  } catch {
    return undefined;
  }

  if (!storedValue) {
    return undefined;
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue);

    if (
      typeof parsedValue !== "object" ||
      parsedValue === null ||
      !("version" in parsedValue) ||
      parsedValue.version !== privateContextHandoffVersion ||
      !("expiresAt" in parsedValue) ||
      typeof parsedValue.expiresAt !== "number" ||
      parsedValue.expiresAt < now ||
      !("context" in parsedValue) ||
      typeof parsedValue.context !== "string"
    ) {
      clearPrivateContextHandoff(storage);
      return undefined;
    }

    const context = normalizeUserContext(parsedValue.context);

    if (!context) {
      clearPrivateContextHandoff(storage);
      return undefined;
    }

    return context;
  } catch {
    clearPrivateContextHandoff(storage);
    return undefined;
  }
}

export function clearPrivateContextHandoff(storage: Storage) {
  tryRemovePrivateContextHandoff(storage);
}

function tryRemovePrivateContextHandoff(storage: Storage) {
  try {
    storage.removeItem(privateContextHandoffStorageKey);
  } catch {
    // Storage is optional; the locale switch still works without private state.
  }
}
