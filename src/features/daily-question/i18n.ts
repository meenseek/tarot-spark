import "server-only";

import type { Metadata } from "next";
import { defaultLocale, supportedLocales, type Locale } from "@/i18n/config";
import { getAbsoluteSiteUrl, getSiteUrl } from "@/i18n/seo";
import enCopy from "@/messages/en/daily-question.json";
import koCopy from "@/messages/ko/daily-question.json";
import { getDailyQuestionPath } from "./paths";

export type DailyQuestionMessages = {
  readonly metadata: {
    readonly title: string;
    readonly description: string;
  };
  readonly brand: string;
  readonly cardArtRetry: string;
  readonly eyebrow: string;
  readonly heading: string;
  readonly intro: string;
  readonly loadingLabel: string;
  readonly todayCardLabel: string;
  readonly meaningLabel: string;
  readonly questionLabel: string;
  readonly deckNote: string;
  readonly homeLink: string;
  readonly languageSwitchLabel: string;
  readonly disclaimer: string;
};

export type DailyQuestionCopy = Omit<DailyQuestionMessages, "metadata">;

const copyJsonByLocale = {
  en: enCopy,
  ko: koCopy,
} satisfies Record<Locale, DailyQuestionMessages>;

export function getDailyQuestionCopy(locale: Locale): DailyQuestionCopy {
  const copy = copyJsonByLocale[locale];

  return {
    brand: copy.brand,
    cardArtRetry: copy.cardArtRetry,
    deckNote: copy.deckNote,
    disclaimer: copy.disclaimer,
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    homeLink: copy.homeLink,
    intro: copy.intro,
    languageSwitchLabel: copy.languageSwitchLabel,
    loadingLabel: copy.loadingLabel,
    meaningLabel: copy.meaningLabel,
    questionLabel: copy.questionLabel,
    todayCardLabel: copy.todayCardLabel,
  };
}

export function getDailyQuestionMetadata(locale: Locale): Metadata {
  const metadata = copyJsonByLocale[locale].metadata;

  return {
    ...metadata,
    metadataBase: getSiteUrl(),
    alternates: {
      canonical: getAbsoluteSiteUrl(getDailyQuestionPath(locale)),
      languages: {
        ...Object.fromEntries(
          supportedLocales.map((targetLocale) => [
            targetLocale,
            getAbsoluteSiteUrl(getDailyQuestionPath(targetLocale)),
          ]),
        ),
        "x-default": getAbsoluteSiteUrl(getDailyQuestionPath(defaultLocale)),
      },
    },
    robots: {
      follow: true,
      index: false,
    },
  };
}
