import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  DailyQuestion,
  getDailyQuestionMetadata,
} from "@/features/daily-question";
import { isPrefixedLocale, prefixedLocales } from "@/i18n/config";

type LocalizedDailyQuestionPageProps = {
  readonly params: Promise<{
    readonly locale: string;
  }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return prefixedLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LocalizedDailyQuestionPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;

  if (!isPrefixedLocale(rawLocale)) {
    return {};
  }

  return getDailyQuestionMetadata(rawLocale);
}

export default async function LocalizedDailyQuestionPage({
  params,
}: LocalizedDailyQuestionPageProps) {
  const { locale: rawLocale } = await params;

  if (!isPrefixedLocale(rawLocale)) {
    notFound();
  }

  return <DailyQuestion locale={rawLocale} />;
}
