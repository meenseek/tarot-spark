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
    page.getByText(/current deck: 12-card illustrated Major Arcana preview/i),
  ).toBeVisible();
});

test("loads Korean localized content", async ({ page }) => {
  await page.goto("/ko");

  await expect(page).toHaveTitle("타로 스파크");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(
    page.getByRole("heading", {
      name: "지금 고민을 카드로 펼쳐보고, AI에 물어볼 질문까지 만들어보세요.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "카드 뽑기" })).toBeVisible();
  await expect(
    page.getByText(/지금은 그림이 완성된 메이저 아르카나 12장/),
  ).toBeVisible();
});

test("keeps every localized context example visible at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 320 });

  const localizedExamples = [
    {
      contextLabel: /Situation or relationship context/,
      path: "/",
      topicExamples: [
        [
          "Love 3 cards",
          "Example: I want to move a new romantic connection forward, but I am unsure whether expressing my feelings first would be healthy.",
        ],
        [
          "Reunion 3 cards",
          "Example: I am considering contacting an ex again and want to reflect on what must change before the same problems repeat.",
        ],
        [
          "Feelings 3 cards",
          "Example: Their messages have become less frequent. I want to separate observable behavior from my assumptions and understand my own feelings.",
        ],
        [
          "Relationship flow 3 cards",
          "Example: Conversations with someone close keep going wrong. I want to notice the repeating pattern and what I can change on my side.",
        ],
        [
          "Career direction 3 cards",
          "Example: I am torn between staying at my current company and preparing for a new opportunity, and I want to clarify my next controllable step.",
        ],
      ],
    },
    {
      contextLabel: /지금 고민하는 상황/,
      path: "/ko",
      topicExamples: [
        [
          "연애 3장",
          "예: 서로 호감은 있는 것 같은데 관계가 좀처럼 앞으로 가지 않아요. 제가 먼저 마음을 표현해도 괜찮을지 고민돼요.",
        ],
        [
          "재회 3장",
          "예: 헤어진 사람에게 다시 연락해볼까 고민돼요. 예전과 같은 문제가 반복되지 않으려면 무엇이 달라져야 할지 알고 싶어요.",
        ],
        [
          "상대의 마음 3장",
          "예: 요즘 상대의 연락이 줄어서 혼란스러워요. 실제로 달라진 행동과 제 불안에서 나온 추측을 나눠보고 싶어요.",
        ],
        [
          "관계 흐름 3장",
          "예: 가까운 사람과 대화가 자꾸 어긋나요. 늘 비슷하게 꼬이는 이유와 제가 다르게 해볼 수 있는 일을 알고 싶어요.",
        ],
        [
          "커리어 방향 3장",
          "예: 지금 회사에 남을지 새로운 일을 준비할지 고민돼요. 당장 제가 해볼 수 있는 일부터 정리하고 싶어요.",
        ],
      ],
    },
  ] as const;

  for (const { contextLabel, path, topicExamples } of localizedExamples) {
    await page.goto(path);
    const context = page.getByLabel(contextLabel);

    for (const [topicButtonName, placeholder] of topicExamples) {
      await page.getByRole("button", { name: topicButtonName }).click();
      await expect(context).toHaveAttribute("placeholder", placeholder);
      const originalValue = await context.inputValue();

      await context.fill(placeholder);
      await expect(context).toHaveValue(placeholder);
      const dimensions = await context.evaluate((element) => ({
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      }));
      await context.fill(originalValue);
      await expect(context).toHaveValue(originalValue);

      expect(dimensions.scrollHeight).toBeLessThanOrEqual(
        dimensions.clientHeight,
      );
    }
  }
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
    /별빛 무늬 타로 카드 세 장/,
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
      name: "지금 고민을 카드로 펼쳐보고, AI에 물어볼 질문까지 만들어보세요.",
    }),
  ).toBeVisible();
  await expect(page.getByLabel("AI에 붙여 넣을 질문")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: /지금 고민하는 상황/ }),
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
