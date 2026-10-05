import { expect, test } from "@playwright/test";

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
  await expect(page).toHaveURL(/\/about$/);
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
      page_location: "http://127.0.0.1:3000/about",
      page_path: "/about",
      page_referrer: "",
    }),
  );
});
