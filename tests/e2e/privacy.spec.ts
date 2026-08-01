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
  await page.getByTestId("reading-preferences-toggle").click();

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
  await page.goto("/relationship-flow");
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

for (const { locale, path } of [
  {
    locale: "en",
    path: "/share?topic=relationship-flow&style=relational&cards=the-fool,the-lovers,the-star&source=instagram&campaign=vertical-slice",
  },
  {
    locale: "ko",
    path: "/ko/share?topic=relationship-flow&style=relational&cards=the-fool,the-lovers,the-star&source=instagram&campaign=vertical-slice",
  },
] as const) {
  test(`captures one attributed ${locale} share result without AdSense`, async ({
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
          analytics: true,
          advertising: true,
        }),
      },
    );

    await page.setViewportSize({ height: 844, width: 390 });
    const response = await page.goto(path);

    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe(
      locale === "en" ? "/share" : "/ko/share",
    );
    await expect(page.locator('[data-testid^="reading-card-"]')).toHaveCount(3);
    await expect(
      page.locator('script[src*="googlesyndication.com"]'),
    ).toHaveCount(0);

    await expect
      .poll(() => getResultViewEvents(page))
      .toEqual([
        expect.objectContaining({
          locale,
          topic_id: "relationship-flow",
          source: "instagram",
          campaign: "vertical-slice",
        }),
      ]);
  });
}

test("clears stale private handoff before opening a clean attributed generator", async ({
  context,
  page,
}) => {
  await context.addInitScript(
    ({ key, value }) => {
      if (window.location.pathname === "/share") {
        window.sessionStorage.setItem(key, value);
      }
    },
    {
      key: privateContextHandoffStorageKey,
      value: JSON.stringify({
        context: "Stale private context from another screen.",
        expiresAt: Date.now() + 60_000,
        version: 1,
      }),
    },
  );
  await page.goto(
    "/share?topic=relationship-flow&style=relational&cards=the-fool,the-lovers,the-star&source=instagram&campaign=vertical-slice",
  );
  await page.getByRole("button", { name: "Reject optional services" }).click();

  await expect
    .poll(() =>
      page.evaluate(
        (key) => window.sessionStorage.getItem(key),
        privateContextHandoffStorageKey,
      ),
    )
    .toBeNull();

  await page.getByRole("link", { name: "Create your own reading" }).click();
  await expect(page).toHaveURL((url) => {
    return (
      url.pathname === "/" &&
      [...url.searchParams.keys()].sort().join(",") === "campaign,source"
    );
  });
  const generatorUrl = new URL(page.url());
  expect([...generatorUrl.searchParams.keys()].sort()).toEqual([
    "campaign",
    "source",
  ]);

  await page.getByTestId("reading-preferences-toggle").click();
  await expect(
    page.getByRole("textbox", {
      name: /Situation or relationship context/,
    }),
  ).toHaveValue("");
});

async function getResultViewEvents(page: import("@playwright/test").Page) {
  return page.evaluate(() =>
    (window.dataLayer ?? [])
      .map((entry) =>
        Array.isArray(entry) ? entry : Array.from(entry as ArrayLike<unknown>),
      )
      .filter(
        ([command, eventName]) =>
          command === "event" && eventName === "result_view",
      )
      .map(([, , payload]) => payload),
  );
}
