import { expect, test, type BrowserContext, type Page } from "@playwright/test";

async function isolateAnalytics(context: BrowserContext) {
  await context.addInitScript(() => {
    window.localStorage.setItem(
      "tarot-spark.optional-services-consent",
      JSON.stringify({ analytics: true, advertising: false }),
    );
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async () => undefined },
      configurable: true,
    });
  });
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "www.googletagmanager.com") {
      return route.fulfill({
        contentType: "application/javascript",
        body: "/* isolated tag boundary: never contacts production */",
      });
    }
    return url.hostname === "127.0.0.1" ? route.continue() : route.abort();
  });
}

async function coreEvents(page: Page) {
  return page.evaluate(() =>
    (window.dataLayer ?? [])
      .map((entry) => Array.from(entry as IArguments))
      .filter(
        ([command, name]) =>
          command === "event" &&
          ["draw_start", "result_view", "prompt_copy"].includes(String(name)),
      ),
  );
}

async function completeReading(page: Page) {
  await expect
    .poll(() => page.evaluate(() => window.tarotSparkAnalyticsReady))
    .toBe(true);
  await page.getByRole("button", { name: "Draw 3 cards", exact: true }).click();
  await expect.poll(async () => (await coreEvents(page)).length).toBe(2);
  await page.getByRole("button", { name: "Copy prompt", exact: true }).click();
  await expect.poll(async () => (await coreEvents(page)).length).toBe(3);
  expect((await coreEvents(page)).map((entry) => entry[1])).toEqual([
    "draw_start",
    "result_view",
    "prompt_copy",
  ]);
}

test("keeps a profile campaign through the ordered flow and clears it on a fresh untagged visit", async ({
  page,
  context,
  browser,
}) => {
  await isolateAnalytics(context);
  await page.goto(
    "/?utm_source=youtube&utm_medium=channel&utm_campaign=profile",
  );
  await completeReading(page);
  for (const entry of await coreEvents(page)) {
    expect(entry[2]).toEqual(
      expect.objectContaining({ source: "youtube", campaign: "profile" }),
    );
  }
  await page.goto("/");
  await completeReading(page);
  for (const entry of await coreEvents(page)) {
    expect(entry[2]).not.toHaveProperty("source");
    expect(entry[2]).not.toHaveProperty("campaign");
  }
  const fresh = await browser.newContext();
  try {
    await isolateAnalytics(fresh);
    const freshPage = await fresh.newPage();
    await freshPage.goto(new URL("/", page.url()).toString());
    await completeReading(freshPage);
    for (const entry of await coreEvents(freshPage)) {
      expect(entry[2]).not.toHaveProperty("source");
      expect(entry[2]).not.toHaveProperty("campaign");
    }
  } finally {
    await fresh.close();
  }
});

