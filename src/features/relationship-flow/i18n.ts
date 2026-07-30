import "server-only";

import type { Metadata } from "next";
import { getLocalePath, type Locale } from "@/i18n/config";
import { relationshipFlowPathSegment } from "@/i18n/routing";
import { getAbsoluteSiteUrl, withLocalizedAlternates } from "@/i18n/seo";
import enMessages from "@/messages/en/relationship-flow.json";
import koMessages from "@/messages/ko/relationship-flow.json";

type RelationshipFlowItem = {
  readonly title: string;
  readonly body: string;
};

type RelationshipFlowFaq = {
  readonly question: string;
  readonly answer: string;
};

export type RelationshipFlowCopy = {
  readonly metadata: {
    readonly title: string;
    readonly description: string;
  };
  readonly eyebrow: string;
  readonly heading: string;
  readonly intro: string;
  readonly benefitsHeading: string;
  readonly benefits: readonly RelationshipFlowItem[];
  readonly stepsHeading: string;
  readonly steps: readonly RelationshipFlowItem[];
  readonly exampleEyebrow: string;
  readonly exampleHeading: string;
  readonly exampleBody: string;
  readonly faqHeading: string;
  readonly faqs: readonly RelationshipFlowFaq[];
  readonly ctaHeading: string;
  readonly ctaBody: string;
  readonly ctaButton: string;
  readonly privacyNote: string;
  readonly disclaimer: string;
};

const messagesByLocale = {
  en: enMessages,
  ko: koMessages,
} satisfies Record<Locale, RelationshipFlowCopy>;

export function getRelationshipFlowCopy(locale: Locale) {
  return messagesByLocale[locale];
}

export function getRelationshipFlowPath(locale: Locale) {
  const localePath = getLocalePath(locale);

  return localePath === "/"
    ? `/${relationshipFlowPathSegment}`
    : `${localePath}/${relationshipFlowPathSegment}`;
}

export function getRelationshipFlowReadingPath(locale: Locale) {
  return `${getLocalePath(locale)}?topic=relationship-flow&spread=deep&style=relational`;
}

export function getRelationshipFlowMetadata(locale: Locale): Metadata {
  const copy = getRelationshipFlowCopy(locale);
  const imageUrl = getAbsoluteSiteUrl("/brand/tarot-spark-social-card.png");

  return withLocalizedAlternates(
    {
      ...copy.metadata,
      openGraph: {
        description: copy.metadata.description,
        images: [
          {
            alt: copy.heading,
            height: 630,
            url: imageUrl,
            width: 1200,
          },
        ],
        locale: locale === "ko" ? "ko_KR" : "en_US",
        siteName: "tarot-spark",
        title: copy.metadata.title,
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        description: copy.metadata.description,
        images: [imageUrl],
        title: copy.metadata.title,
      },
    },
    locale,
    getRelationshipFlowPath,
  );
}
