import { PublicPage, getPublicPageMetadata } from "@/features/public-pages";
import { defaultLocale } from "@/i18n/config";

export const metadata = getPublicPageMetadata(
  defaultLocale,
  "how-to-ask-tarot-questions",
);

export default function HowToAskTarotQuestionsPage() {
  return (
    <PublicPage locale={defaultLocale} pageId="how-to-ask-tarot-questions" />
  );
}
