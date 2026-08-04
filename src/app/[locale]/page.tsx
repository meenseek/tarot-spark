import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { GeneratorRoute } from "@/app/generator-route";
import {
  getTarotReadingMetadata,
  type ReadingSearchParams,
} from "@/features/tarot-reading";
import { isPrefixedLocale, prefixedLocales } from "@/i18n/config";

type LocalePageProps = {
  readonly params: Promise<{
    readonly locale: string;
  }>;
  readonly searchParams: Promise<ReadingSearchParams>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return prefixedLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Pick<LocalePageProps, "params">): Promise<Metadata> {
  const { locale: rawLocale } = await params;

  if (!isPrefixedLocale(rawLocale)) {
    return {};
  }

  return getTarotReadingMetadata(rawLocale);
}

export default async function LocalePage({
  params,
  searchParams,
}: LocalePageProps) {
  const { locale: rawLocale } = await params;

  if (!isPrefixedLocale(rawLocale)) {
    notFound();
  }

  return (
    <GeneratorRoute
      key={rawLocale}
      locale={rawLocale}
      searchParams={searchParams}
    />
  );
}
