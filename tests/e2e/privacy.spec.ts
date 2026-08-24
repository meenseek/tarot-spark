import { expect, test } from "@playwright/test";

const consentStorageKey = "tarot-spark.optional-services-consent";
const failClosedSessionStorageKey = "tarot-spark.optional-services-fail-closed";
const failClosedCookieName = "tarot_spark_optional_services_fail_closed";
const privateContextHandoffStorageKey = "tarot-spark.private-context-handoff";
const storageErrorMessage =
  "We couldn't save your choices. Try again in this panel so they can be applied safely.";
const restrictedGoogleConsentRegions = [
  "AT",
  "BE",
  "BG",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
] as const;

test.beforeEach(async ({ page }) => {
  await page.route("https://**/*", async (route) => {
    await route.abort();
  });
});

test("allows analytics from footer settings without enabling advertising", async ({
  page,
}) => {
  await setStoredConsent(page, { analytics: false, advertising: false });
  await page.goto("/relationship-flow");

  await page.getByRole("button", { name: "Privacy choices" }).click();
  await page.getByRole("checkbox", { name: /Analytics/ }).check();
  const reloaded = page.waitForEvent("load");
  await page.getByRole("button", { name: "Save choices" }).click();
  await reloaded;

  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(
    1,
  );
  await expect(
    page.locator('script[src*="googlesyndication.com"]'),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      (key) => window.localStorage.getItem(key),
      consentStorageKey,
    ),
  ).toBe(JSON.stringify({ analytics: true, advertising: false }));
});

test("defaults analytics on without a popup and keeps advertising route-isolated", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(
    1,
  );
  await expect(
    page.locator('script[src*="googlesyndication.com"]'),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Privacy choices" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Optional privacy choices" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      (key) => window.localStorage.getItem(key),
      consentStorageKey,
    ),
  ).toBeNull();
  const consentDefaultsPrecedeAnalytics = await page.evaluate(() => {
    const defaults = document.querySelector("#google-consent-mode-defaults");
    const analytics = document.querySelector(
      'script[src*="googletagmanager.com"]',
    );

    return Boolean(
      defaults &&
      analytics &&
      defaults.compareDocumentPosition(analytics) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
  expect(consentDefaultsPrecedeAnalytics).toBe(true);
  const consentQueue = await page.evaluate(() =>
    (window.dataLayer ?? [])
      .slice(0, 3)
      .map((entry) =>
        Array.isArray(entry)
          ? entry
          : Array.from(entry as unknown as ArrayLike<unknown>),
      ),
  );
  expect(consentQueue).toEqual([
    [
      "consent",
      "default",
      {
        ad_personalization: "granted",
        ad_storage: "granted",
        ad_user_data: "granted",
        analytics_storage: "granted",
      },
    ],
    [
      "consent",
      "default",
      {
        ad_personalization: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        analytics_storage: "denied",
        region: restrictedGoogleConsentRegions,
        wait_for_update: 500,
      },
    ],
    ["set", "ads_data_redaction", true],
  ]);
});

test("defaults both configured services on for an advertising-eligible route", async ({
  page,
}) => {
  await page.goto("/relationship-flow");

  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(
    1,
  );
  await expect(
    page.locator('script[src*="googlesyndication.com"]'),
  ).toHaveCount(1);
  expect(
    await page.evaluate(
      (key) => window.localStorage.getItem(key),
      consentStorageKey,
    ),
  ).toBeNull();
});

test("reapplies a stored local opt-out before optional tags", async ({
  page,
}) => {
  await setStoredConsent(page, { analytics: false, advertising: false });
  await page.goto("/");

  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(
    0,
  );
  await expect(
    page.locator('script[src*="googlesyndication.com"]'),
  ).toHaveCount(0);
  const latestConsentUpdate = await page.evaluate(() => {
    const entries = window.dataLayer ?? [];

    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index];
      const values = Array.isArray(entry)
        ? entry
        : Array.from(entry as unknown as ArrayLike<unknown>);

      if (values[0] === "consent" && values[1] === "update") {
        return values[2];
      }
    }

    return null;
  });
  expect(latestConsentUpdate).toEqual({
    ad_personalization: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    analytics_storage: "denied",
  });
});

test("opens default-on choices without loading advertising on excluded routes", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Privacy choices" }).click();

  await expect(
    page.getByRole("heading", { name: "Optional privacy choices" }),
  ).toBeFocused();
  await expect(page.getByRole("checkbox", { name: /Analytics/ })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /Analytics/ })).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: /Advertising/ }),
  ).toBeChecked();
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(
    1,
  );
  await expect(
    page.locator('script[src*="googlesyndication.com"]'),
  ).toHaveCount(0);
});

