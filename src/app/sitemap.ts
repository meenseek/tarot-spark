import type { MetadataRoute } from "next";
import {
  getPublicPagePath,
  guidePageIds,
  publicPageIds,
} from "@/features/public-pages";
import { getRelationshipFlowPath } from "@/features/relationship-flow";
import { getRelationshipQuestionPath } from "@/features/relationship-questions";
import { getPublicQuestionPath } from "@/features/reading-questions";
import { defaultLocale, supportedLocales } from "@/i18n/config";
import {
  getAbsoluteAlternateLanguageUrls,
  getAbsoluteLocaleUrl,
  getAbsoluteSiteUrl,
} from "@/i18n/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const homeLanguages = getAbsoluteAlternateLanguageUrls();

  return [
    ...supportedLocales.map((locale) => ({
      url: getAbsoluteLocaleUrl(locale),
      alternates: {
        languages: homeLanguages,
      },
      changeFrequency: "weekly" as const,
      priority: locale === defaultLocale ? 1 : 0.9,
    })),
    ...publicPageIds.flatMap((pageId) => {
      const languages = getAbsoluteAlternateLanguageUrls((locale) =>
        getPublicPagePath(locale, pageId),
      );
      const isGuide = guidePageIds.some((guideId) => guideId === pageId);

      return supportedLocales.map((locale) => ({
        url: getAbsoluteSiteUrl(getPublicPagePath(locale, pageId)),
        alternates: {
          languages,
        },
        changeFrequency: isGuide ? ("weekly" as const) : ("monthly" as const),
        priority: isGuide
          ? locale === defaultLocale
            ? 0.9
            : 0.85
          : locale === defaultLocale
            ? 0.7
            : 0.65,
      }));
    }),
    ...supportedLocales.map((locale) => ({
      url: getAbsoluteSiteUrl(getPublicQuestionPath(locale)),
      alternates: {
        languages: getAbsoluteAlternateLanguageUrls(getPublicQuestionPath),
      },
      changeFrequency: "weekly" as const,
      priority: locale === defaultLocale ? 0.95 : 0.9,
    })),
    ...supportedLocales.map((locale) => ({
      url: getAbsoluteSiteUrl(getRelationshipQuestionPath(locale)),
      alternates: {
        languages: getAbsoluteAlternateLanguageUrls(
          getRelationshipQuestionPath,
        ),
      },
      changeFrequency: "weekly" as const,
      priority: locale === defaultLocale ? 0.9 : 0.85,
    })),
    ...supportedLocales.map((locale) => ({
      url: getAbsoluteSiteUrl(getRelationshipFlowPath(locale)),
      alternates: {
        languages: getAbsoluteAlternateLanguageUrls(getRelationshipFlowPath),
      },
      changeFrequency: "weekly" as const,
      priority: locale === defaultLocale ? 0.85 : 0.8,
    })),
  ];
}
