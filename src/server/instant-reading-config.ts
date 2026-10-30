import "server-only";

export const openaiInstantReadingModel = "gpt-6-luna";

export type InstantReadingProviderConfig = {
  readonly apiKey: string;
};

export function isInstantReadingEnabled() {
  return process.env["TAROT_INSTANT_READING_ENABLED"] === "true";
}

export function getInstantReadingProviderConfig():
  | InstantReadingProviderConfig
  | undefined {
  const apiKey = process.env["OPENAI_API_KEY"]?.trim();

  return apiKey ? { apiKey } : undefined;
}