test("reloads before re-enabling a locally denied advertising signal", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Privacy choices" }).click();
  await page.getByRole("checkbox", { name: /Advertising/ }).uncheck();
  await page.getByRole("button", { name: "Save choices" }).click();

  await page.getByRole("button", { name: "Privacy choices" }).click();
  await page.getByRole("checkbox", { name: /Advertising/ }).check();
  const reloaded = page.waitForEvent("load");
  await page.getByRole("button", { name: "Save choices" }).click();
  await reloaded;

  await page.goto("/relationship-flow");
  await expect(
    page.locator('script[src*="googlesyndication.com"]'),
  ).toHaveCount(1);
});

test("keeps a failed settings choice in the fail-closed panel", async ({
  page,
}) => {
  await setStoredConsent(page, { analytics: false, advertising: false });
  await page.goto("/");
  await page.getByRole("button", { name: "Privacy choices" }).click();
  await page.getByRole("checkbox", { name: /Analytics/ }).check();
  await failConsentStorage(page, { failSessionMarker: false });

  await page.getByRole("button", { name: "Save choices" }).click();

  await expect(
    page.getByRole("alert").filter({ hasText: storageErrorMessage }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Optional privacy choices" }),
  ).toBeFocused();
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(
    0,
  );
});

test("keeps privacy choices reachable in a compact viewport", async ({
  page,
}) => {
  await page.setViewportSize({ height: 568, width: 390 });
  await page.goto("/");
  await page.getByRole("button", { name: "Privacy choices" }).click();

  const panel = page.locator(
    'section[aria-labelledby="privacy-consent-heading"]',
  );
  const panelLayout = await panel.evaluate((element) => {
    const bounds = element.getBoundingClientRect();

    return {
      bottom: bounds.bottom,
      overflowY: window.getComputedStyle(element).overflowY,
      top: bounds.top,
    };
  });

  expect(panelLayout.top).toBeGreaterThanOrEqual(15);
  expect(panelLayout.bottom).toBeLessThanOrEqual(553);
  expect(panelLayout.overflowY).toBe("auto");

  const essentialOnlyButton = page.getByRole("button", {
    name: "Essential only",
  });
  await essentialOnlyButton.scrollIntoViewIfNeeded();
  await expect(essentialOnlyButton).toBeInViewport();
});

for (const { label, viewport } of [
  { label: "mobile", viewport: { height: 844, width: 390 } },
  { label: "desktop", viewport: { height: 900, width: 1280 } },
] as const) {
  test(`keeps the ${label} product flow free of a consent popup`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Optional privacy choices" }),
    ).toHaveCount(0);
    await expect(
      page.locator('script[src*="googletagmanager.com"]'),
    ).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    const draw = page.getByRole("button", { name: "Draw 3 cards" });
    await draw.scrollIntoViewIfNeeded();
    await draw.click();
    await expect(page.getByTestId("prompt-ready")).toBeVisible();
  });
}

