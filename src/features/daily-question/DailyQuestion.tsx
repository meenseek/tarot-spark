import {
  getPublicPageLinks,
  getPublicPageShellCopy,
} from "@/features/public-pages";
import { getTarotData } from "@/i18n/tarot-data";
import type { Locale } from "@/i18n/config";
import { DailyQuestionClient } from "./DailyQuestionClient";
import { getDailyQuestionCopy } from "./i18n";

type DailyQuestionProps = {
  readonly locale: Locale;
};

export function DailyQuestion({ locale }: DailyQuestionProps) {
  const publicPageShellCopy = getPublicPageShellCopy(locale);

  return (
    <DailyQuestionClient
      copy={getDailyQuestionCopy(locale)}
      locale={locale}
      publicPageLinks={getPublicPageLinks(locale)}
      publicPageNavigationLabel={publicPageShellCopy.pageNavigationLabel}
      skipToContentLabel={publicPageShellCopy.skipToContentLabel}
      tarotData={getTarotData(locale)}
    />
  );
}
