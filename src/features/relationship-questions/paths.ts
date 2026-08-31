import { getLocalePath, type Locale } from "@/i18n/config";
import type { RelationshipQuestion } from "./types";
import { getPublicQuestionReadingPath } from "@/features/reading-questions/paths";

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
  return getPublicQuestionReadingPath(locale, question);
}