for (const query of [
  "source=youtube",
  "source=youtube&source=threads&campaign=profile",
  "source=unknown&campaign=profile&utm_source=youtube&utm_campaign=profile",
]) {
  test(`rejects incomplete, duplicate or invalid attribution: ${query}`, async ({
    page,
    context,
  }) => {
    await isolateAnalytics(context);
    await page.goto(`/?${query}`);
    await completeReading(page);
    for (const entry of await coreEvents(page)) {
      expect(entry[2]).not.toHaveProperty("source");
      expect(entry[2]).not.toHaveProperty("campaign");
    }
  });
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1280, height: 900 },
]) {
  test(`keeps attribution through daily, guides, locales and questions at width ${viewport.width}`, async ({
    page,
    context,
  }) => {
    await isolateAnalytics(context);
    await page.setViewportSize(viewport);
    await page.goto("/?source=threads&campaign=profile");
    const pair = "source=threads&campaign=profile";
    await expect(page.getByTestId("daily-question-link")).toHaveAttribute(
      "href",
      `/daily?${pair}`,
    );
    await page.getByTestId("daily-question-link").click();
    await expect(page).toHaveURL(`/daily?${pair}`);
    const dailyReturn = page.getByTestId("daily-card").getByRole("link");
    await expect(dailyReturn).toHaveAttribute("href", `/?${pair}`);
    await dailyReturn.click();
    await expect(page).toHaveURL(`/?${pair}`);
    await expect(page.getByTestId("daily-question-link")).toBeVisible();
    const guide = page
      .getByTestId("site-footer")
      .locator('a[href^="/how-to-ask-tarot-questions"]');
    await expect(guide).toHaveAttribute(
      "href",
      `/how-to-ask-tarot-questions?${pair}`,
    );
    await guide.click();
    await expect(page).toHaveURL(`/how-to-ask-tarot-questions?${pair}`);
    await expect(page.getByRole("article")).toBeVisible();
    const korean = page.getByRole("link", { name: "한국어", exact: true });
    await expect(korean).toHaveAttribute(
      "href",
      `/ko/how-to-ask-tarot-questions?${pair}`,
    );
    await korean.click();
    await expect(page).toHaveURL(
      new RegExp(`/ko/how-to-ask-tarot-questions\\?${pair}$`),
    );
    await expect(
      page.getByRole("link", { name: "한국어", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    const english = page.getByRole("link", { name: "English", exact: true });
    await expect(english).toHaveAttribute(
      "href",
      `/how-to-ask-tarot-questions?${pair}`,
    );
    await english.click();
    await expect(page).toHaveURL(`/how-to-ask-tarot-questions?${pair}`);
    await expect(
      page.getByRole("link", { name: "English", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    const catalog = page
      .getByTestId("site-footer")
      .locator('a[href^="/tarot-questions"]');
    await expect(catalog).toHaveAttribute("href", `/tarot-questions?${pair}`);
    await catalog.click();
    await expect(page).toHaveURL(`/tarot-questions?${pair}`);
    const firstGroup = page
      .getByTestId("public-question-catalog-list")
      .locator("details")
      .first();
    if ((await firstGroup.getAttribute("open")) === null) {
      await firstGroup.locator("summary").click();
    }
    const reading = firstGroup.getByRole("link").first();
    await expect(reading).toHaveAttribute("href", new RegExp(pair));
    await reading.click();
    await completeReading(page);
    for (const entry of await coreEvents(page)) {
      expect(entry[2]).toEqual(
        expect.objectContaining({ source: "threads", campaign: "profile" }),
      );
    }
  });
}

for (const width of [390, 1280]) {
  test(`keeps native guide and locale navigation before hydration at width ${width}`, async ({
    page,
    context,
  }) => {
    await isolateAnalytics(context);
    await page.setViewportSize({ width, height: 900 });
    const hydrationErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" && /hydrat/i.test(message.text())) {
        hydrationErrors.push(message.text());
      }
    });
    let releaseScripts: () => void = () => undefined;
    const scriptsReady = new Promise<void>((resolve) => {
      releaseScripts = resolve;
    });
    let heldRequests = 0;
    await page.route("**/_next/static/**/*.js", async (route) => {
      heldRequests += 1;
      await scriptsReady;
      await route.continue();
    });
    try {
      await page.goto(
        "/how-to-ask-tarot-questions?utm_source=threads&utm_campaign=profile&context=private-entry",
        { waitUntil: "commit" },
      );
      const firstKoreanLink = page.getByRole("link", {
        name: "한국어",
        exact: true,
      });
      await firstKoreanLink.click({ button: "right", noWaitAfter: true });
      await page.keyboard.press("Escape");
      await expect(page).toHaveURL(
        /\/how-to-ask-tarot-questions\?utm_source=threads&utm_campaign=profile&context=private-entry$/,
      );
      await expect(firstKoreanLink).toHaveAttribute(
        "href",
        "/ko/how-to-ask-tarot-questions?source=threads&campaign=profile",
      );
      releaseScripts();
      await expect
        .poll(() => page.evaluate(() => window.tarotSparkAnalyticsReady))
        .toBe(true);
      await expect(firstKoreanLink).toHaveAttribute(
        "href",
        "/ko/how-to-ask-tarot-questions?source=threads&campaign=profile",
      );
      expect(hydrationErrors).toEqual([]);

      let releaseNextDocument: () => void = () => undefined;
      const nextDocumentReady = new Promise<void>((resolve) => {
        releaseNextDocument = resolve;
      });
      await page.unroute("**/_next/static/**/*.js");
      releaseScripts = releaseNextDocument;
      await page.route("**/_next/static/**/*.js", async (route) => {
        heldRequests += 1;
        await nextDocumentReady;
        await route.continue();
      });
      await page.goto(
        "/how-to-ask-tarot-questions?source=threads&campaign=profile&context=private-entry",
        { waitUntil: "commit" },
      );
      await page
        .getByRole("link", { name: "한국어", exact: true })
        .click({ noWaitAfter: true });
      await expect(page).toHaveURL(
        /\/ko\/how-to-ask-tarot-questions\?source=threads&campaign=profile$/,
      );
      await page
        .getByRole("link", { name: "English", exact: true })
        .click({ noWaitAfter: true });
      await expect(page).toHaveURL(
        /\/how-to-ask-tarot-questions\?source=threads&campaign=profile$/,
      );
      await page
        .getByTestId("site-header")
        .getByRole("link")
        .first()
        .click({ noWaitAfter: true });
      await expect(page).toHaveURL(/\/\?source=threads&campaign=profile$/);
      expect(heldRequests).toBeGreaterThan(0);
      expect(
        await page.evaluate(() => window.tarotSparkAnalyticsReady),
      ).not.toBe(true);
      releaseScripts();
      await completeReading(page);
      for (const entry of await coreEvents(page)) {
        expect(entry[2]).toEqual(
          expect.objectContaining({ source: "threads", campaign: "profile" }),
        );
      }
      expect(hydrationErrors).toEqual([]);
    } finally {
      releaseScripts();
    }
  });
}

test("queues one sanitized page view per route and forwards a real draw", async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {
    window.localStorage.setItem(
      "tarot-spark.optional-services-consent",
      JSON.stringify({ analytics: true, advertising: false }),
    );
  });
  await page.route("https://www.googletagmanager.com/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "/* deterministic tag boundary */",
    }),
  );
  await page.goto(
    "/?source=disquiet&campaign=vertical-slice&context=private-test-only",
  );
  const calls = () =>
    page.evaluate(() =>
      (window.dataLayer ?? []).map((entry) => Array.from(entry as IArguments)),
    );
  await expect
    .poll(
      async () =>
        (await calls()).filter(
          ([command, name]) => command === "event" && name === "page_view",
        ).length,
    )
    .toBe(1);
  const initial = await calls();
  expect(initial.find(([command]) => command === "config")?.[2]).toEqual(
    expect.objectContaining({ send_page_view: false, page_referrer: "" }),
  );
  expect(JSON.stringify(initial)).not.toContain("private-test-only");
  expect(
    await page.evaluate(() =>
      (window.dataLayer ?? []).every(
        (entry) =>
          Object.prototype.toString.call(entry) === "[object Arguments]",
      ),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Draw 3 cards", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await calls()).filter(
          ([command, name]) => command === "event" && name === "result_view",
        ).length,
    )
    .toBe(1);
  await page.getByRole("link", { name: "About", exact: true }).click();
  await expect(page).toHaveURL(
    /\/about\?source=disquiet&campaign=vertical-slice$/,
    { timeout: 15_000 },
  );
  await expect
    .poll(
      async () =>
        (await calls()).filter(
          ([command, name]) => command === "event" && name === "page_view",
        ).length,
    )
    .toBe(2);
  expect(
    (await calls()).filter(([command]) => command === "config"),
  ).toHaveLength(1);
  expect(
    (await calls())
      .filter(([command, name]) => command === "event" && name === "page_view")
      .at(-1)?.[2],
  ).toEqual(
    expect.objectContaining({
      page_location: new URL(
        "/about?utm_source=disquiet&utm_campaign=vertical-slice",
        page.url(),
      ).toString(),
      page_path: "/about?utm_source=disquiet&utm_campaign=vertical-slice",
      page_referrer: "",
    }),
  );
});
