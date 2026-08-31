import { getLocalePath, type Locale } from "@/i18n/config";
import type { PublicQuestion } from "./types";

export const publicQuestionPathSegment = "tarot-questions";

export function getPublicQuestionPath(locale: Locale) {
  const localePath = getLocalePath(locale);

  return localePath === "/"
    ? `/${publicQuestionPathSegment}`
    : `${localePath}/${publicQuestionPathSegment}`;
}

export function getPublicQuestionReadingPath(
  locale: Locale,
  question: Pick<PublicQuestion, "id" | "topicId">,
) {
  const url = new URL(getLocalePath(locale), "https://tarot-spark.local");
  url.searchParams.set("topic", question.topicId);
  url.searchParams.set("question", question.id);

  return `${url.pathname}${url.search}`;
}
