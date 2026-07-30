import "server-only";

import type { Metadata } from "next";
import { getRelationshipFlowPath } from "@/features/relationship-flow";
import { getTarotReadingCopy } from "@/features/tarot-reading";
import type { Locale } from "@/i18n/config";
import { shareReadingPathSegment } from "@/i18n/routing";
import { getAbsoluteSiteUrl, getSiteUrl } from "@/i18n/seo";
import { formatTemplateStrict } from "@/i18n/template";
import { getShareReadingSnapshot, type ShareSearchParams } from "./state";

export function getShareReadingPath(locale: Locale) {
  return locale === "en"
    ? `/${shareReadingPathSegment}`
    : `/${locale}/${shareReadingPathSegment}`;
}

export function getShareReadingMetadata(
  locale: Locale,
  searchParams: ShareSearchParams,
): Metadata {
  const snapshot = getShareReadingSnapshot(locale, searchParams);
  const copy = getTarotReadingCopy(locale);
  const canonicalUrl = getAbsoluteSiteUrl(getRelationshipFlowPath(locale));
  const robots = {
    follow: true,
    index: false,
  } as const;

  if (!snapshot) {
    return {
      alternates: {
        canonical: canonicalUrl,
      },
      metadataBase: getSiteUrl(),
      robots,
      title: copy.shareTitle,
    };
  }

  const cardNames = snapshot.cards.map(({ card }) => card.name).join(", ");
  const description = formatTemplateStrict(
    copy.shareText,
    {
      cardNames,
      topicLabel: snapshot.topic.label,
    },
    `${locale} share metadata`,
  );
  const title = `${snapshot.topic.label}: ${cardNames} | ${copy.shareTitle}`;
  const imageUrl = getShareImageUrl(locale, snapshot);

  return {
    alternates: {
      canonical: canonicalUrl,
    },
    description,
    metadataBase: getSiteUrl(),
    openGraph: {
      description,
      images: [
        {
          alt: description,
          height: 630,
          url: imageUrl,
          width: 1200,
        },
      ],
      locale: locale === "ko" ? "ko_KR" : "en_US",
      siteName: "tarot-spark",
      title,
      type: "website",
      url: canonicalUrl,
    },
    robots,
    title,
    twitter: {
      card: "summary_large_image",
      description,
      images: [imageUrl],
      title,
    },
  };
}

function getShareImageUrl(
  locale: Locale,
  snapshot: NonNullable<ReturnType<typeof getShareReadingSnapshot>>,
) {
  const url = new URL("/api/share-image", getSiteUrl());
  url.searchParams.set("locale", locale);
  url.searchParams.set("topic", snapshot.topic.id);
  url.searchParams.set("spread", snapshot.spread.id);
  url.searchParams.set("style", snapshot.readingStyle.id);
  url.searchParams.set(
    "cards",
    snapshot.cards.map(({ card }) => card.id).join(","),
  );

  return url.toString();
}
