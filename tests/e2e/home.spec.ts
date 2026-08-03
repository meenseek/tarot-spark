import { expect, test, type Page } from "@playwright/test";
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

test("keeps optional situation context discoverable before drawing", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/ko");

  const situation = page.getByTestId("situation-context");
  const toggle = page.getByTestId("situation-context-toggle");
  const draw = page.getByRole("button", { name: "카드 뽑기" });

  await expect(situation).not.toHaveAttribute("open", "");
  expect(
    await page.evaluate(() => {
      const toggleElement = document.querySelector(
        '[data-testid="situation-context-toggle"]',
      );
      const drawElement = Array.from(document.querySelectorAll("button")).find(
        (element) => element.textContent?.includes("카드 뽑기"),
      );

      return Boolean(
        toggleElement &&
        drawElement &&
        toggleElement.compareDocumentPosition(drawElement) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }),
  ).toBe(true);

  await toggle.focus();
  await toggle.press("Enter");
  await expect(situation).toHaveAttribute("open", "");
  await expect(
    page.getByText(
      /복사할 질문에는 포함되며, 다른 AI에 붙여 넣으면 함께 전달됩니다/,
    ),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: /내 상황 더하기/ })
    .fill("제가 바꿀 수 있는 행동을 알고 싶어요.");
  await toggle.press("Enter");

  await expect(situation).not.toHaveAttribute("open", "");
  await expect(page.getByText("상황 입력됨 · 수정")).toBeVisible();
  await draw.click();
  await expect(page.getByText("작성한 상황도 질문에 담았어요.")).toBeVisible();
});

for (const width of [320, 390]) {
  test(`keeps the compact result within ${width}px`, async ({ page }) => {
    await page.setViewportSize({ height: 844, width });
    await page.goto("/ko");
    await page.getByRole("button", { name: "카드 뽑기" }).click();

    const copyButton = page.getByRole("button", {
      name: "이 질문 복사하기",
    });
    await expect(copyButton).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(
      await copyButton.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= window.innerWidth;
      }),
    ).toBe(true);
  });
}

test("keeps the primary draw and prompt actions ahead of optional detail", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/ko");

  const drawTop = await page
    .getByRole("button", { name: "카드 뽑기" })
    .evaluate((element) => element.getBoundingClientRect().top + scrollY);

  expect(drawTop).toBeLessThanOrEqual(1100);

  await page.getByRole("button", { name: "카드 뽑기" }).click();
  await expect(page.getByTestId("prompt-ready")).toBeVisible();
  await expect(page.getByLabel("AI에 붙여 넣을 질문")).toBeHidden();
  await expect(page.getByTestId("card-detail-list")).toBeHidden();
  await expect(page.getByRole("button", { name: "공유" })).toBeHidden();

  expect(
    await page.evaluate(() => {
      const promptReady = document.querySelector(
        '[data-testid="prompt-ready"]',
      );
      const promptTypes = document.querySelector(
        '[data-testid="prompt-type-disclosure"]',
      );
      const promptContent = document.querySelector(
        '[data-testid="prompt-content-disclosure"]',
      );
      const cardDetails = document.querySelector(
        '[data-testid="card-details-disclosure"]',
      );

      return Boolean(
        promptReady &&
        promptTypes &&
        promptContent &&
        cardDetails &&
        promptReady.compareDocumentPosition(promptTypes) &
          Node.DOCUMENT_POSITION_FOLLOWING &&
        promptReady.compareDocumentPosition(promptContent) &
          Node.DOCUMENT_POSITION_FOLLOWING &&
        promptReady.compareDocumentPosition(cardDetails) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }),
  ).toBe(true);

  await openCardDetails(page);
  await expect(page.getByTestId("card-detail-list")).toBeVisible();
});

