import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getRelationshipFlowMetadata,
  RelationshipFlowLanding,
} from "@/features/relationship-flow";
import {
  getReadingAttributionFromSearchParams,
  type ReadingSearchParams,
} from "@/features/tarot-reading/reading-state";
import { isPrefixedLocale } from "@/i18n/config";

type LocalizedRelationshipFlowPageProps = {
  readonly params: Promise<{
    readonly locale: string;
  }>;
  readonly searchParams: Promise<ReadingSearchParams>;
};

export async function generateMetadata({
  params,
}: LocalizedRelationshipFlowPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;

  if (!isPrefixedLocale(rawLocale)) {
    return {};
  }

  return getRelationshipFlowMetadata(rawLocale);
}

export default async function LocalizedRelationshipFlowPage({
  params,
  searchParams,
}: LocalizedRelationshipFlowPageProps) {
  const [{ locale: rawLocale }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  if (!isPrefixedLocale(rawLocale)) {
    notFound();
  }

  return (
    <RelationshipFlowLanding
      attribution={getReadingAttributionFromSearchParams(resolvedSearchParams)}
      locale={rawLocale}
    />
  );
}
