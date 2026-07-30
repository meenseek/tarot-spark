import { defaultLocale, type Locale } from "@/i18n/config";
import { getShareSiteUrl } from "@/i18n/seo";
import { getTarotData } from "@/i18n/tarot-data";
import {
  getPublicPageLinks,
  getPublicPageShellCopy,
} from "@/features/public-pages";
import { getDailyQuestionPath } from "@/features/daily-question";
import { TarotExperienceClient } from "./TarotExperienceClient";
import { getTarotReadingCopy } from "./i18n";

type TarotExperienceProps = {
  readonly locale?: Locale;
};

export function TarotExperience({
  locale = defaultLocale,
}: TarotExperienceProps) {
  const publicPageShellCopy = getPublicPageShellCopy(locale);

  return (
    <TarotExperienceClient
      copy={getTarotReadingCopy(locale)}
      dailyQuestionPath={getDailyQuestionPath(locale)}
      kakaoAllowedOrigins={getKakaoAllowedOrigins()}
      kakaoJavaScriptKey={getKakaoJavaScriptKey()}
      locale={locale}
      publicPageLinks={getPublicPageLinks(locale)}
      publicPageNavigationLabel={publicPageShellCopy.pageNavigationLabel}
      shareSiteUrl={getShareSiteUrl().toString()}
      tarotData={getTarotData(locale)}
    />
  );
}

function getKakaoJavaScriptKey() {
  const key = process.env["NEXT_PUBLIC_KAKAO_JS_KEY"]?.trim();

  if (!key || /^0+$/.test(key)) {
    return undefined;
  }

  return key;
}

function getKakaoAllowedOrigins() {
  const origins = process.env["NEXT_PUBLIC_KAKAO_ALLOWED_ORIGINS"]?.split(",");

  return (
    origins
      ?.map((origin) => getUrlOrigin(origin.trim()))
      .filter((origin): origin is string => Boolean(origin)) ?? []
  );
}

function getUrlOrigin(value: string) {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}
