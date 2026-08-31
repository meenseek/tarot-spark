import "server-only";

import type { Metadata } from "next";
import type { ReadingDomainId } from "@/domain/tarot";
import type { Locale } from "@/i18n/config";
import { getAbsoluteSiteUrl, withLocalizedAlternates } from "@/i18n/seo";
import enMessages from "@/messages/en/tarot-questions.json";
import koMessages from "@/messages/ko/tarot-questions.json";
import { getPublicQuestionPath } from "./paths";

type PublicQuestionExplorerMessages = {
  readonly metadata: {
    readonly title: string;
    readonly description: string;
  };
  readonly eyebrow: string;
  readonly title: string;
  readonly intro: string;
  readonly resultContext: string;
  readonly browseHeading: string;
  readonly categoryNavigationLabel: string;
  readonly disclaimer: string;
  readonly domains: Readonly<
    Record<ReadingDomainId, { readonly title: string; readonly intro: string }>
  >;
};

const messagesByLocale = {
  en: enMessages,
  ko: koMessages,
} satisfies Record<Locale, PublicQuestionExplorerMessages>;

export function getPublicQuestionExplorerCopy(locale: Locale) {
  const { metadata: _metadata, ...copy } = messagesByLocale[locale];
  return copy;
}

export function getPublicQuestionExplorerMetadata(locale: Locale): Metadata {
  const { description, title } = messagesByLocale[locale].metadata;
  const imageUrl = getAbsoluteSiteUrl("/brand/tarot-spark-social-card.png");

  return withLocalizedAlternates(
    {
      description,
      openGraph: {
        description,
        images: [
          {
            alt: title,
            height: 630,
            url: imageUrl,
            width: 1200,
          },
        ],
        locale: locale === "ko" ? "ko_KR" : "en_US",
        siteName: "tarot-spark",
        title,
        type: "website",
        url: getAbsoluteSiteUrl(getPublicQuestionPath(locale)),
      },
      title,
      twitter: {
        card: "summary_large_image",
        description,
        images: [imageUrl],
        title,
      },
    },
    locale,
    getPublicQuestionPath,
  );
}
