import { expect, test } from "@playwright/test";

const consentStorageKey = "tarot-spark.optional-services-consent";
const privateContextHandoffStorageKey = "tarot-spark.private-context-handoff";

test.beforeEach(async ({ page }) => {
  await page.route("https://**/*", async (route) => {
    await route.abort();
  });
});

test("keeps the full privacy option card clickable", async ({ page }) => {
  await page.goto("/");

  const analytics = page.getByRole("checkbox", { name: /Analytics/ });
  const card = analytics.locator(
    "xpath=ancestor::div[contains(@class, 'ts-privacy-option')]",
  );

  await expect(card).toBeVisible();
  const cardSize = await card.evaluate((element) => ({
    height: element.clientHeight,
    width: element.clientWidth,
  }));

  await card.click({
    position: {
      x: cardSize.width - 4,
      y: cardSize.height / 2,
    },
  });
  await expect(analytics).toBeChecked();
});

test("leaves privacy-card colors with the package in forced-colors mode", async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/");

  const analytics = page.getByRole("checkbox", { name: /Analytics/ });
  const card = analytics.locator(
    "xpath=ancestor::div[contains(@class, 'ts-privacy-option')]",
  );

  expect(
    await card.evaluate((element) => {
      const style = getComputedStyle(element);

      return {
        background: style
          .getPropertyValue("--mt-checkbox-card-background")
          .trim(),
        border: style
          .getPropertyValue("--mt-checkbox-card-border-color")
          .trim(),
        borderWidth: style
          .getPropertyValue("--mt-checkbox-card-border-width")
          .trim(),
      };
    }),
  ).toEqual({
    background: "Canvas",
    border: "CanvasText",
    borderWidth: "1px",
  });
});

test("revokes analytics without losing private reading context", async ({
  page,
}) => {
  await page.goto("/");
  await openSituationContext(page);

  const contextInput = page.getByRole("textbox", {
    name: /Add your situation/,
  });
  await contextInput.fill("Keep this private context through consent changes.");
  await page.getByRole("checkbox", { name: /Analytics/ }).check();
  await page.getByRole("button", { name: "Save choices" }).click();
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(
    1,
  );

  const settingsButton = page.getByRole("button", { name: "Privacy choices" });

  expect(
    await settingsButton.evaluate(
      (element) => element.closest('[data-testid="site-footer"]') !== null,
    ),
  ).toBe(true);
  await settingsButton.click();
  await page.getByRole("checkbox", { name: /Analytics/ }).uncheck();
  const reloaded = page.waitForEvent("load");
  await page.getByRole("button", { name: "Save choices" }).click();
  await reloaded;

  await openSituationContext(page);
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
      name: "Draw cards and create a question for your AI tool.",
    }),
  ).toBeVisible();
  await expect(
    page.locator('script[src*="googlesyndication.com"]'),
  ).toHaveCount(0);
});

test("allows advertising only after consent on the question explorer", async ({
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
        analytics: false,
        advertising: true,
      }),
    },
  );

  await page.goto("/ko/relationship-tarot-questions");
  await expect(
    page.locator('script[src*="googlesyndication.com"]'),
  ).toHaveCount(1);
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

  await page.getByRole("link", { name: "Draw my cards" }).click();
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

  await openSituationContext(page);
  await expect(
    page.getByRole("textbox", {
      name: /Add your situation/,
    }),
  ).toHaveValue("");
});

test("clears stale private handoff before consecutive pre-hydration navigation", async ({
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
        context: "Stale pre-hydration private context.",
        expiresAt: Date.now() + 60_000,
      }),
    },
  );

  let blockNextScripts = true;
  await page.route("**/_next/static/**/*.js", async (route) => {
    if (blockNextScripts) {
      await route.abort();
      return;
    }

    await route.continue();
  });

  await page.goto(
    "/share?topic=relationship-flow&style=relational&cards=the-fool,the-lovers,the-star&source=instagram&campaign=vertical-slice",
  );
  const createOwnLink = page.getByRole("link", {
    name: "Draw my cards",
  });
  await expect(createOwnLink).toHaveAttribute(
    "href",
    "/?source=instagram&campaign=vertical-slice",
  );
  await expect(
    page.getByRole("button", { name: "Reject optional services" }),
  ).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        (key) => window.sessionStorage.getItem(key),
        privateContextHandoffStorageKey,
      ),
    )
    .toBeNull();

  await createOwnLink.click();
  await expect(page).toHaveURL((url) => {
    return (
      url.pathname === "/" &&
      url.hash === "" &&
      [...url.searchParams.keys()].sort().join(",") === "campaign,source"
    );
  });
  await expect(page.getByRole("link", { name: "한국어" })).toBeVisible();

  blockNextScripts = false;
  await page.getByRole("link", { name: "한국어" }).click();
  await expect(page).toHaveURL((url) => {
    return (
      url.pathname === "/ko" &&
      url.hash === "" &&
      url.searchParams.get("source") === "instagram" &&
      url.searchParams.get("campaign") === "vertical-slice"
    );
  });
  await expect
    .poll(() =>
      page.evaluate(
        (key) => window.sessionStorage.getItem(key),
        privateContextHandoffStorageKey,
      ),
    )
    .toBeNull();

  await openSituationContext(page);
  await expect(
    page.getByRole("textbox", {
      name: /내 상황 더하기/,
    }),
  ).toHaveValue("");
});

async function openSituationContext(page: import("@playwright/test").Page) {
  const disclosure = page.getByTestId("situation-context");

  if ((await disclosure.getAttribute("open")) === null) {
    await page.getByTestId("situation-context-toggle").click();
  }
}

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
