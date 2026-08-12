import { getLocalePath, type Locale } from "@/i18n/config";
import { shareReadingPathSegment } from "@/i18n/routing";
import {
  normalizeUserContext,
  type DrawnCard,
  type LocaleTarotData,
  type ReadingStyleId,
  type SpreadId,
  type TopicId,
} from "@/domain/tarot";
import {
  getPublicQuestionDefinition,
  isPublicQuestionId,
  type PublicQuestionId,
} from "@/features/reading-questions/registry";

const readingTopicParam = "topic";
const readingCardsParam = "cards";
const readingSpreadParam = "spread";
const readingStyleParam = "style";
const readingDrawStyleParam = "drawStyle";
const readingQuestionParam = "question";
const shareSourceParam = "source";
const shareCampaignParam = "campaign";
const privateContextHandoffStorageKey = "tarot-spark.private-context-handoff";
const privateContextHandoffLifetimeMilliseconds = 60_000;

export type ReadingUrlState = {
  readonly cards: readonly DrawnCard[];
  readonly drawStyleId: ReadingStyleId;
  readonly spreadId: SpreadId;
  readonly styleId: ReadingStyleId;
  readonly topicId: TopicId;
  readonly questionId?: PublicQuestionId;
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

export type ReadingSearchParams = Record<
  string,
  string | readonly string[] | undefined
>;

export function buildReadingUrl(
  href: string,
  state: ReadingUrlState,
  attribution?: ReadingUrlAttribution,
) {
  const url = new URL(href);
  url.search = "";
  url.hash = "";
  url.searchParams.set(readingTopicParam, state.topicId);

  if (state.questionId) {
    url.searchParams.set(readingQuestionParam, state.questionId);
  }

  if (state.spreadId !== "quick") {
    url.searchParams.set(readingSpreadParam, state.spreadId);
  }

  if (state.styleId !== "balanced") {
    url.searchParams.set(readingStyleParam, state.styleId);
  }

  if (state.cards.length > 0) {
    const drawStyleId = state.drawStyleId;

    if (drawStyleId !== state.styleId) {
      url.searchParams.set(readingDrawStyleParam, drawStyleId);
    }

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

export function getLocalizedShareReadingHref(
  locale: Locale,
  state: ReadingUrlState,
  attribution?: ReadingUrlAttribution,
) {
  const absoluteUrl = buildReadingUrl(
    getShareBaseUrl("https://tarot-spark.local", locale),
    state,
    attribution,
  );
  const url = new URL(absoluteUrl);

  return `${url.pathname}${url.search}`;
}

export function getLocalizedGeneratorHref(
  locale: Locale,
  attribution?: ReadingUrlAttribution,
) {
  const url = new URL(getLocalePath(locale), "https://tarot-spark.local");

  if (attribution) {
    url.searchParams.set(shareSourceParam, attribution.sourceId);
    url.searchParams.set(shareCampaignParam, attribution.campaignId);
  }

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

export function getReadingAttributionFromSearchParams(
  searchParams: ReadingSearchParams,
): ReadingUrlAttribution | undefined {
  const sourceId = searchParams[shareSourceParam];
  const campaignId = searchParams[shareCampaignParam];

  if (
    typeof sourceId !== "string" ||
    typeof campaignId !== "string" ||
    !isShareSourceId(sourceId) ||
    !isShareCampaignId(campaignId)
  ) {
    return undefined;
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
  const searchParams: ReadingSearchParams = {};

  for (const param of [
    readingTopicParam,
    readingCardsParam,
    readingSpreadParam,
    readingStyleParam,
    readingDrawStyleParam,
    readingQuestionParam,
  ]) {
    const values = url.searchParams.getAll(param);

    if (values.length === 0) {
      continue;
    }

    searchParams[param] = values.length === 1 ? values[0] : values;
  }

  return getReadingStateFromSearchParams(tarotData, searchParams);
}

export function getReadingStateFromSearchParams(
  tarotData: LocaleTarotData,
  searchParams: ReadingSearchParams,
): ReadingUrlState | undefined {
  const hasReadingState = [
    readingTopicParam,
    readingCardsParam,
    readingSpreadParam,
    readingStyleParam,
    readingDrawStyleParam,
    readingQuestionParam,
  ].some((param) => searchParams[param] !== undefined);

  if (!hasReadingState) {
    return undefined;
  }

  const readingParamValues = [
    searchParams[readingTopicParam],
    searchParams[readingCardsParam],
    searchParams[readingSpreadParam],
    searchParams[readingStyleParam],
    searchParams[readingDrawStyleParam],
    searchParams[readingQuestionParam],
  ];

  if (
    readingParamValues.some((value) => Array.isArray(value) || value === "")
  ) {
    return undefined;
  }

  const topicParam = getStringValue(searchParams[readingTopicParam]);
  const topic = topicParam
    ? tarotData.topics.find((candidate) => candidate.id === topicParam)
    : tarotData.topics[0];
  const spreadParam = getStringValue(searchParams[readingSpreadParam]);
  const spread = spreadParam
    ? tarotData.spreads.find((candidate) => candidate.id === spreadParam)
    : tarotData.spreads.find((candidate) => candidate.id === "quick");
  const styleParam = getStringValue(searchParams[readingStyleParam]);
  const style = styleParam
    ? tarotData.readingStyles.find((candidate) => candidate.id === styleParam)
    : tarotData.readingStyles.find((candidate) => candidate.id === "balanced");
  const drawStyleParam = getStringValue(searchParams[readingDrawStyleParam]);
  const drawStyle = drawStyleParam
    ? tarotData.readingStyles.find(
        (candidate) => candidate.id === drawStyleParam,
      )
    : style;
  const cardsParam = getStringValue(searchParams[readingCardsParam]);
  const questionParam = getStringValue(searchParams[readingQuestionParam]);

  if (!topic || !spread || !style || !drawStyle) {
    return undefined;
  }

  const questionId =
    questionParam && isPublicQuestionId(questionParam)
      ? questionParam
      : undefined;

  if (
    questionParam !== undefined &&
    (!questionId ||
      getPublicQuestionDefinition(questionId).topicId !== topic.id)
  ) {
    return undefined;
  }

  if (cardsParam === undefined) {
    if (drawStyleParam !== undefined) {
      return undefined;
    }

    return {
      cards: [],
      drawStyleId: style.id,
      spreadId: spread.id,
      styleId: style.id,
      topicId: topic.id,
      ...(questionId ? { questionId } : {}),
    };
  }

  const cardIds = cardsParam.split(",");
  if (
    cardIds.length !== spread.cardCount ||
    new Set(cardIds).size !== cardIds.length
  ) {
    return undefined;
  }

  const cards: DrawnCard[] = [];

  for (const cardId of cardIds) {
    const card = tarotData.cards.find((candidate) => candidate.id === cardId);

    if (!card) {
      return undefined;
    }

    cards.push({ card });
  }

  return {
    cards,
    drawStyleId: drawStyle.id,
    spreadId: spread.id,
    styleId: style.id,
    topicId: topic.id,
    ...(questionId ? { questionId } : {}),
  };
}

function getStringValue(value: string | readonly string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export function storePrivateContextHandoff(
  storage: Storage,
  value: string,
  now = Date.now(),
) {
  try {
    const normalizedValue = normalizeUserContext(value);

    removeLegacyPrivateContextHandoffs(storage);

    if (!normalizedValue) {
      storage.removeItem(privateContextHandoffStorageKey);
      return;
    }

    storage.setItem(
      privateContextHandoffStorageKey,
      JSON.stringify({
        context: normalizedValue,
        expiresAt: now + privateContextHandoffLifetimeMilliseconds,
      }),
    );
  } catch {
    tryRemovePrivateContextHandoff(storage);
  }
}

export function getPrivateContextHandoffResetScript() {
  const key = JSON.stringify(privateContextHandoffStorageKey);

  return `try{const s=window.sessionStorage,k=${key},p=k+".",r=[];for(let i=0;i<s.length;i++){const x=s.key(i);if(x&&(x===k||x.startsWith(p)))r.push(x)}for(const x of r)s.removeItem(x)}catch{}`;
}

export function consumePrivateContextHandoff(
  storage: Storage,
  now = Date.now(),
) {
  try {
    return readPrivateContextHandoff(storage, now);
  } finally {
    clearPrivateContextHandoff(storage);
  }
}

export function readPrivateContextHandoff(storage: Storage, now = Date.now()) {
  let storedValue: string | null;

  try {
    removeLegacyPrivateContextHandoffs(storage);
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
      Array.isArray(parsedValue) ||
      !hasExactKeys(parsedValue, ["context", "expiresAt"]) ||
      !("expiresAt" in parsedValue) ||
      typeof parsedValue.expiresAt !== "number" ||
      !Number.isFinite(parsedValue.expiresAt) ||
      parsedValue.expiresAt < now ||
      parsedValue.expiresAt > now + privateContextHandoffLifetimeMilliseconds ||
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
    removeLegacyPrivateContextHandoffs(storage);
  } catch {
    // Storage is optional; the locale switch still works without private state.
  }
}

function removeLegacyPrivateContextHandoffs(storage: Storage) {
  const legacyPrefix = `${privateContextHandoffStorageKey}.`;
  const keysToRemove: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);

    if (key?.startsWith(legacyPrefix)) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    storage.removeItem(key);
  }
}

function hasExactKeys(value: object, expectedKeys: readonly string[]) {
  const keys = Object.keys(value);

  return (
    keys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.hasOwn(value, key))
  );
}
