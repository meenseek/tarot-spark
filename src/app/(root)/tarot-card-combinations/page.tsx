import { PublicPage, getPublicPageMetadata } from "@/features/public-pages";
import { defaultLocale } from "@/i18n/config";

export const metadata = getPublicPageMetadata(
  defaultLocale,
  "tarot-card-combinations",
);

export default function TarotCardCombinationsPage() {
  return <PublicPage locale={defaultLocale} pageId="tarot-card-combinations" />;
}
