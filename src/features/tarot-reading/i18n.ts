import "server-only";

import type { Metadata } from "next";
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
  readonly contextEmptySummary: string;
  readonly contextFilledSummary: string;
  readonly contextHelp: string;
  readonly contextCountLabel: string;
  readonly topicSelectorLabel: string;
  readonly topicSelectorDescription: string;
  readonly topicSelectLabel: string;
  readonly topicGroupRelationship: string;
  readonly topicGroupCareer: string;
  readonly questionPickerSummary: string;
  readonly questionPickerOptional: string;
  readonly questionPickerIntro: string;
  readonly selectedQuestionLabel: string;
  readonly selectedQuestionFocusLabel: string;
  readonly clearQuestionLabel: string;
  readonly cardCountLabel: string;
  readonly drawButton: string;
  readonly drawStatus: string;
  readonly resultHeading: string;
  readonly cardOverviewLabel: string;
  readonly currentReadingSettings: string;
  readonly customizeCurrent: string;
  readonly customizeCurrentIntro: string;
  readonly editNextReading: string;
  readonly editNextHeading: string;
  readonly editNextIntro: string;
  readonly cancelEdit: string;
  readonly workspaceLabel: string;
  readonly cardMarkLabel: string;
  readonly sharedReading: {
    readonly heading: string;
    readonly intro: string;
    readonly createOwn: string;
  };
  readonly instantReading: {
    readonly heading: string;
    readonly intro: string;
    readonly generate: string;
    readonly loading: string;
    readonly cancel: string;
    readonly retry: string;
    readonly unavailable: string;
    readonly disclosure: string;
    readonly resultHeading: string;
  };
  readonly promptReady: string;
  readonly promptContextIncluded: string;
  readonly promptCopySuccess: string;
  readonly promptContentDisclosure: string;
  readonly promptContentClose: string;
  readonly cardDetailsDisclosure: string;
  readonly shareOptionsDisclosure: string;
  readonly cardDetails: {
    readonly meaning: string;
    readonly reflection: string;
  };
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
  readonly promptCopyBlockedAction: string;
  readonly shareBlockedAction: string;
  readonly manualShareUrlLabel: string;
  readonly emptyHeading: string;
  readonly emptyBody: string;
  readonly disclaimer: string;
  readonly languageSwitchLabel: string;
  readonly dailyQuestionLink: string;
  readonly socialImageAlt: string;
  readonly shareTitle: string;
  readonly shareText: string;
  readonly placeholderCardName: string;
};

export type TarotReadingCopy = Omit<TarotReadingMessages, "metadata">;

const copyJsonByLocale = {
  en: enCopy,
  ko: koCopy,
} satisfies Record<Locale, TarotReadingMessages>;

export function getTarotReadingCopy(locale: Locale): TarotReadingCopy {
  const copy = copyJsonByLocale[locale];

  return {
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
    contextEmptySummary: copy.contextEmptySummary,
    contextFilledSummary: copy.contextFilledSummary,
    contextHelp: copy.contextHelp,
    contextLabel: copy.contextLabel,
    contextOptional: copy.contextOptional,
    currentReadingSettings: copy.currentReadingSettings,
    customizeCurrent: copy.customizeCurrent,
    customizeCurrentIntro: copy.customizeCurrentIntro,
    dailyQuestionLink: copy.dailyQuestionLink,
    deckPreviewNote: copy.deckPreviewNote,
    disclaimer: copy.disclaimer,
    drawButton: copy.drawButton,
    drawStatus: copy.drawStatus,
    editNextHeading: copy.editNextHeading,
    editNextIntro: copy.editNextIntro,
    editNextReading: copy.editNextReading,
    cancelEdit: copy.cancelEdit,
    emptyBody: copy.emptyBody,
    emptyHeading: copy.emptyHeading,
    generatedPromptLabel: copy.generatedPromptLabel,
    heading: copy.heading,
    instagramCopied: copy.instagramCopied,
    instagramShare: copy.instagramShare,
    instantReading: copy.instantReading,
    intro: copy.intro,
    kakaoShare: copy.kakaoShare,
    kakaoShared: copy.kakaoShared,
    languageSwitchLabel: copy.languageSwitchLabel,
    manualShareUrlLabel: copy.manualShareUrlLabel,
    personalizationHeading: copy.personalizationHeading,
    personalizationIntro: copy.personalizationIntro,
    placeholderCardName: copy.placeholderCardName,
    promptReady: copy.promptReady,
    promptContextIncluded: copy.promptContextIncluded,
    promptCopySuccess: copy.promptCopySuccess,
    promptContentDisclosure: copy.promptContentDisclosure,
    promptContentClose: copy.promptContentClose,
    promptCopyBlockedAction: copy.promptCopyBlockedAction,
    readingStyleSelectorLabel: copy.readingStyleSelectorLabel,
    resultHeading: copy.resultHeading,
    cardOverviewLabel: copy.cardOverviewLabel,
    sharedReading: copy.sharedReading,
    share: copy.share,
    shareOptionsDisclosure: copy.shareOptionsDisclosure,
    shareBlockedAction: copy.shareBlockedAction,
    shared: copy.shared,
    shareText: copy.shareText,
    shareTitle: copy.shareTitle,
    socialImageAlt: copy.socialImageAlt,
    spreadSelectorLabel: copy.spreadSelectorLabel,
    cardDetailsDisclosure: copy.cardDetailsDisclosure,
    topicSelectorLabel: copy.topicSelectorLabel,
    topicSelectorDescription: copy.topicSelectorDescription,
    topicSelectLabel: copy.topicSelectLabel,
    topicGroupRelationship: copy.topicGroupRelationship,
    topicGroupCareer: copy.topicGroupCareer,
    questionPickerSummary: copy.questionPickerSummary,
    questionPickerOptional: copy.questionPickerOptional,
    questionPickerIntro: copy.questionPickerIntro,
    selectedQuestionLabel: copy.selectedQuestionLabel,
    selectedQuestionFocusLabel: copy.selectedQuestionFocusLabel,
    clearQuestionLabel: copy.clearQuestionLabel,
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
