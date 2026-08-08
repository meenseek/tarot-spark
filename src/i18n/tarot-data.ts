import "server-only";

import type { Locale } from "@/i18n/config";
import enTarotMessages from "@/messages/en/tarot-domain.json";
import koTarotMessages from "@/messages/ko/tarot-domain.json";
import enCards from "@/messages/en/tarot-cards.json";
import koCards from "@/messages/ko/tarot-cards.json";
import {
  readingStyleIds,
  spreadIds,
  tarotCardIds,
  topicIds,
} from "@/domain/tarot";
import type {
  LocaleTarotData,
  PromptTemplate,
  ReadingStyle,
  ReadingStyleId,
  Spread,
  SpreadId,
  TarotCard,
  TarotCardId,
  Topic,
  TopicId,
} from "@/domain/tarot";

type RawLocaleTarotMessages = {
  readonly promptTemplate: PromptTemplate;
  readonly topics: Record<TopicId, Omit<Topic, "id">>;
  readonly readingStyles: Record<ReadingStyleId, Omit<ReadingStyle, "id">>;
  readonly spreads: Record<SpreadId, Omit<Spread, "id" | "cardCount">>;
};

const rawMessagesByLocale = {
  en: enTarotMessages,
  ko: koTarotMessages,
} satisfies Record<Locale, RawLocaleTarotMessages>;
const rawCardsByLocale = {
  en: enCards,
  ko: koCards,
} satisfies Record<Locale, Record<TarotCardId, Omit<TarotCard, "id">>>;
const cardCountBySpread = {
  deep: 6,
  quick: 3,
} as const satisfies Record<SpreadId, Spread["cardCount"]>;

export function getTarotData(locale: Locale): LocaleTarotData {
  return normalizeLocaleMessages(
    rawMessagesByLocale[locale],
    rawCardsByLocale[locale],
  );
}

function normalizeLocaleMessages(
  messages: RawLocaleTarotMessages,
  cards: Record<TarotCardId, Omit<TarotCard, "id">>,
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
      cardCount: cardCountBySpread[id],
    })),
    readingStyles: readingStyleIds.map((id) => ({
      id,
      ...messages.readingStyles[id],
    })),
    cards: tarotCardIds.map((id) => ({
      id,
      ...cards[id],
    })),
  };
}
