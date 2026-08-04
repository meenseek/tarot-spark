import {
  TarotExperience,
  getReadingAttributionFromSearchParams,
  getReadingStateFromSearchParams,
  type ReadingSearchParams,
} from "@/features/tarot-reading";
import type { Locale } from "@/i18n/config";
import { getTarotData } from "@/i18n/tarot-data";

type GeneratorRouteProps = {
  readonly locale: Locale;
  readonly searchParams: Promise<ReadingSearchParams>;
};

export async function GeneratorRoute({
  locale,
  searchParams,
}: GeneratorRouteProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <TarotExperience
      initialAttribution={getReadingAttributionFromSearchParams(
        resolvedSearchParams,
      )}
      initialReadingState={getReadingStateFromSearchParams(
        getTarotData(locale),
        resolvedSearchParams,
      )}
      locale={locale}
    />
  );
}
