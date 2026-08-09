export const publicPageIds = [
  "three-card-tarot-reading",
  "how-to-ask-tarot-questions",
  "tarot-card-combinations",
  "about",
  "privacy",
  "contact",
  "disclaimer",
] as const;

export const guidePageIds = [
  "three-card-tarot-reading",
  "how-to-ask-tarot-questions",
  "tarot-card-combinations",
] as const;

export type PublicPageId = (typeof publicPageIds)[number];
export type GuidePageId = (typeof guidePageIds)[number];

export function isPublicPageId(value: string): value is PublicPageId {
  return publicPageIds.includes(value as PublicPageId);
}
