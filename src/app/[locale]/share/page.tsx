import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getRelationshipFlowPath } from "@/features/relationship-flow";
import {
  getShareReadingMetadata,
  getShareReadingSnapshot,
  type ShareSearchParams,
} from "@/features/share-reading";
import { TarotExperience } from "@/features/tarot-reading";
import { isPrefixedLocale } from "@/i18n/config";

type LocalizedShareReadingPageProps = {
  readonly params: Promise<{
    readonly locale: string;
  }>;
  readonly searchParams: Promise<ShareSearchParams>;
};

export async function generateMetadata({
  params,
  searchParams,
}: LocalizedShareReadingPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;

  if (!isPrefixedLocale(rawLocale)) {
    return {};
  }

  return getShareReadingMetadata(rawLocale, await searchParams);
}

export default async function LocalizedShareReadingPage({
  params,
  searchParams,
}: LocalizedShareReadingPageProps) {
  const { locale: rawLocale } = await params;

  if (!isPrefixedLocale(rawLocale)) {
    notFound();
  }

  if (!getShareReadingSnapshot(rawLocale, await searchParams)) {
    redirect(getRelationshipFlowPath(rawLocale));
  }

  return <TarotExperience locale={rawLocale} />;
}
