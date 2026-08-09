import type { BrowserContext } from "@playwright/test";

const consentStorageKey = "tarot-spark.optional-services-consent";

export async function rejectOptionalServices(context: BrowserContext) {
  await context.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: consentStorageKey,
      value: JSON.stringify({
        analytics: false,
        advertising: false,
      }),
    },
  );
}
