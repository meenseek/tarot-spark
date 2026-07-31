import "server-only";

export function isInstantReadingEnabled() {
  return process.env["TAROT_INSTANT_READING_ENABLED"] === "true";
}
