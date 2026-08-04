import { GeneratorRoute } from "@/app/generator-route";
import {
  TarotExperience,
  type ReadingSearchParams,
} from "@/features/tarot-reading";
import { defaultLocale } from "@/i18n/config";

type HomeProps = {
  readonly searchParams?: Promise<ReadingSearchParams> | undefined;
};

export default function Home({ searchParams }: HomeProps = {}) {
  if (!searchParams) {
    return <TarotExperience locale={defaultLocale} />;
  }

  return <GeneratorRoute locale={defaultLocale} searchParams={searchParams} />;
}
