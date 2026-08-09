import { getLocalePath, type Locale } from "@/i18n/config";
import type { RelationshipQuestion } from "./types";

export const relationshipQuestionPathSegment = "relationship-tarot-questions";

export function getRelationshipQuestionPath(locale: Locale) {
  const localePath = getLocalePath(locale);

  return localePath === "/"
    ? `/${relationshipQuestionPathSegment}`
    : `${localePath}/${relationshipQuestionPathSegment}`;
}

export function getRelationshipQuestionReadingPath(
  locale: Locale,
  question: Pick<RelationshipQuestion, "id" | "topicId">,
) {
  const url = new URL(getLocalePath(locale), "https://tarot-spark.local");
  url.searchParams.set("topic", question.topicId);
  url.searchParams.set("question", question.id);

  return `${url.pathname}${url.search}`;
}
