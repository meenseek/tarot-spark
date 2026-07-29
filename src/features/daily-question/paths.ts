import { defaultLocale, getLocalePath, type Locale } from "@/i18n/config";

export const dailyQuestionPathSegment = "daily";

export function isDailyQuestionPathSegment(
  value: string,
): value is typeof dailyQuestionPathSegment {
  return value === dailyQuestionPathSegment;
}

export function getDailyQuestionPath(locale: Locale) {
  const localePath = getLocalePath(locale);

  return locale === defaultLocale
    ? `/${dailyQuestionPathSegment}`
    : `${localePath}/${dailyQuestionPathSegment}`;
}
