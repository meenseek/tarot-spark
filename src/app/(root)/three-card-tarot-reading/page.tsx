import { PublicPage, getPublicPageMetadata } from "@/features/public-pages";
import { defaultLocale } from "@/i18n/config";

export const metadata = getPublicPageMetadata(
  defaultLocale,
  "three-card-tarot-reading",
);

export default function ThreeCardTarotReadingPage() {
  return (
    <PublicPage locale={defaultLocale} pageId="three-card-tarot-reading" />
  );
}
