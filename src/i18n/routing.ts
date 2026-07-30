import {
  dailyQuestionPathSegment,
  isDailyQuestionPathSegment,
} from "@/features/daily-question/paths";
import { isPublicPageId, publicPageIds } from "@/features/public-pages/ids";

export const relationshipFlowPathSegment = "relationship-flow";
export const shareReadingPathSegment = "share";

export const localizedSecondLevelPathSegments = [
  ...publicPageIds,
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
    isDailyQuestionPathSegment(value) ||
    value === relationshipFlowPathSegment ||
    value === shareReadingPathSegment
  );
}
