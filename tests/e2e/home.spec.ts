import { expect, test } from "@playwright/test";
import { rejectOptionalServices } from "./privacy-helpers";

test.beforeEach(async ({ context }) => {
  await rejectOptionalServices(context);
});

test("loads the app shell", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("tarot-spark");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Turn your situation and a tarot spread into a stronger AI prompt.",
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
      name: "나의 상황과 타로 스프레드를 더 선명한 AI 프롬프트로 만드세요.",
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
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /\/brand\/tarot-spark-social-card\.png$/,
  );
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
    "content",
    /세 장의 천체 타로 카드/,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
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
  const localizedRelationshipFlowResponse = await request.get(
    "/ko/relationship-flow",
  );
  const sitemapXml = await sitemapResponse.text();
  const sitemapPathnames = getSitemapLocPathnames(sitemapXml);

  expect(sitemapResponse.ok()).toBe(true);
  expect(localizedRelationshipFlowResponse.ok()).toBe(true);
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
      "/relationship-flow",
      "/ko/relationship-flow",
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

test("preserves reading and private context when switching languages", async ({
  page,
}) => {
  await page.goto("/");

  await page
    .getByRole("textbox", { name: /Situation or relationship context/ })
    .fill("My manager relationship is difficult.");
  const activeLocaleUrl = page.url();
  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(activeLocaleUrl);
  await expect(
    page.getByRole("textbox", { name: /Situation or relationship context/ }),
  ).toHaveValue("My manager relationship is difficult.");
  await page.getByRole("button", { name: "Draw cards" }).click();
  await expect(page.getByLabel("Generated prompt")).toBeVisible();
  const englishCardIds = await page
    .locator("[data-card-id]")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-card-id")),
    );

  await page.getByRole("link", { name: "한국어" }).click();

  await expect(
    page.getByRole("heading", {
      name: "나의 상황과 타로 스프레드를 더 선명한 AI 프롬프트로 만드세요.",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("생성된 프롬프트")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: /상황 또는 관계 맥락/ }),
  ).toHaveValue("My manager relationship is difficult.");
  expect(
    await page
      .locator("[data-card-id]")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-card-id")),
      ),
  ).toEqual(englishCardIds);
  await expect(page).not.toHaveURL(/manager|context/i);
});

test("creates a direct six-card prompt while keeping context private", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("radio", { name: /Deep 6-card/ }).check();
  await page.getByRole("radio", { name: /Direct, not deterministic/ }).check();
  await page
    .getByRole("textbox", { name: /Situation or relationship context/ })
    .fill(
      "My manager relationship is exhausting. Should I stay at this company?",
    );
  await page.getByRole("button", { name: "Draw cards" }).click();

  await expect(page.locator('[data-testid^="reading-card-"]')).toHaveCount(6);
  await expect(page.getByLabel("Generated prompt")).toContainText(
    "Deep six-card spread",
  );
  await expect(page.getByLabel("Generated prompt")).toContainText(
    "Reading style: Direct, not deterministic",
  );
  await expect(page.getByLabel("Generated prompt")).toContainText(
    "Should I stay at this company?",
  );
  await expect(page).toHaveURL(/spread=deep/);
  await expect(page).toHaveURL(/style=direct/);
  await expect(page).not.toHaveURL(/manager|company|context/i);
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
    "3. Connected spread:",
  );
  await expect(page.getByText(/^Interpretation lens: /)).toBeVisible();
  await expect(
    page.getByText("Tarot content is for entertainment"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Copy selected prompt" }).click();

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

test("serves the relationship guide and a noindex privacy-safe share preview", async ({
  page,
  request,
}) => {
  await page.goto("/relationship-flow");

  await expect(
    page.getByRole("heading", {
      name: /see the relationship pattern without pretending/i,
    }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("link", { name: "Start the relationship-flow spread" })
      .first(),
  ).toHaveAttribute(
    "href",
    "/?topic=relationship-flow&spread=deep&style=relational",
  );

  await page.goto(
    "/share?topic=relationship-flow&style=relational&cards=the-fool,the-lovers,the-star&source=copy&campaign=vertical-slice",
  );

  await expect(page.getByLabel("Generated prompt")).toContainText(
    "Topic: Relationship flow",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  expectPathname(
    await page.locator('link[rel="canonical"]').getAttribute("href"),
    "/relationship-flow",
  );
  const imageUrl = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  expect(imageUrl).not.toBeNull();
  expect(new URL(imageUrl ?? "http://localhost").pathname).toBe(
    "/api/share-image",
  );
  const localImageUrl = new URL(imageUrl ?? "http://localhost/api/share-image");
  const imageResponse = await request.get(
    `${localImageUrl.pathname}${localImageUrl.search}`,
  );
  expect(imageResponse.ok()).toBe(true);
  expect(imageResponse.headers()["content-type"]).toContain("image/png");

  await page.goto(
    "/share?topic=relationship-flow&cards=the-fool,the-lovers,the-star&context=private",
  );
  await expect(page).toHaveURL(/\/relationship-flow$/);
  await expect(page).not.toHaveURL(/private|context/);
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