test("keeps the full privacy option card clickable", async ({ page }) => {
  await setStoredConsent(page, { analytics: false, advertising: false });
  await page.goto("/");
  await page.getByRole("button", { name: "Privacy choices" }).click();

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
  await page.getByRole("button", { name: "Privacy choices" }).click();

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
  await setStoredConsent(page, { analytics: false, advertising: false });
  await page.goto("/");
  await openSituationContext(page);

  const contextInput = page.getByRole("textbox", {
    name: /Add your situation/,
  });
  await contextInput.fill("Keep this private context through consent changes.");
  await page.getByRole("button", { name: "Privacy choices" }).click();
  await page.getByRole("checkbox", { name: /Analytics/ }).check();
  const analyticsEnabledReload = page.waitForEvent("load");
  await page.getByRole("button", { name: "Save choices" }).click();
  await analyticsEnabledReload;
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

test("keeps stale consent closed across a session-marker reload", async ({
  page,
}) => {
  await page.goto("/relationship-flow");
  await page.getByRole("button", { name: "Privacy choices" }).click();
  await page.getByRole("checkbox", { name: /Analytics/ }).check();
  await page.getByRole("checkbox", { name: /Advertising/ }).check();
  await page.getByRole("button", { name: "Save choices" }).click();
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(
    1,
  );
  await expect(
    page.locator('script[src*="googlesyndication.com"]'),
  ).toHaveCount(1);

  await failConsentStorage(page, { failSessionMarker: false });
  await page.getByRole("button", { name: "Privacy choices" }).click();
  await page.getByRole("checkbox", { name: /Analytics/ }).uncheck();
  await page.getByRole("checkbox", { name: /Advertising/ }).uncheck();
  const reloaded = page.waitForEvent("load");
  await page.getByRole("button", { name: "Save choices" }).click();
  await reloaded;

  const storageError = page
    .getByRole("alert")
    .filter({ hasText: storageErrorMessage });
  await expect(storageError).toBeVisible();
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(
    0,
  );
  await expect(
    page.locator('script[src*="googlesyndication.com"]'),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      ({ consentKey, markerKey }) => ({
        consent: window.localStorage.getItem(consentKey),
        marker: window.sessionStorage.getItem(markerKey),
      }),
      {
        consentKey: consentStorageKey,
        markerKey: failClosedSessionStorageKey,
      },
    ),
  ).toEqual({
    consent: JSON.stringify({ analytics: true, advertising: true }),
    marker: "1",
  });

  await page.getByRole("button", { name: "Save choices" }).click();
  await expect(storageError).toHaveCount(0);
  expect(
    await page.evaluate(
      ({ consentKey, markerKey }) => ({
        consent: window.localStorage.getItem(consentKey),
        marker: window.sessionStorage.getItem(markerKey),
      }),
      {
        consentKey: consentStorageKey,
        markerKey: failClosedSessionStorageKey,
      },
    ),
  ).toEqual({
    consent: JSON.stringify({ analytics: false, advertising: false }),
    marker: null,
  });
});

test("uses a scoped cookie when both Web Storage carriers fail", async ({
  context,
  page,
}) => {
  await page.goto("/relationship-flow");
  await page.getByRole("button", { name: "Privacy choices" }).click();
  await page.getByRole("checkbox", { name: /Analytics/ }).check();
  await page.getByRole("checkbox", { name: /Advertising/ }).check();
  await page.getByRole("button", { name: "Save choices" }).click();
  await expect(
    page.locator('script[src*="googlesyndication.com"]'),
  ).toHaveCount(1);

  await failConsentStorage(page, { failSessionMarker: true });
  await page.getByRole("button", { name: "Privacy choices" }).click();
  await page.getByRole("checkbox", { name: /Analytics/ }).uncheck();
  await page.getByRole("checkbox", { name: /Advertising/ }).uncheck();
  const reloaded = page.waitForEvent("load");
  await page.getByRole("button", { name: "Save choices" }).click();
  await reloaded;

  const storageError = page
    .getByRole("alert")
    .filter({ hasText: storageErrorMessage });
  await expect(storageError).toBeVisible();
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(
    0,
  );
  await expect(
    page.locator('script[src*="googlesyndication.com"]'),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      (key) => window.localStorage.getItem(key),
      consentStorageKey,
    ),
  ).toBe(JSON.stringify({ analytics: true, advertising: true }));
  expect(await context.cookies()).toContainEqual(
    expect.objectContaining({
      name: failClosedCookieName,
      path: "/",
      sameSite: "Strict",
      value: "1",
    }),
  );

  await page.getByRole("button", { name: "Save choices" }).click();
  await expect(storageError).toHaveCount(0);
  expect(
    (await context.cookies()).some(
      (cookie) => cookie.name === failClosedCookieName,
    ),
  ).toBe(false);
  expect(
    await page.evaluate(
      (key) => window.localStorage.getItem(key),
      consentStorageKey,
    ),
  ).toBe(JSON.stringify({ analytics: false, advertising: false }));
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
    page.getByRole("button", { name: "Essential only" }),
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

async function setStoredConsent(
  page: import("@playwright/test").Page,
  preferences: { readonly advertising: boolean; readonly analytics: boolean },
) {
  await page.addInitScript(
    ({ key, value }) => {
      if (window.localStorage.getItem(key) !== null) {
        return;
      }

      window.localStorage.setItem(key, value);
    },
    {
      key: consentStorageKey,
      value: JSON.stringify(preferences),
    },
  );
}

async function failConsentStorage(
  page: import("@playwright/test").Page,
  { failSessionMarker }: { readonly failSessionMarker: boolean },
) {
  await page.evaluate(
    ({ consentKey, failSession, markerKey }) => {
      const originalSetItem = Storage.prototype.setItem;
      const originalRemoveItem = Storage.prototype.removeItem;

      Storage.prototype.setItem = function (key, value) {
        if (
          (this === window.localStorage && key === consentKey) ||
          (failSession && this === window.sessionStorage && key === markerKey)
        ) {
          throw new DOMException("Storage unavailable", "SecurityError");
        }

        originalSetItem.call(this, key, value);
      };
      Storage.prototype.removeItem = function (key) {
        if (this === window.localStorage && key === consentKey) {
          throw new DOMException("Storage unavailable", "SecurityError");
        }

        originalRemoveItem.call(this, key);
      };
    },
    {
      consentKey: consentStorageKey,
      failSession: failSessionMarker,
      markerKey: failClosedSessionStorageKey,
    },
  );
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
