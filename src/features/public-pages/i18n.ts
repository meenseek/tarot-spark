import "server-only";

import type { Metadata } from "next";
import { getLocalePath, type Locale } from "@/i18n/config";
import { withLocalizedAlternates } from "@/i18n/seo";
import enMessages from "@/messages/en/public-pages.json";
import koMessages from "@/messages/ko/public-pages.json";
import type { GuidePageId, PublicPageId } from "./ids";
import { guidePageIds, publicPageIds } from "./ids";
import type { PublicPageContent, PublicPageCta, PublicPageLink } from "./types";

type GuideRelatedTarget = GuidePageId | "relationship-flow";
type GuideRouteConfig = {
  readonly relatedTargets: readonly GuideRelatedTarget[];
  readonly ctaSpreadId?: "quick" | "deep";
};

const guideRouteConfig = {
  "three-card-tarot-reading": {
    relatedTargets: [
      "how-to-ask-tarot-questions",
      "tarot-card-combinations",
      "relationship-flow",
    ],
    ctaSpreadId: "quick",
  },
  "how-to-ask-tarot-questions": {
    relatedTargets: [
      "three-card-tarot-reading",
      "tarot-card-combinations",
      "relationship-flow",
    ],
  },
  "tarot-card-combinations": {
    relatedTargets: [
      "three-card-tarot-reading",
      "how-to-ask-tarot-questions",
      "relationship-flow",
    ],
    ctaSpreadId: "deep",
  },
} as const satisfies Record<GuidePageId, GuideRouteConfig>;

type RawPublicPageContent = Omit<PublicPageContent, "cta" | "related"> & {
  readonly cta?: Omit<PublicPageCta, "href">;
  readonly related?: {
    readonly heading: string;
    readonly labels: readonly string[];
  };
};

type RawPublicPageMessages = {
  readonly brand: string;
  readonly homeLabel: string;
  readonly languageSwitchLabel: string;
  readonly pageNavigationLabel: string;
  readonly pages: Record<
    PublicPageId,
    RawPublicPageContent & {
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
  const page: RawPublicPageMessages["pages"][PublicPageId] =
    messagesByLocale[locale].pages[pageId];

  return {
    intro: page.intro,
    sections: page.sections,
    title: page.title,
    ...(page.disclaimer ? { disclaimer: page.disclaimer } : {}),
    ...(page.cta
      ? { cta: { ...page.cta, href: getGuideCtaPath(locale, pageId) } }
      : {}),
    ...(page.related
      ? {
          related: {
            heading: page.related.heading,
            links: getGuideRelatedLinks(locale, pageId, page.related.labels),
          },
        }
      : {}),
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

function getGuideCtaPath(locale: Locale, pageId: PublicPageId) {
  const localePath = getLocalePath(locale);
  const config = getGuideRouteConfig(pageId);

  return config.ctaSpreadId
    ? `${localePath}?spread=${config.ctaSpreadId}`
    : localePath;
}

function getGuideRelatedLinks(
  locale: Locale,
  pageId: PublicPageId,
  labels: readonly string[],
): readonly PublicPageLink[] {
  const targets = getGuideRouteConfig(pageId).relatedTargets;

  if (targets.length !== labels.length) {
    throw new Error(`Guide link labels do not match targets for ${pageId}.`);
  }

  return targets.map((target, index) => {
    const label = labels[index];

    if (!label) {
      throw new Error(`Guide link label ${index} is missing for ${pageId}.`);
    }

    return {
      href: getGuideRelatedPath(locale, target),
      label,
    };
  });
}

function getGuideRouteConfig(pageId: PublicPageId): GuideRouteConfig {
  if (!guidePageIds.includes(pageId as GuidePageId)) {
    throw new Error(`Public page ${pageId} does not have guide routing.`);
  }

  return guideRouteConfig[pageId as GuidePageId];
}

function getGuideRelatedPath(locale: Locale, target: GuideRelatedTarget) {
  if (target !== "relationship-flow") {
    return getPublicPagePath(locale, target);
  }

  const localePath = getLocalePath(locale);
  return localePath === "/"
    ? "/relationship-flow"
    : `${localePath}/relationship-flow`;
}
