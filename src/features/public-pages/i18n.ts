import "server-only";

import type { Metadata } from "next";
import { getLocalePath, type Locale } from "@/i18n/config";
import { withLocalizedAlternates } from "@/i18n/seo";
import enMessages from "@/messages/en/public-pages.json";
import koMessages from "@/messages/ko/public-pages.json";
import type { PublicPageId } from "./ids";
import { publicPageIds } from "./ids";
import type { PublicPageContent, PublicPageLink } from "./types";

type RawPublicPageMessages = {
  readonly brand: string;
  readonly homeLabel: string;
  readonly languageSwitchLabel: string;
  readonly pageNavigationLabel: string;
  readonly pages: Record<
    PublicPageId,
    PublicPageContent & {
      readonly metadata: {
        readonly title: string;
        readonly description: string;
      };
      readonly linkLabel: string;
    }
  >;
};

const messagesByLocale = {
  en: enMessages,
  ko: koMessages,
} satisfies Record<Locale, RawPublicPageMessages>;

export function getPublicPageContent(
  locale: Locale,
  pageId: PublicPageId,
): PublicPageContent {
  const page = messagesByLocale[locale].pages[pageId];

  return {
    intro: page.intro,
    sections: page.sections,
    title: page.title,
  };
}

export function getPublicPageMetadata(
  locale: Locale,
  pageId: PublicPageId,
): Metadata {
  return withLocalizedAlternates(
    messagesByLocale[locale].pages[pageId].metadata,
    locale,
    (targetLocale) => getPublicPagePath(targetLocale, pageId),
  );
}

export function getPublicPageLinks(locale: Locale): readonly PublicPageLink[] {
  return publicPageIds.map((pageId) => ({
    href: getPublicPagePath(locale, pageId),
    label: messagesByLocale[locale].pages[pageId].linkLabel,
  }));
}

export function getPublicPageShellCopy(locale: Locale) {
  const messages = messagesByLocale[locale];

  return {
    brand: messages.brand,
    homeLabel: messages.homeLabel,
    languageSwitchLabel: messages.languageSwitchLabel,
    pageNavigationLabel: messages.pageNavigationLabel,
  };
}

export function getPublicPagePath(locale: Locale, pageId: PublicPageId) {
  const localePath = getLocalePath(locale);

  return localePath === "/" ? `/${pageId}` : `${localePath}/${pageId}`;
}
