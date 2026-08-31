import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  PublicQuestionExplorer,
  getPublicQuestionExplorerMetadata,
} from "@/features/reading-questions";
import { isPrefixedLocale, prefixedLocales } from "@/i18n/config";

type LocalizedPublicQuestionExplorerPageProps = {
  readonly params: Promise<{ readonly locale: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return prefixedLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LocalizedPublicQuestionExplorerPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;

  if (!isPrefixedLocale(rawLocale)) {
    return {};
  }

  return getPublicQuestionExplorerMetadata(rawLocale);
}

export default async function LocalizedPublicQuestionExplorerPage({
  params,
}: LocalizedPublicQuestionExplorerPageProps) {
  const { locale: rawLocale } = await params;

  if (!isPrefixedLocale(rawLocale)) {
    notFound();
  }

  return <PublicQuestionExplorer locale={rawLocale} />;
}
