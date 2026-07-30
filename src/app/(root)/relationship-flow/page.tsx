import {
  getRelationshipFlowMetadata,
  RelationshipFlowLanding,
} from "@/features/relationship-flow";
import { defaultLocale } from "@/i18n/config";

export const metadata = getRelationshipFlowMetadata(defaultLocale);

export default function RelationshipFlowPage() {
  return <RelationshipFlowLanding locale={defaultLocale} />;
}
