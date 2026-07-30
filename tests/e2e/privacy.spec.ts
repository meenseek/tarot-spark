import { expect, test } from "@playwright/test";

const consentStorageKey = "tarot-spark.optional-services-consent.v1";
const privateContextHandoffStorageKey =
  "tarot-spark.private-context-handoff.v1";

test.beforeEach(async ({ page }) => {
  await page.route("https://**/*", async (route) => {
    await route.abort();
  });
});

test("revokes analytics without losing private reading context", async ({
  page,
}) => {
  await page.goto("/");

  const contextInput = page.getByRole("textbox", {
    name: /Situation or relationship context/,
  });
  await contextInput.fill("Keep this private context through consent changes.");
  await page.getByRole("checkbox", { name: /Analytics/ }).check();
  await page.getByRole("button", { name: "Save choices" }).click();
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(
    1,
  );

  await page.getByRole("button", { name: "Privacy choices" }).click();
  await page.getByRole("checkbox", { name: /Analytics/ }).uncheck();
  const reloaded = page.waitForEvent("load");
  await page.getByRole("button", { name: "Save choices" }).click();
  await reloaded;

  await expect(contextInput).toHaveValue(
    "Keep this private context through consent changes.",
  );
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(
    0,
  );
  expect(
    await page.evaluate(
      ({ consentKey, handoffKey }) => ({
        consent: window.localStorage.getItem(consentKey),
        handoff: window.sessionStorage.getItem(handoffKey),
      }),
      {
        consentKey: consentStorageKey,
        handoffKey: privateContextHandoffStorageKey,
      },
    ),
  ).toEqual({
    consent: JSON.stringify({
      version: 1,
      analytics: false,
      advertising: false,
    }),
    handoff: null,
  });
});

test("clears an active advertising document before showing a reading", async ({
  context,
  page,
}) => {
  await context.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: consentStorageKey,
      value: JSON.stringify({
        version: 1,
        analytics: false,
        advertising: true,
      }),
    },
  );
  await page.goto("/about");
  await expect(
    page.locator('script[src*="googlesyndication.com"]'),
  ).toHaveCount(1);

  const reloaded = page.waitForEvent("load");
  await page.locator('header a[href="/"]').click();
  await reloaded;

  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", {
      name: "Turn your situation and a tarot spread into a stronger AI prompt.",
    }),
  ).toBeVisible();
  await expect(
    page.locator('script[src*="googlesyndication.com"]'),
  ).toHaveCount(0);
});
