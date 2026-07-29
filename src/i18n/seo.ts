import type { Metadata } from "next";
import {
  defaultLocale,
  getLocalePath,
  supportedLocales,
  type Locale,
} from "./config";

const fallbackSiteOrigin = "http://localhost:3000";

type AlternateLanguageUrls = Record<Locale | "x-default", string>;
type LocalizedPathResolver = (locale: Locale) => string;

export function getSiteUrl(): URL {
  return normalizeSiteUrl(
    process.env["NEXT_PUBLIC_SITE_URL"] ??
      getVercelSiteOrigin(process.env["VERCEL_PROJECT_PRODUCTION_URL"]) ??
      getVercelSiteOrigin(process.env["VERCEL_URL"]) ??
      fallbackSiteOrigin,
  );
}

export function getShareSiteUrl(): URL {
  const siteUrl = getSiteUrl();

  return normalizeSiteUrl(
    process.env["NEXT_PUBLIC_SHARE_SITE_URL"] ?? siteUrl.toString(),
    siteUrl.toString(),
  );
}

export function getAbsoluteSiteUrl(pathname: string) {
  return new URL(pathname, getSiteUrl()).toString();
}

export function getAbsoluteLocaleUrl(locale: Locale) {
  return getAbsoluteSiteUrl(getLocalePath(locale));
}

export function getAbsoluteAlternateLanguageUrls(
  getLocalizedPath: LocalizedPathResolver = getLocalePath,
): AlternateLanguageUrls {
  return {
    ...Object.fromEntries(
      supportedLocales.map((locale) => [
        locale,
        getAbsoluteSiteUrl(getLocalizedPath(locale)),
      ]),
    ),
    "x-default": getAbsoluteSiteUrl(getLocalizedPath(defaultLocale)),
  } as AlternateLanguageUrls;
}

export function withLocalizedAlternates(
  metadata: Metadata,
  locale: Locale,
  getLocalizedPath: LocalizedPathResolver = getLocalePath,
): Metadata {
  return {
    ...metadata,
    metadataBase: getSiteUrl(),
    alternates: {
      ...metadata.alternates,
      canonical: getAbsoluteSiteUrl(getLocalizedPath(locale)),
      languages: getAbsoluteAlternateLanguageUrls(getLocalizedPath),
    },
  };
}

function getVercelSiteOrigin(vercelUrl: string | undefined) {
  return vercelUrl ? `https://${vercelUrl}` : undefined;
}

function normalizeSiteUrl(value: string, fallback = fallbackSiteOrigin) {
  try {
    const url = new URL(value);
    url.pathname = normalizePathname(url.pathname);
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return new URL(fallback);
  }
}

function normalizePathname(pathname: string) {
  return pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
}
