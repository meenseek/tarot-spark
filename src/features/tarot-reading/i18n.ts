import "server-only";

import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { withLocalizedAlternates } from "@/i18n/seo";
import enCopy from "@/messages/en/tarot-reading.json";
import koCopy from "@/messages/ko/tarot-reading.json";

export type TarotReadingMessages = {
  readonly metadata: Metadata;
  readonly brand: string;
  readonly heading: string;
  readonly intro: string;
  readonly deckPreviewNote: string;
  readonly topicSelectorLabel: string;
  readonly cardCountLabel: string;
  readonly drawButton: string;
  readonly workspaceLabel: string;
  readonly cardMarkLabel: string;
  readonly generatedPromptLabel: string;
  readonly copyPrompt: string;
  readonly copied: string;
  readonly copyUrl: string;
  readonly copiedUrl: string;
  readonly instagramShare: string;
  readonly instagramCopied: string;
  readonly kakaoShare: string;
  readonly kakaoShared: string;
  readonly share: string;
  readonly shared: string;
  readonly copiedShareText: string;
  readonly blockedAction: string;
  readonly emptyHeading: string;
  readonly emptyBody: string;
  readonly disclaimer: string;
  readonly languageSwitchLabel: string;
  readonly shareTitle: string;
  readonly shareText: string;
  readonly placeholders: readonly {
    readonly positionLabel: string;
    readonly cardName: string;
    readonly cardTone: string;
  }[];
};

export type TarotReadingCopy = Omit<TarotReadingMessages, "metadata">;

const copyJsonByLocale = {
  en: enCopy,
  ko: koCopy,
} satisfies Record<Locale, TarotReadingMessages>;

export function getTarotReadingCopy(locale: Locale): TarotReadingCopy {
  const copy = copyJsonByLocale[locale];

  return {
    blockedAction: copy.blockedAction,
    brand: copy.brand,
    cardCountLabel: copy.cardCountLabel,
    cardMarkLabel: copy.cardMarkLabel,
    copied: copy.copied,
    copiedUrl: copy.copiedUrl,
    copyUrl: copy.copyUrl,
    copiedShareText: copy.copiedShareText,
    copyPrompt: copy.copyPrompt,
    deckPreviewNote: copy.deckPreviewNote,
    disclaimer: copy.disclaimer,
    drawButton: copy.drawButton,
    emptyBody: copy.emptyBody,
    emptyHeading: copy.emptyHeading,
    generatedPromptLabel: copy.generatedPromptLabel,
    heading: copy.heading,
    instagramCopied: copy.instagramCopied,
    instagramShare: copy.instagramShare,
    intro: copy.intro,
    kakaoShare: copy.kakaoShare,
    kakaoShared: copy.kakaoShared,
    languageSwitchLabel: copy.languageSwitchLabel,
    placeholders: copy.placeholders,
    share: copy.share,
    shared: copy.shared,
    shareText: copy.shareText,
    shareTitle: copy.shareTitle,
    topicSelectorLabel: copy.topicSelectorLabel,
    workspaceLabel: copy.workspaceLabel,
  };
}

export function getTarotReadingMetadata(locale: Locale): Metadata {
  return withLocalizedAlternates(copyJsonByLocale[locale].metadata, locale);
}
