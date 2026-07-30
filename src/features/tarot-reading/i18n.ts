import "server-only";

import type { Metadata } from "next";
import type { PromptSlotId } from "@/domain/tarot";
import type { Locale } from "@/i18n/config";
import { getAbsoluteSiteUrl, withLocalizedAlternates } from "@/i18n/seo";
import enCopy from "@/messages/en/tarot-reading.json";
import koCopy from "@/messages/ko/tarot-reading.json";

export type TarotReadingMessages = {
  readonly metadata: {
    readonly title: string;
    readonly description: string;
  };
  readonly brand: string;
  readonly heading: string;
  readonly intro: string;
  readonly deckPreviewNote: string;
  readonly personalizationHeading: string;
  readonly personalizationIntro: string;
  readonly spreadSelectorLabel: string;
  readonly readingStyleSelectorLabel: string;
  readonly contextLabel: string;
  readonly contextOptional: string;
  readonly contextPlaceholder: string;
  readonly contextHelp: string;
  readonly contextCountLabel: string;
  readonly topicSelectorLabel: string;
  readonly cardCountLabel: string;
  readonly drawButton: string;
  readonly workspaceLabel: string;
  readonly cardMarkLabel: string;
  readonly promptPack: {
    readonly heading: string;
    readonly intro: string;
    readonly selectorLabel: string;
    readonly slots: Readonly<
      Record<
        PromptSlotId,
        {
          readonly label: string;
          readonly description: string;
        }
      >
    >;
  };
  readonly cardDetails: {
    readonly archetype: string;
    readonly keywords: string;
    readonly symbols: string;
    readonly light: string;
    readonly shadow: string;
    readonly agency: string;
    readonly caution: string;
    readonly reflection: string;
  };
  readonly generatedPromptLabel: string;
  readonly interpretationLensLabel: string;
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
  readonly dailyQuestionLink: string;
  readonly socialImageAlt: string;
  readonly shareTitle: string;
  readonly shareText: string;
  readonly placeholderCardName: string;
  readonly placeholderCardTone: string;
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
    cardDetails: copy.cardDetails,
    cardMarkLabel: copy.cardMarkLabel,
    copied: copy.copied,
    copiedUrl: copy.copiedUrl,
    copyUrl: copy.copyUrl,
    copiedShareText: copy.copiedShareText,
    copyPrompt: copy.copyPrompt,
    contextCountLabel: copy.contextCountLabel,
    contextHelp: copy.contextHelp,
    contextLabel: copy.contextLabel,
    contextOptional: copy.contextOptional,
    contextPlaceholder: copy.contextPlaceholder,
    dailyQuestionLink: copy.dailyQuestionLink,
    deckPreviewNote: copy.deckPreviewNote,
    disclaimer: copy.disclaimer,
    drawButton: copy.drawButton,
    emptyBody: copy.emptyBody,
    emptyHeading: copy.emptyHeading,
    generatedPromptLabel: copy.generatedPromptLabel,
    heading: copy.heading,
    interpretationLensLabel: copy.interpretationLensLabel,
    instagramCopied: copy.instagramCopied,
    instagramShare: copy.instagramShare,
    intro: copy.intro,
    kakaoShare: copy.kakaoShare,
    kakaoShared: copy.kakaoShared,
    languageSwitchLabel: copy.languageSwitchLabel,
    personalizationHeading: copy.personalizationHeading,
    personalizationIntro: copy.personalizationIntro,
    placeholderCardName: copy.placeholderCardName,
    placeholderCardTone: copy.placeholderCardTone,
    promptPack: copy.promptPack,
    readingStyleSelectorLabel: copy.readingStyleSelectorLabel,
    share: copy.share,
    shared: copy.shared,
    shareText: copy.shareText,
    shareTitle: copy.shareTitle,
    socialImageAlt: copy.socialImageAlt,
    spreadSelectorLabel: copy.spreadSelectorLabel,
    topicSelectorLabel: copy.topicSelectorLabel,
    workspaceLabel: copy.workspaceLabel,
  };
}

export function getTarotReadingMetadata(locale: Locale): Metadata {
  const copy = copyJsonByLocale[locale];
  const { description, title } = copy.metadata;
  const image = {
    alt: copy.socialImageAlt,
    height: 630,
    url: getAbsoluteSiteUrl("/brand/tarot-spark-social-card.png"),
    width: 1200,
  };

  return withLocalizedAlternates(
    {
      ...copy.metadata,
      openGraph: {
        description,
        images: [image],
        locale: locale === "ko" ? "ko_KR" : "en_US",
        siteName: "tarot-spark",
        title,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        description,
        images: [image],
        title,
      },
    },
    locale,
  );
}
