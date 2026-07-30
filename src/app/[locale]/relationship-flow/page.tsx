import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getRelationshipFlowMetadata,
  RelationshipFlowLanding,
} from "@/features/relationship-flow";
import { isPrefixedLocale } from "@/i18n/config";

type LocalizedRelationshipFlowPageProps = {
  readonly params: Promise<{
    readonly locale: string;
  }>;
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
}: LocalizedRelationshipFlowPageProps) {
  const { locale: rawLocale } = await params;

  if (!isPrefixedLocale(rawLocale)) {
    notFound();
  }

  return <RelationshipFlowLanding locale={rawLocale} />;
}
