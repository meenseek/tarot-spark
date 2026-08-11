import type { AnswerTargetId } from "./taxonomy";
import type { AnswerTarget } from "./types";

export function getAnswerTarget(
  answerTargets: readonly AnswerTarget[],
  answerTargetId: AnswerTargetId,
): AnswerTarget {
  const answerTarget = answerTargets.find(
    (candidate) => candidate.id === answerTargetId,
  );

  if (!answerTarget) {
    throw new RangeError(`Unknown answer target: ${answerTargetId}`);
  }

  return answerTarget;
}
