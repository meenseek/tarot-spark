// v1 and v2 remain immutable. v3 is the complete illustrated 78-card deck.
export const legacyShareImageVersion = "1";
export const completeDeckLegacyShareImageVersion = "2";
export const shareImageVersion = "3";
export const shareImageVersionParam = "v";
export const versionedShareImageCacheControl =
  "public, max-age=31536000, immutable";
export const legacyShareImageCacheControl =
  "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800";
