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
  await expect(page).toHaveURL(/\/about$/, { timeout: 15_000 });
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
      page_location: new URL("/about", page.url()).toString(),
      page_path: "/about",
      page_referrer: "",
    }),
  );
});
