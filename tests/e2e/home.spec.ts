import { expect, test } from "@playwright/test";

test("loads the app shell", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("tarot-spark");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Draw three cards and turn them into an AI-ready tarot prompt.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/current deck: 12-card Major Arcana preview/i),
  ).toBeVisible();
});

test("loads Korean localized content", async ({ page }) => {
  await page.goto("/ko");

  await expect(page).toHaveTitle("타로 스파크");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(
    page.getByRole("heading", {
      name: "세 장의 카드를 뽑고 AI용 타로 프롬프트로 정리하세요.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "카드 뽑기" })).toBeVisible();
  await expect(
    page.getByText(/현재 덱: 메이저 아르카나 미리보기 12장/),
  ).toBeVisible();
});

test("links required public pages in both languages", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "About" })).toHaveAttribute(
    "href",
    "/about",
  );
  await expect(page.getByRole("link", { name: "Privacy" })).toHaveAttribute(
    "href",
    "/privacy",
  );
  await expect(page.getByRole("link", { name: "Contact" })).toHaveAttribute(
    "href",
    "/contact",
  );
  await expect(page.getByRole("link", { name: "Disclaimer" })).toHaveAttribute(
    "href",
    "/disclaimer",
  );

  await page.getByRole("link", { name: "Privacy" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Privacy Policy",
    }),
  ).toBeVisible();
  await expect(page).toHaveTitle("Privacy Policy | tarot-spark");

  await page.goto("/ko");
  await page.getByRole("link", { name: "개인정보" }).click();
  await expect(
    page.getByRole("heading", {
      name: "개인정보 처리방침",
    }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
});

test("serves Korean html lang before hydration", async ({ request }) => {
  const response = await request.get("/ko");
  const html = await response.text();

  expect(html).toContain('<html lang="ko">');
});

test("serves localized SEO metadata and discovery files", async ({
  page,
  request,
}) => {
  await page.goto("/ko");

  await expect(
    page.locator('link[rel="alternate"][hreflang="en"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('link[rel="alternate"][hreflang="ko"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('link[rel="alternate"][hreflang="x-default"]'),
  ).toHaveCount(1);
  expectPathname(
    await page.locator('link[rel="canonical"]').getAttribute("href"),
    "/ko",
  );
  expectPathname(
    await page
      .locator('link[rel="alternate"][hreflang="en"]')
      .getAttribute("href"),
    "/",
  );
  expectPathname(
    await page
      .locator('link[rel="alternate"][hreflang="ko"]')
      .getAttribute("href"),
    "/ko",
  );

  const robotsResponse = await request.get("/robots.txt");
  const robotsText = await robotsResponse.text();
  expect(robotsResponse.ok()).toBe(true);
  expect(robotsText).toContain("Allow: /");
  expect(robotsText).toContain("/sitemap.xml");

  const sitemapResponse = await request.get("/sitemap.xml");
  const sitemapXml = await sitemapResponse.text();
  const sitemapPathnames = getSitemapLocPathnames(sitemapXml);

  expect(sitemapResponse.ok()).toBe(true);
  expect(sitemapPathnames).toEqual(
    expect.arrayContaining([
      "/",
      "/ko",
      "/about",
      "/ko/about",
      "/privacy",
      "/ko/privacy",
      "/contact",
      "/ko/contact",
      "/disclaimer",
      "/ko/disclaimer",
    ]),
  );
  expect(sitemapXml).toContain('hreflang="en"');
  expect(sitemapXml).toContain('hreflang="ko"');
  expect(sitemapXml).toContain('hreflang="x-default"');
});

test("returns 404 for unsupported or duplicate locale paths", async ({
  request,
}) => {
  const unsupportedLocaleResponse = await request.get("/fr");
  const duplicateDefaultLocaleResponse = await request.get("/en");
  const unsupportedPublicPageResponse = await request.get("/ko/terms");

  expect(unsupportedLocaleResponse.status()).toBe(404);
  expect(duplicateDefaultLocaleResponse.status()).toBe(404);
  expect(unsupportedPublicPageResponse.status()).toBe(404);
});

test("resets reading state when switching languages", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Draw cards" }).click();
  await expect(page.getByLabel("Generated prompt")).toBeVisible();

  await page.getByRole("link", { name: "한국어" }).click();

  await expect(
    page.getByRole("heading", {
      name: "세 장의 카드를 뽑고 AI용 타로 프롬프트로 정리하세요.",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Generated prompt")).toBeHidden();
  await expect(page.getByText("시작할 주제를 선택하세요.")).toBeVisible();
});

test("draws tarot cards and copies the generated prompt", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Reunion 3 cards" }).click();
  await page.getByRole("button", { name: "Draw cards" }).click();

  await expect(page.getByLabel("Generated prompt")).toContainText(
    "Topic: Reunion",
  );
  await expect(page.getByLabel("Generated prompt")).toContainText(
    "Card-specific angle:",
  );
  await expect(page.getByLabel("Generated prompt")).toContainText(
    "one connected pattern",
  );
  await expect(page.getByText(/^Interpretation lens: /)).toBeVisible();
  await expect(
    page.getByText("Tarot content is for entertainment"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Copy prompt" }).click();

  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();

  await page.getByRole("button", { name: "Share" }).click();

  await expect(
    page.getByRole("button", { name: "Copied share text" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Copy link for Instagram" }).click();

  await expect(
    page.getByRole("button", { name: "Instagram link copied" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Copy URL" }).click();

  await expect(
    page.getByRole("button", { exact: true, name: "URL copied" }),
  ).toBeVisible();
});

function expectPathname(href: string | null, pathname: string) {
  expect(href).not.toBeNull();
  expect(new URL(href ?? "http://localhost").pathname).toBe(pathname);
}

function getSitemapLocPathnames(sitemapXml: string) {
  return Array.from(sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)).map(
    (match) => {
      const [, loc] = match;

      if (!loc) {
        throw new Error("Sitemap loc entry is missing a URL.");
      }

      return new URL(loc).pathname;
    },
  );
}