test("keeps every localized context example visible at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 320 });

  const localizedExamples = [
    {
      contextLabel: /Add your situation/,
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
      contextLabel: /내 상황 더하기/,
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
    await openSituationContext(page);
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
  await openSituationContext(page);

  await page
    .getByRole("textbox", { name: /Add your situation/ })
    .fill("My manager relationship is difficult.");
  const activeLocaleUrl = page.url();
  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(activeLocaleUrl);
  await expect(
    page.getByRole("textbox", { name: /Add your situation/ }),
  ).toHaveValue("My manager relationship is difficult.");
  await page.getByRole("button", { name: "Draw cards" }).click();
  await openPromptContent(page);
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
  await openSituationContext(page);
  await openPromptContent(page);
  await expect(page.getByLabel("AI에 붙여 넣을 질문")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: /내 상황 더하기/ }),
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
  await openReadingPreferences(page);
  await openSituationContext(page);

  await page.getByRole("radio", { name: /Deep 6-card/ }).check();
  await page.getByRole("radio", { name: /Direct, not deterministic/ }).check();
  await page
    .getByRole("textbox", { name: /Add your situation/ })
    .fill(
      "My manager relationship is exhausting. Should I stay at this company?",
    );
  await page.getByRole("button", { name: "Draw cards" }).click();
  await openPromptContent(page);

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

test("shows an instant Korean reading without sending private context", async ({
  page,
}) => {
  let providerRequest: Record<string, unknown> | undefined;
  await page.route("**/api/reading", async (route) => {
    providerRequest = route.request().postDataJSON() as Record<string, unknown>;
    const cards = providerRequest["cards"] as {
      cardId: string;
      positionId: string;
    }[];

    await route.fulfill({
      body: JSON.stringify({
        reading: createValidInstantReading(cards),
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.goto("/ko");
  await openSituationContext(page);

  await page
    .getByRole("textbox", { name: /내 상황 더하기/ })
    .fill("서버로 보내면 안 되는 민감한 개인 상황");
  await page.getByRole("button", { name: "카드 뽑기" }).click();
  await page.getByRole("button", { name: "지금 바로 해석하기" }).click();

  await expect(page.getByTestId("instant-reading-result")).toBeVisible();
  await expect(
    page.getByText("생성형 AI를 활용해 작성한 해석입니다."),
  ).toBeVisible();
  await openPromptContent(page);
  await expect(page.getByLabel("AI에 붙여 넣을 질문")).toBeVisible();
  expect(Object.keys(providerRequest ?? {}).sort()).toEqual(
    ["cards", "lensId", "spreadId", "styleId", "topicId"].sort(),
  );
  expect(JSON.stringify(providerRequest)).not.toContain("민감한 개인 상황");
  expect(JSON.stringify(providerRequest)).not.toContain("userContext");
});

test("draws tarot cards and copies the generated prompt", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Reunion 3 cards" }).click();
  await page.getByRole("button", { name: "Draw cards" }).click();
  await openPromptContent(page);

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
  await expect(
    page.getByText(
      "Copied. Paste it into the AI tool you use to get the reading.",
    ),
  ).toBeVisible();

  await openShareOptions(page);
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
  await page.goto("/relationship-flow?source=naver&campaign=topic-guide");

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
    "/?topic=relationship-flow&spread=deep&style=relational&source=naver&campaign=topic-guide",
  );
  await expect(page.getByRole("link", { name: "한국어" })).toHaveAttribute(
    "href",
    "/ko/relationship-flow?source=naver&campaign=topic-guide",
  );
  await expect(
    page.getByRole("link", { name: "tarot-spark" }).first(),
  ).toHaveAttribute("href", "/?source=naver&campaign=topic-guide");

  await page.goto(
    "/share?topic=relationship-flow&style=relational&cards=the-fool,the-lovers,the-star&source=copy&campaign=vertical-slice",
  );

  await openPromptContent(page);
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
  const openGraphUrl = await page
    .locator('meta[property="og:url"]')
    .getAttribute("content");
  expect(openGraphUrl).not.toBeNull();
  expect(new URL(openGraphUrl ?? "http://localhost").pathname).toBe("/share");
  expect(
    new URL(openGraphUrl ?? "http://localhost").searchParams.has("source"),
  ).toBe(false);
  expect(
    new URL(openGraphUrl ?? "http://localhost").searchParams.has("campaign"),
  ).toBe(false);
  const imageUrl = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  expect(imageUrl).not.toBeNull();
  expect(new URL(imageUrl ?? "http://localhost").pathname).toBe(
    "/api/share-image",
  );
  const localImageUrl = new URL(imageUrl ?? "http://localhost/api/share-image");
  expect(localImageUrl.searchParams.get("v")).toBe("1");
  const imageResponse = await request.get(
    `${localImageUrl.pathname}${localImageUrl.search}`,
  );
  expect(imageResponse.ok()).toBe(true);
  expect(imageResponse.headers()["content-type"]).toContain("image/png");
  expect(imageResponse.headers()["cache-control"]).toContain(
    "max-age=31536000",
  );
  expect(imageResponse.headers()["cache-control"]).toContain("immutable");

  const deepImageResponse = await request.get(
    "/api/share-image?v=1&locale=en&topic=relationship-flow&spread=deep&style=relational&cards=the-fool,the-magician,the-high-priestess,the-empress,the-emperor,the-lovers",
  );
  const deepImageBody = await deepImageResponse.body();
  expect(deepImageResponse.ok()).toBe(true);
  expect(Array.from(deepImageBody.subarray(0, 8))).toEqual([
    137, 80, 78, 71, 13, 10, 26, 10,
  ]);
  expect(deepImageBody.readUInt32BE(16)).toBe(1200);
  expect(deepImageBody.readUInt32BE(20)).toBe(630);

  const koreanImageResponse = await request.get(
    "/api/share-image?locale=ko&topic=relationship-flow&spread=quick&style=relational&cards=the-fool,the-lovers,the-star",
  );
  expect(koreanImageResponse.ok()).toBe(true);
  expect(koreanImageResponse.headers()["content-type"]).toContain("image/png");
  expect(koreanImageResponse.headers()["cache-control"]).toContain(
    "s-maxage=86400",
  );
  expect(koreanImageResponse.headers()["cache-control"]).not.toContain(
    "immutable",
  );

  await page.goto(
    "/share?topic=relationship-flow&cards=the-fool,the-lovers,the-star&context=private",
  );
  await expect(page).toHaveURL(/\/relationship-flow$/);
  await expect(page).not.toHaveURL(/private|context/);
});

test("renders a shared reading first and keeps its localized share route", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  const response = await page.goto(
    "/share?topic=relationship-flow&style=relational&cards=the-fool,the-lovers,the-star&source=instagram&campaign=vertical-slice",
  );

  expect(await response?.text()).toContain(
    "A tarot-spark reading was shared with you.",
  );
  await expect(page.getByTestId("shared-reading-view")).toBeVisible();
  await expect(page.locator('[data-testid^="reading-card-"]')).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Draw cards" })).toHaveCount(0);
  await expect(page.getByTestId("reading-preferences")).toHaveCount(0);
  await expect(page.getByTestId("situation-context")).toHaveCount(0);

  const workspaceTop = await page
    .getByTestId("reading-result-observer")
    .evaluate((element) => element.getBoundingClientRect().top + scrollY);
  expect(workspaceTop).toBeLessThan(844);

  await expect(
    page.getByRole("link", { name: "Create your own reading" }),
  ).toHaveAttribute("href", "/?source=instagram&campaign=vertical-slice");
  const createOwnTop = await page
    .getByTestId("shared-create-own")
    .evaluate((element) => element.getBoundingClientRect().top + scrollY);
  expect(createOwnTop).toBeLessThan(844);
  await expect(page.getByRole("link", { name: "한국어" })).toHaveAttribute(
    "href",
    "/ko/share?topic=relationship-flow&style=relational&cards=the-fool%2Cthe-lovers%2Cthe-star&source=instagram&campaign=vertical-slice",
  );

  await page.getByRole("link", { name: "한국어" }).click();

  await expect(page).toHaveURL((url) => url.pathname === "/ko/share");
  await expect(
    page.getByRole("heading", {
      name: "누군가 tarot-spark 리딩을 공유했어요.",
    }),
  ).toBeVisible();
  await expect(page.locator('[data-testid^="reading-card-"]')).toHaveCount(3);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  expectPathname(
    await page.locator('link[rel="canonical"]').getAttribute("href"),
    "/ko/relationship-flow",
  );
});

function expectPathname(href: string | null, pathname: string) {
  expect(href).not.toBeNull();
  expect(new URL(href ?? "http://localhost").pathname).toBe(pathname);
}

async function openReadingPreferences(page: Page) {
  await page.getByTestId("reading-preferences-toggle").click();
}

async function openSituationContext(page: Page) {
  await page.getByTestId("situation-context-toggle").click();
}

async function openPromptContent(page: Page) {
  await page
    .getByTestId("prompt-content-disclosure")
    .locator("summary")
    .click();
}

async function openCardDetails(page: Page) {
  await page.getByTestId("card-details-disclosure").locator("summary").click();
}

async function openShareOptions(page: Page) {
  await page.getByTestId("share-options-disclosure").locator("summary").click();
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

function createValidInstantReading(
  cards: readonly { cardId: string; positionId: string }[],
) {
  const sentence =
    "서두르기보다 지금 확인할 수 있는 선택과 경계를 차분히 살펴보는 흐름입니다. ";

  return {
    headline: "멈춤과 움직임 사이의 선택",
    synthesis: sentence.repeat(3),
    positionReadings: cards.map(({ cardId, positionId }) => ({
      cardId,
      interpretation: sentence.repeat(2),
      positionId,
    })),
    strongestConnection: {
      cardIds: [cards[0]?.cardId, cards[1]?.cardId],
      explanation: sentence.repeat(2),
      relationType: "progression",
    },
    uncertainty: sentence.repeat(2),
    nextStep: sentence,
    reflection: "지금 가장 부담 없이 확인할 수 있는 선택은 무엇인가요?",
  };
}
