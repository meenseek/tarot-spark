import { defaultLocale, type Locale } from "@/i18n/config";
import { getShareSiteUrl } from "@/i18n/seo";
import { getTarotData } from "@/i18n/tarot-data";
import {
  getPublicPageLinks,
  getPublicPageShellCopy,
} from "@/features/public-pages";
import { getDailyQuestionPath } from "@/features/daily-question";
import { getRelationshipQuestionCatalog } from "@/features/relationship-questions";
import { isInstantReadingEnabled } from "@/server/instant-reading-config";
import { TarotExperienceClient } from "./TarotExperienceClient";
import { getTarotReadingCopy } from "./i18n";
import {
  getPrivateContextHandoffResetScript,
  type ReadingUrlAttribution,
  type ReadingUrlState,
} from "./reading-state";

export type TarotExperienceViewMode = "generator" | "shared";

type TarotExperienceProps = {
  readonly initialAttribution?: ReadingUrlAttribution | undefined;
  readonly initialReadingState?: ReadingUrlState | undefined;
  readonly locale?: Locale;
  readonly viewMode?: TarotExperienceViewMode;
};

export function TarotExperience({
  initialAttribution,
  initialReadingState,
  locale = defaultLocale,
  viewMode = "generator",
}: TarotExperienceProps) {
  const publicPageShellCopy = getPublicPageShellCopy(locale);

  return (
    <>
      {viewMode === "shared" ? (
        <script
          dangerouslySetInnerHTML={{
            __html: getPrivateContextHandoffResetScript(),
          }}
        />
      ) : null}
      <TarotExperienceClient
        copy={getTarotReadingCopy(locale)}
        dailyQuestionPath={getDailyQuestionPath(locale)}
        instantReadingEnabled={locale === "ko" && isInstantReadingEnabled()}
        initialAttribution={initialAttribution}
        initialReadingState={initialReadingState}
        kakaoAllowedOrigins={getKakaoAllowedOrigins()}
        kakaoJavaScriptKey={getKakaoJavaScriptKey()}
        key={getExperienceKey(
          locale,
          viewMode,
          initialReadingState,
          initialAttribution,
        )}
        locale={locale}
        publicPageLinks={getPublicPageLinks(locale)}
        publicPageNavigationLabel={publicPageShellCopy.pageNavigationLabel}
        relationshipQuestions={getRelationshipQuestionCatalog(locale).questions}
        shareSiteUrl={getShareSiteUrl().toString()}
        tarotData={getTarotData(locale)}
        viewMode={viewMode}
      />
    </>
  );
}

function getExperienceKey(
  locale: Locale,
  viewMode: TarotExperienceViewMode,
  readingState: ReadingUrlState | undefined,
  attribution: ReadingUrlAttribution | undefined,
) {
  return JSON.stringify({
    attribution,
    locale,
    readingState: readingState
      ? {
          ...readingState,
          cards: readingState.cards.map(({ card }) => card.id),
        }
      : undefined,
    viewMode,
  });
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
