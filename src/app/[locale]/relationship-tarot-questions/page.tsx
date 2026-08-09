import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  RelationshipQuestionExplorer,
  getRelationshipQuestionExplorerMetadata,
} from "@/features/relationship-questions";
import { isPrefixedLocale, prefixedLocales } from "@/i18n/config";

type LocalizedRelationshipQuestionExplorerPageProps = {
  readonly params: Promise<{ readonly locale: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return prefixedLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LocalizedRelationshipQuestionExplorerPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;

  if (!isPrefixedLocale(rawLocale)) {
    return {};
  }

  return getRelationshipQuestionExplorerMetadata(rawLocale);
}

export default async function LocalizedRelationshipQuestionExplorerPage({
  params,
}: LocalizedRelationshipQuestionExplorerPageProps) {
  const { locale: rawLocale } = await params;

  if (!isPrefixedLocale(rawLocale)) {
    notFound();
  }

  return <RelationshipQuestionExplorer locale={rawLocale} />;
}
