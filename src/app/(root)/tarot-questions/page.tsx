import {
  PublicQuestionExplorer,
  getPublicQuestionExplorerMetadata,
} from "@/features/reading-questions";
import { defaultLocale } from "@/i18n/config";

export const metadata = getPublicQuestionExplorerMetadata(defaultLocale);

export default function PublicQuestionExplorerPage() {
  return <PublicQuestionExplorer locale={defaultLocale} />;
}
