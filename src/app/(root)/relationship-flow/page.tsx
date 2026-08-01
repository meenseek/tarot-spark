import {
  getRelationshipFlowMetadata,
  RelationshipFlowLanding,
} from "@/features/relationship-flow";
import {
  getReadingAttributionFromSearchParams,
  type ReadingSearchParams,
} from "@/features/tarot-reading/reading-state";
import { defaultLocale } from "@/i18n/config";

export const metadata = getRelationshipFlowMetadata(defaultLocale);

type RelationshipFlowPageProps = {
  readonly searchParams: Promise<ReadingSearchParams>;
};

export default async function RelationshipFlowPage({
  searchParams,
}: RelationshipFlowPageProps) {
  const attribution = getReadingAttributionFromSearchParams(await searchParams);

  return (
    <RelationshipFlowLanding attribution={attribution} locale={defaultLocale} />
  );
}
