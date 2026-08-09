import {
  RelationshipQuestionExplorer,
  getRelationshipQuestionExplorerMetadata,
} from "@/features/relationship-questions";
import { defaultLocale } from "@/i18n/config";

export const metadata = getRelationshipQuestionExplorerMetadata(defaultLocale);

export default function RelationshipQuestionExplorerPage() {
  return <RelationshipQuestionExplorer locale={defaultLocale} />;
}
