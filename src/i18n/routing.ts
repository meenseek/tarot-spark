import {
  dailyQuestionPathSegment,
  isDailyQuestionPathSegment,
} from "@/features/daily-question/paths";
import { isPublicPageId, publicPageIds } from "@/features/public-pages/ids";
import { relationshipQuestionPathSegment } from "@/features/relationship-questions/paths";

export const relationshipFlowPathSegment = "relationship-flow";
export const shareReadingPathSegment = "share";

export const localizedSecondLevelPathSegments = [
  ...publicPageIds,
  relationshipQuestionPathSegment,
  dailyQuestionPathSegment,
  relationshipFlowPathSegment,
  shareReadingPathSegment,
] as const;

export type LocalizedSecondLevelPathSegment =
  (typeof localizedSecondLevelPathSegments)[number];

export function isLocalizedSecondLevelPathSegment(
  value: string,
): value is LocalizedSecondLevelPathSegment {
  return (
    isPublicPageId(value) ||
    value === relationshipQuestionPathSegment ||
    isDailyQuestionPathSegment(value) ||
    value === relationshipFlowPathSegment ||
    value === shareReadingPathSegment
  );
}
