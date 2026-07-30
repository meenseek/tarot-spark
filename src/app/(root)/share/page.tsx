import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getRelationshipFlowPath } from "@/features/relationship-flow";
import {
  getShareReadingSnapshot,
  getShareReadingMetadata,
  type ShareSearchParams,
} from "@/features/share-reading";
import { TarotExperience } from "@/features/tarot-reading";
import { defaultLocale } from "@/i18n/config";

type ShareReadingPageProps = {
  readonly searchParams: Promise<ShareSearchParams>;
};

export async function generateMetadata({
  searchParams,
}: ShareReadingPageProps): Promise<Metadata> {
  return getShareReadingMetadata(defaultLocale, await searchParams);
}

export default async function ShareReadingPage({
  searchParams,
}: ShareReadingPageProps) {
  if (!getShareReadingSnapshot(defaultLocale, await searchParams)) {
    redirect(getRelationshipFlowPath(defaultLocale));
  }

  return <TarotExperience locale={defaultLocale} />;
}
