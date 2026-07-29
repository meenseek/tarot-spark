import {
  DailyQuestion,
  getDailyQuestionMetadata,
} from "@/features/daily-question";
import { defaultLocale } from "@/i18n/config";

export const metadata = getDailyQuestionMetadata(defaultLocale);

export default function DailyQuestionPage() {
  return <DailyQuestion locale={defaultLocale} />;
}
