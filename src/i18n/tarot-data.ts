import "server-only";

import type { Locale } from "@/i18n/config";
import enTarotMessages from "@/messages/en/tarot-domain.json";
import koTarotMessages from "@/messages/ko/tarot-domain.json";
import {
  readingLensIds,
  readingStyleIds,
  spreadIds,
  spreadPositionIds,
  spreadPositionIdsBySpread,
  tarotCardIds,
  topicIds,
} from "@/domain/tarot";
import type {
  LocaleTarotData,
  PromptTemplate,
  ReadingLens,
  ReadingLensId,
  ReadingStyle,
  ReadingStyleId,
  Spread,
  SpreadId,
  SpreadPosition,
  SpreadPositionId,
  TarotCard,
  TarotCardId,
  Topic,
  TopicId,
} from "@/domain/tarot";

type RawLocaleTarotMessages = {
  readonly promptTemplate: PromptTemplate;
  readonly topics: Record<TopicId, Omit<Topic, "id">>;
  readonly readingLenses: Record<ReadingLensId, Omit<ReadingLens, "id">>;
  readonly readingStyles: Record<ReadingStyleId, Omit<ReadingStyle, "id">>;
  readonly spreads: Record<SpreadId, Omit<Spread, "id" | "positionIds">>;
  readonly spreadPositions: Record<
    SpreadPositionId,
    Omit<SpreadPosition, "id">
  >;
  readonly cards: Record<TarotCardId, Omit<TarotCard, "id">>;
};

const rawMessagesByLocale = {
  en: enTarotMessages,
  ko: koTarotMessages,
} satisfies Record<Locale, RawLocaleTarotMessages>;

export function getTarotData(locale: Locale): LocaleTarotData {
  return normalizeLocaleMessages(rawMessagesByLocale[locale]);
}

function normalizeLocaleMessages(
  messages: RawLocaleTarotMessages,
): LocaleTarotData {
  return {
    promptTemplate: messages.promptTemplate,
    topics: topicIds.map((id) => ({
      id,
      ...messages.topics[id],
    })),
    spreads: spreadIds.map((id) => ({
      id,
      ...messages.spreads[id],
      positionIds: spreadPositionIdsBySpread[id],
    })),
    readingLenses: readingLensIds.map((id) => ({
      id,
      ...messages.readingLenses[id],
    })),
    readingStyles: readingStyleIds.map((id) => ({
      id,
      ...messages.readingStyles[id],
    })),
    spreadPositions: spreadPositionIds.map((id) => ({
      id,
      ...messages.spreadPositions[id],
    })),
    cards: tarotCardIds.map((id) => ({
      id,
      ...messages.cards[id],
    })),
  };
}
