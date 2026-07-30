import { getLocalePath, supportedLocales } from "@/i18n/config";
import { shareReadingPathSegment } from "@/i18n/routing";

const interactiveReadingPathnames = new Set(
  supportedLocales.flatMap((locale) => {
    const localePath = getLocalePath(locale);
    const sharePath =
      localePath === "/"
        ? `/${shareReadingPathSegment}`
        : `${localePath}/${shareReadingPathSegment}`;

    return [localePath, sharePath];
  }),
);

export function isInteractiveReadingPathname(pathname: string) {
  return interactiveReadingPathnames.has(pathname);
}
