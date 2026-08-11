import "server-only";

export const cloudflareInstantReadingModel = "@cf/qwen/qwen3-30b-a3b-fp8";

export type InstantReadingProviderConfig = {
  readonly accountId: string;
  readonly apiToken: string;
};

export function isInstantReadingEnabled() {
  return process.env["TAROT_INSTANT_READING_ENABLED"] === "true";
}

export function getInstantReadingProviderConfig():
  | InstantReadingProviderConfig
  | undefined {
  const accountId = process.env["CLOUDFLARE_ACCOUNT_ID"]?.trim();
  const apiToken = process.env["CLOUDFLARE_API_TOKEN"]?.trim();

  return accountId && apiToken ? { accountId, apiToken } : undefined;
}
