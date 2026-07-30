import type { ReadingStyle, ReadingStyleId } from "./types";

export function getDefaultReadingStyle(styles: readonly ReadingStyle[]) {
  return getReadingStyle(styles, "balanced");
}

export function getReadingStyle(
  styles: readonly ReadingStyle[],
  styleId: ReadingStyleId,
) {
  const style = styles.find((candidate) => candidate.id === styleId);

  if (!style) {
    throw new RangeError(`Unknown tarot reading style: ${styleId}`);
  }

  return style;
}
