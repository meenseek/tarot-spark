import { expect, test } from "@playwright/test";
import { rejectOptionalServices } from "./privacy-helpers";

test.beforeEach(async ({ context }) => {
  await rejectOptionalServices(context);
});

test("serves the localized daily question without hydration errors", async ({
  page,
}) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydration|hydrated|server rendered html/i.test(message.text())
    ) {
      hydrationErrors.push(message.text());
    }
  });

  await page.goto("/daily");

  await expect(page).toHaveTitle("Daily Tarot Question | tarot-spark");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", {
      name: "One card. One question for today.",
    }),
  ).toBeVisible();
  await expect(page.getByTestId("daily-card")).toBeVisible();
  await expect(page.getByText(/12-card Major Arcana preview/i)).toBeVisible();
  await expect(
    page.getByText(/entertainment and self-reflection only/i),
  ).toBeVisible();
  expect(hydrationErrors).toEqual([]);
});

test("keeps today's card stable across reload and locale", async ({ page }) => {
  await page.goto("/daily");
  const englishCardId = await page
    .getByTestId("daily-card")
    .getAttribute("data-card-id");

  await page.reload();
  await expect(page.getByTestId("daily-card")).toHaveAttribute(
    "data-card-id",
    englishCardId ?? "",
  );

  await page.getByRole("link", { name: "한국어" }).click();
  await expect(page).toHaveURL(/\/ko\/daily$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(
    page.getByRole("heading", {
      name: "한 장의 카드, 오늘을 위한 하나의 질문.",
    }),
  ).toBeVisible();
  await expect(page.getByTestId("daily-card")).toHaveAttribute(
    "data-card-id",
    englishCardId ?? "",
  );
});

test("keeps the daily experiment out of indexing and rejects invalid routes", async ({
  page,
  request,
}) => {
  await page.goto("/ko/daily");

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  expectPathname(
    await page.locator('link[rel="canonical"]').getAttribute("href"),
    "/ko/daily",
  );
  expectPathname(
    await page
      .locator('link[rel="alternate"][hreflang="en"]')
      .getAttribute("href"),
    "/daily",
  );
  expectPathname(
    await page
      .locator('link[rel="alternate"][hreflang="ko"]')
      .getAttribute("href"),
    "/ko/daily",
  );

  expect((await request.get("/en/daily")).status()).toBe(404);
  expect((await request.get("/ko/daily/extra")).status()).toBe(404);
});

function expectPathname(href: string | null, pathname: string) {
  expect(href).not.toBeNull();
  expect(new URL(href ?? "http://localhost").pathname).toBe(pathname);
}
