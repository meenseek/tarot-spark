import type { BrowserContext } from "@playwright/test";

const consentStorageKey = "tarot-spark.optional-services-consent.v1";

export async function rejectOptionalServices(context: BrowserContext) {
  await context.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: consentStorageKey,
      value: JSON.stringify({
        version: 1,
        analytics: false,
        advertising: false,
      }),
    },
  );
}
