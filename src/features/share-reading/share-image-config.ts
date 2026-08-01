// Increment when card art or the rendered composition changes.
export const shareImageVersion = "1";
export const shareImageVersionParam = "v";
export const versionedShareImageCacheControl =
  "public, max-age=31536000, immutable";
export const legacyShareImageCacheControl =
  "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800";
