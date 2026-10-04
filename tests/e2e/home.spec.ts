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
      name: "Draw cards, then ask your AI.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/draw cards for free.*copy the prompt.*ai tool/i),
  ).toBeVisible();
  await expect(page.getByText(/full 78-card deck/i)).toBeVisible();
});

test("serves stable card art and redirects the issued deck path", async ({
  request,
}) => {
  const current = await request.get("/cards/the-fool.jpg");

  expect(current.ok()).toBe(true);
  expect(current.headers()["content-type"]).toContain("image/jpeg");
  expect(current.headers()["cache-control"]).toContain("s-maxage=86400");
  expect(current.headers()["cache-control"]).not.toContain("immutable");

  const legacy = await request.get("/cards/v3/the-fool.jpg", {
    maxRedirects: 0,
  });

  expect(legacy.status()).toBe(308);
  expect(legacy.headers()["location"]).toBe("/cards/the-fool.jpg");
});

test("loads Korean localized content", async ({ page }) => {
  await page.goto("/ko");

  await expect(page).toHaveTitle("타로 스파크");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(
    page.getByRole("heading", {
      name: "카드를 뽑고, 평소 쓰는 AI에 물어보세요.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/무료로 카드를 뽑고.*질문을 복사해 AI에 붙여 넣으세요/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "카드 3장 뽑기" }),
  ).toBeVisible();
  await expect(page.getByText(/78장 덱/)).toBeVisible();
});

test("keeps the Korean Instagram campaign through the first draw", async ({
  page,
}) => {
  await page.goto(
    "/ko?topic=relationship-flow&style=relational&source=instagram&campaign=prompt-education",
  );

  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page.getByTestId("topic-select")).toHaveValue(
    "relationship-flow",
  );
  await expect(
    page.getByRole("radio", { name: "빠른 3장", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "마음과 관계에 초점", exact: true }),
  ).toBeChecked();

  await page.getByRole("button", { name: "카드 3장 뽑기" }).click();

  await expect(page.getByTestId("prompt-ready")).toBeVisible();
  await expect(page).toHaveURL((url) => {
    const cards = url.searchParams.get("cards")?.split(",");

    return (
      url.pathname === "/ko" &&
      url.searchParams.get("topic") === "relationship-flow" &&
      url.searchParams.get("style") === "relational" &&
      cards?.length === 3 &&
      url.searchParams.get("source") === "instagram" &&
      url.searchParams.get("campaign") === "prompt-education"
    );
  });
});

test("normalizes the published Threads UTM campaign through the first draw", async ({
  page,
}) => {
  await page.goto(
    "/ko?topic=relationship-flow&style=relational&utm_source=threads&utm_medium=social&utm_campaign=demo",
  );

  await expect(page.getByTestId("topic-select")).toHaveValue(
    "relationship-flow",
  );
  await page.getByRole("button", { name: "카드 3장 뽑기" }).click();

  await expect(page.getByTestId("prompt-ready")).toBeVisible();
  await expect(page).toHaveURL((url) => {
    const cards = url.searchParams.get("cards")?.split(",");

    return (
      url.pathname === "/ko" &&
      cards?.length === 3 &&
      url.searchParams.get("source") === "threads" &&
      url.searchParams.get("campaign") === "demo" &&
      !url.searchParams.has("utm_source") &&
      !url.searchParams.has("utm_medium") &&
      !url.searchParams.has("utm_campaign")
    );
  });
});

test("keeps the YouTube profile attribution through the first draw", async ({
  page,
}) => {
  await page.goto(
    "/ko?utm_source=youtube&utm_medium=channel&utm_campaign=profile",
  );

  await page.getByRole("button", { name: "카드 3장 뽑기" }).click();

  await expect(page.getByTestId("prompt-ready")).toBeVisible();
  await expect(page).toHaveURL((url) => {
    return (
      url.pathname === "/ko" &&
      url.searchParams.get("source") === "youtube" &&
      url.searchParams.get("campaign") === "profile" &&
      !url.searchParams.has("utm_source") &&
      !url.searchParams.has("utm_medium") &&
      !url.searchParams.has("utm_campaign")
    );
  });
});

test("shows draw choices and optional context without disclosure clicks", async ({
  page,
}) => {
  for (const locale of ["ko", "en"] as const) {
    const ko = locale === "ko";
    await page.setViewportSize({ height: 844, width: 390 });
    await page.goto(ko ? "/ko" : "/");
    const form = page.getByTestId("reading-setup-form");
    await expect(form.locator(":scope > details")).toHaveCount(1);
    const context = page.getByRole("textbox", {
      name: ko
        ? "상황이나 궁금한 점 (선택)"
        : "Your situation or question (Optional)",
      exact: true,
    });
    await expect(context).toBeVisible();
    await expect(form.getByRole("radio")).toHaveCount(6);
    for (const option of await form.getByRole("radio").all())
      await expect(option).toBeVisible();
    await context.fill("I want to understand what I can change.");
    await page
      .getByRole("radio", {
        name: ko ? "심화 6장" : "Deep 6-card",
        exact: true,
      })
      .check();
    await page
      .getByRole("radio", {
        name: ko ? "솔직하고 분명하게" : "Direct",
        exact: true,
      })
      .check();
    await expect(
      page.getByText(ko ? /돌려 말하지 않고/ : /Name the clearest theme/),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: ko ? "카드 6장 뽑기" : "Draw 6 cards",
        exact: true,
      })
      .click();
    await expect(page.getByTestId(/^reading-card-\d+$/)).toHaveCount(6);
    await expect(page.getByTestId("prompt-ready")).toContainText(
      ko
        ? "작성한 상황도 질문에 담았어요."
        : "Your situation is included in the prompt.",
    );
    expect(new URL(page.url()).searchParams.get("spread")).toBe("deep");
    expect(new URL(page.url()).searchParams.get("style")).toBe("direct");
    expect(page.url()).not.toContain("I+want");
    await page
      .getByRole("button", {
        name: ko ? "다음 카드 준비하기" : "Prepare the next draw",
        exact: true,
      })
      .click();
    await expect(context).toHaveValue(
      "I want to understand what I can change.",
    );
    await page
      .getByRole("radio", {
        name: ko ? "빠른 3장" : "Quick 3-card",
        exact: true,
      })
      .check();
    await page
      .getByRole("button", {
        name: ko ? "이전 카드 결과로 돌아가기" : "Back to previous result",
        exact: true,
      })
      .click();
    await expect(page.getByTestId(/^reading-card-\d+$/)).toHaveCount(6);
    expect(new URL(page.url()).searchParams.get("spread")).toBe("deep");
  }
});

for (const width of [320, 390]) {
  test(`keeps the compact result within ${width}px`, async ({ page }) => {
    await page.setViewportSize({ height: 844, width });
    await page.goto("/ko");
    await page.getByRole("button", { name: "카드 3장 뽑기" }).click();

    const copyButton = page.getByRole("button", {
      name: "질문 복사하기",
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

for (const readingCase of [
  {
    copyAction: "Copy prompt",
    drawAction: "Draw 3 cards",
    localePath: "/",
    spread: "quick",
  },
  {
    copyAction: "질문 복사하기",
    drawAction: "카드 6장 뽑기",
    localePath: "/ko",
    spread: "deep",
  },
] as const) {
  test(`keeps the ${readingCase.spread} overview and copy action in the first mobile result viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await page.goto(readingCase.localePath);

    if (readingCase.spread === "deep") {
      await page.getByRole("radio", { name: /심화 6장/ }).check();
    }

    await page.getByRole("button", { name: readingCase.drawAction }).click();

    const overview = page.getByTestId("card-overview");
    await expect(overview).toBeInViewport();
    await expect(
      page.getByRole("button", { name: readingCase.copyAction }),
    ).toBeInViewport();
    expect(
      await page.evaluate(() => {
        const overviewElement = document.querySelector(
          '[data-testid="card-overview"]',
        );
        const promptReadyElement = document.querySelector(
          '[data-testid="prompt-ready"]',
        );

        return Boolean(
          overviewElement &&
          promptReadyElement &&
          overviewElement.compareDocumentPosition(promptReadyElement) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        );
      }),
    ).toBe(true);
  });
}

for (const width of [390, 1280] as const) {
  test(`prepares a new draw separately and restores the result at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("button", { name: "Draw 3 cards" }).click();
    const currentCards = await page
      .locator("[data-card-id]")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-card-id")),
      );
    const committedUrl = page.url();
    const committedPrompt = await page
      .getByLabel("Generated prompt")
      .inputValue();

    const nextReadingAction = page.getByRole("button", {
      name: "Prepare the next draw",
    });
    await expect(nextReadingAction).toBeInViewport();
    await nextReadingAction.click();
    const prepHeading = page.getByRole("heading", {
      name: "Prepare the next draw",
    });
    await expect(prepHeading).toBeFocused();
    await expect(prepHeading).toBeInViewport();
    await expect(
      page.getByRole("region", { name: "Prepare the next draw" }),
    ).toBeVisible();
    await expect(page.getByTestId("reading-setup-panel")).toBeVisible();
    await expect(page.getByTestId("card-overview")).toHaveCount(0);
    await expect(page.getByTestId("prompt-ready")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Copy prompt" })).toHaveCount(
      0,
    );
    await expect(page.getByTestId("share-options-disclosure")).toHaveCount(0);
    await expect(
      page.getByText(
        "Tarot content is for entertainment and self-reflection only. It is not medical, legal, financial, investment, or mental-health advice.",
        { exact: true },
      ),
    ).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.getByTestId("topic-select").selectOption("reunion");
    expect(page.url()).toBe(committedUrl);

    await page.getByRole("button", { name: "Back to previous result" }).click();
    await expect(nextReadingAction).toBeFocused();
    await expect(page.getByTestId("card-overview")).toBeVisible();
    expect(
      await page
        .locator("[data-card-id]")
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-card-id")),
        ),
    ).toEqual(currentCards);
    await expect(page.getByLabel("Generated prompt")).toHaveValue(
      committedPrompt,
    );
    await expect(page.locator("[data-reveal-sequence]")).toHaveCount(0);
    expect(page.url()).toBe(committedUrl);
    await nextReadingAction.click();
    await expect(page.getByTestId("topic-select")).toHaveValue("love");
    await page.getByTestId("topic-select").selectOption("reunion");
    await page.getByRole("button", { name: "Draw 3 cards" }).click();
    await expect(page.getByTestId("prompt-ready")).toBeVisible();
    await expect(page).toHaveURL(
      (url) => url.searchParams.get("topic") === "reunion",
    );
    await expect(page.getByTestId("reading-card-0")).toHaveAttribute(
      "data-reveal-sequence",
      "2",
    );
  });
}

for (const locale of ["en", "ko"] as const) {
  for (const width of [320, 1280]) {
    test(`explains same-card edits and locale cancellation in ${locale} at ${width}px`, async ({
      page,
    }) => {
      const ko = locale === "ko";
      await page.setViewportSize({ height: 900, width });
      await page.goto(
        `${ko ? "/ko" : "/"}?topic=love&cards=the-fool,the-magician,the-high-priestess`,
      );
      const copyAction = page.getByRole("button", {
        name: ko ? "질문 복사하기" : "Copy prompt",
      });
      const currentEdit = page.getByTestId("current-prompt-customization");
      const nextAction = page.getByTestId("next-reading-action");
      await expect(currentEdit.locator("summary")).toHaveText(
        ko ? /같은 카드로 질문 다듬기/ : /Refine the prompt for these cards/,
      );
      const copyBox = await copyAction.boundingBox();
      const editBox = await currentEdit.boundingBox();
      const nextBox = await nextAction.boundingBox();
      expect(copyBox!.y + copyBox!.height).toBeLessThanOrEqual(editBox!.y);
      expect(editBox!.y + editBox!.height).toBeLessThanOrEqual(nextBox!.y);
      await currentEdit.locator("summary").click();
      await expect(currentEdit).toContainText(
        ko ? "복사할 질문에 바로 반영" : "update the prompt you can copy",
      );
      await currentEdit.getByRole("textbox").fill("Previous private situation");
      const cards = await page
        .locator("[data-card-id]")
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-card-id")),
        );
      await nextAction.click();
      const notice = page.getByTestId("next-reading-locale-notice");
      await expect(notice).toHaveText(
        ko
          ? "언어를 바꾸면 준비 중인 변경은 취소되고 이전 카드 결과로 돌아가요."
          : "Changing language cancels these edits and returns to your previous result.",
      );
      const noticeBox = await notice.boundingBox();
      expect(noticeBox!.x + noticeBox!.width).toBeLessThanOrEqual(width);
      await page.getByTestId("topic-select").selectOption("reunion");

      await page
        .getByTestId("situation-context")
        .getByRole("textbox")
        .fill("Uncommitted next situation");
      await page
        .getByRole("link", { name: ko ? "English" : "한국어", exact: true })
        .click();
      await expect(page.getByTestId("generator-layout")).toHaveAttribute(
        "data-layout-mode",
        "result",
      );
      await expect(page.getByTestId("next-reading-locale-notice")).toHaveCount(
        0,
      );
      expect(
        await page
          .locator("[data-card-id]")
          .evaluateAll((elements) =>
            elements.map((element) => element.getAttribute("data-card-id")),
          ),
      ).toEqual(cards);
      await page
        .getByTestId("current-prompt-customization")
        .locator("summary")
        .click();
      await expect(
        page.getByTestId("current-prompt-customization").getByRole("textbox"),
      ).toHaveValue("Previous private situation");
      await page.getByTestId("next-reading-action").click();
      await expect(page.getByTestId("topic-select")).toHaveValue("love");
      await expect(
        page.getByRole("button", {
          name: ko ? "Back to previous result" : "이전 카드 결과로 돌아가기",
          exact: true,
        }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }
}

test("keeps generator and shared readings usable when session storage access is blocked", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      get: () => {
        throw new DOMException("Storage blocked", "SecurityError");
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Draw 3 cards" }).click();
  await expect(page.getByTestId("prompt-ready")).toBeVisible();
  await page.getByRole("link", { name: "한국어", exact: true }).click();
  await expect(page).toHaveURL(/\/ko\?/);
  await expect(
    page.getByRole("heading", {
      name: "카드를 뽑고, 평소 쓰는 AI에 물어보세요.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByTestId("prompt-ready")).toBeVisible();
  await page.getByTestId("next-reading-action").click();
  await page
    .getByRole("button", { name: "이전 카드 결과로 돌아가기", exact: true })
    .click();
  await expect(page.getByTestId("prompt-ready")).toBeVisible();
  await page.goto(
    "/ko/share?topic=love&cards=the-fool,the-magician,the-high-priestess",
  );
  await expect(page.getByTestId("shared-reading-view")).toBeVisible();
  await expect(page.getByTestId("prompt-ready")).toBeVisible();
  await page.getByRole("link", { name: "내 카드 뽑기", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "카드 3장 뽑기", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("keeps the primary draw and prompt actions ahead of optional detail", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/ko");

  const drawTop = await page
    .getByRole("button", { name: "카드 3장 뽑기" })
    .evaluate((element) => element.getBoundingClientRect().top + scrollY);

  // Basic choices and optional input are visible without expanding panels.
  expect(drawTop).toBeLessThanOrEqual(1400);

  await page.getByRole("button", { name: "카드 3장 뽑기" }).click();
  await expect(page.getByTestId("prompt-ready")).toBeVisible();
  await expect(page.getByLabel("AI에 붙여 넣을 질문")).toBeHidden();
  await expect(page.getByTestId("card-detail-list")).toBeHidden();
  await expect(page.getByRole("button", { name: "공유" })).toBeHidden();

  expect(
    await page.evaluate(() => {
      const promptReady = document.querySelector(
        '[data-testid="prompt-ready"]',
      );
      const promptContent = document.querySelector(
        '[data-testid="prompt-content-disclosure"]',
      );
      const cardDetails = document.querySelector(
        '[data-testid="card-details-disclosure"]',
      );

      return Boolean(
        promptReady &&
        promptContent &&
        cardDetails &&
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

test("keeps the first-time promise and draw usable at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 320 });

  for (const firstVisit of [
    {
      draw: "Draw 3 cards",
      heading: "Draw cards, then ask your AI.",
      intro: /draw cards for free.*copy the prompt.*ai tool/i,
      path: "/",
    },
    {
      draw: "카드 3장 뽑기",
      heading: "카드를 뽑고, 평소 쓰는 AI에 물어보세요.",
      intro: /무료로 카드를 뽑고.*질문을 복사해 AI에 붙여 넣으세요/,
      path: "/ko",
    },
  ]) {
    await page.goto(firstVisit.path);
    await expect(
      page.getByRole("heading", { name: firstVisit.heading }),
    ).toBeVisible();
    await expect(page.getByText(firstVisit.intro)).toBeVisible();

    const draw = page.getByRole("button", { name: firstVisit.draw });
    await expect(draw).toBeVisible();
    expect(
      await draw.evaluate(
        (element) => element.getBoundingClientRect().top + scrollY,
      ),
    ).toBeLessThanOrEqual(1400);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

test("keeps every localized context example visible at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 320 });

  const localizedExamples = [
    {
      contextLabel: /Your situation or question/,
      path: "/",
      topicExamples: [
        ["love", "Example: What should I consider before sharing my feelings?"],
        ["reunion", "Example: What needs to change before I contact my ex?"],
        ["feelings", "Example: What could their shorter replies mean?"],
        [
          "relationship-flow",
          "Example: How can I change our communication pattern?",
        ],
        [
          "career-direction",
          "Example: What should guide my next career choice?",
        ],
      ],
    },
    {
      contextLabel: /상황이나 궁금한 점/,
      path: "/ko",
      topicExamples: [
        ["love", "예: 마음을 표현하기 전에 무엇을 살펴볼까요?"],
        ["reunion", "예: 다시 연락하기 전에 무엇이 달라져야 할까요?"],
        ["feelings", "예: 상대의 연락이 줄어든 건 어떤 의미일까요?"],
        ["relationship-flow", "예: 자꾸 어긋나는 대화를 어떻게 바꿀까요?"],
        ["career-direction", "예: 다음 커리어 선택에서 무엇을 살펴볼까요?"],
      ],
    },
  ] as const;

  for (const { contextLabel, path, topicExamples } of localizedExamples) {
    await page.goto(path);

    const context = page.getByLabel(contextLabel);

    for (const [topicId, placeholder] of topicExamples) {
      await page.getByTestId("topic-select").selectOption(topicId);
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
  await page.goto("/");
  await expect(
    page.locator('meta[name="google-site-verification"]'),
  ).toHaveAttribute("content", "fxoRmo8MjUkhoBr5CVxFtQZjVPXViqaS4MbmInYoOfk");

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
    "별빛 타로 카드 세 장과 tarot-spark 이름이 있는 공유 이미지",
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
      "/three-card-tarot-reading",
      "/ko/three-card-tarot-reading",
      "/how-to-ask-tarot-questions",
      "/ko/how-to-ask-tarot-questions",
      "/tarot-card-combinations",
      "/ko/tarot-card-combinations",
      "/relationship-flow",
      "/ko/relationship-flow",
      "/relationship-tarot-questions",
      "/ko/relationship-tarot-questions",
      "/tarot-questions",
      "/ko/tarot-questions",
    ]),
  );
  expect(sitemapXml).toContain('hreflang="en"');
  expect(sitemapXml).toContain('hreflang="ko"');
  expect(sitemapXml).toContain('hreflang="x-default"');
});

test("serves the relationship question explorer with localized SEO", async ({
  page,
}) => {
  for (const currentPath of [
    "/relationship-tarot-questions",
    "/ko/relationship-tarot-questions",
  ]) {
    const response = await page.goto(currentPath);

    expect(response?.status()).toBe(200);
    expectPathname(
      await page.locator('link[rel="canonical"]').getAttribute("href"),
      currentPath,
    );
    expectPathname(
      await page
        .locator('link[rel="alternate"][hreflang="en"]')
        .getAttribute("href"),
      "/relationship-tarot-questions",
    );
    expectPathname(
      await page
        .locator('link[rel="alternate"][hreflang="ko"]')
        .getAttribute("href"),
      "/ko/relationship-tarot-questions",
    );
  }
});

test("serves the complete question explorer with localized SEO", async ({
  page,
}) => {
  for (const currentPath of ["/tarot-questions", "/ko/tarot-questions"]) {
    const response = await page.goto(currentPath);

    expect(response?.status()).toBe(200);
    expectPathname(
      await page.locator('link[rel="canonical"]').getAttribute("href"),
      currentPath,
    );
    expectPathname(
      await page
        .locator('link[rel="alternate"][hreflang="en"]')
        .getAttribute("href"),
      "/tarot-questions",
    );
    expectPathname(
      await page
        .locator('link[rel="alternate"][hreflang="ko"]')
        .getAttribute("href"),
      "/ko/tarot-questions",
    );
  }
});

test("uses a chosen relationship question in the generated prompt", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 320 });
  await page.goto("/ko/relationship-tarot-questions");
  await page.locator("#perception > summary").click();
  await page.getByRole("link", { name: "서로의 기대 보기" }).click();

  await expect(page).toHaveURL(/topic=feelings&question=mutual-view/);
  await expect(page.getByTestId("selected-public-question")).toContainText(
    "우리는 서로를 어떻게 보고 있을까?",
  );

  const questionPicker = page.getByTestId("public-question-picker");
  const questionPickerSummary = questionPicker.locator(":scope > summary");

  await page.getByTestId("topic-select").selectOption("career-direction");
  await expect(page.getByTestId("selected-public-question")).toHaveCount(0);
  await questionPickerSummary.click();
  await expect(
    page.getByTestId("public-question-groups").locator(":scope > details"),
  ).toHaveCount(5);
  await expect(page.getByTestId("public-question-option")).toHaveCount(14);

  await page.getByTestId("topic-select").selectOption("love");
  await expect(questionPicker).not.toHaveAttribute("open", "");
  await questionPickerSummary.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByTestId("public-question-groups").locator(":scope > details"),
  ).toHaveCount(7);
  await expect(page.getByTestId("public-question-option")).toHaveCount(30);

  const perceptionSummary = page
    .getByTestId("public-question-groups")
    .locator(":scope > details")
    .filter({ hasText: "서로의 생각과 기대" })
    .locator(":scope > summary");
  await perceptionSummary.focus();
  await page.keyboard.press("Enter");
  const mutualViewQuestion = page.getByRole("button", {
    name: /우리는 서로를 어떻게 보고 있을까/,
  });
  await mutualViewQuestion.focus();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/topic=feelings&question=mutual-view/);
  await expect(page.getByTestId("topic-select")).toHaveValue("feelings");
  await expect(questionPicker).not.toHaveAttribute("open", "");
  await expect(questionPickerSummary).toContainText(
    "우리는 서로를 어떻게 보고 있을까?",
  );
  await expect(questionPickerSummary).toBeFocused();
  await expect(
    page.getByRole("button", { name: "카드 3장 뽑기" }),
  ).toBeVisible();
  await expect(page.getByTestId("selected-public-question")).toContainText(
    "우리는 서로를 어떻게 보고 있을까?",
  );
  await questionPickerSummary.click();
  await expect(
    page
      .getByTestId("public-question-groups")
      .locator(":scope > details[open]"),
  ).toHaveCount(1);
  await expect(perceptionSummary.locator("..")).toHaveAttribute("open", "");
  await page.getByRole("button", { name: "구체 질문만 지우기" }).click();
  await expect(page.getByTestId("topic-select")).toHaveValue("feelings");
  expect(new URL(page.url()).searchParams.get("question")).toBeNull();
  await expect(questionPicker).not.toHaveAttribute("open", "");
  await expect(questionPickerSummary).toBeFocused();
  await expect(
    page.getByRole("button", { name: "카드 3장 뽑기" }),
  ).toBeVisible();

  await questionPickerSummary.click();
  await perceptionSummary.click();
  await page
    .getByRole("button", { name: /우리는 서로를 어떻게 보고 있을까/ })
    .click();
  await expect(page).toHaveURL(/topic=feelings&question=mutual-view/);
  await expect(questionPickerSummary).toBeFocused();
  const selectorBox = await page
    .getByTestId("public-question-picker")
    .boundingBox();
  expect(selectorBox).not.toBeNull();
  expect(selectorBox?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect(
    (selectorBox?.x ?? 0) + (selectorBox?.width ?? 321),
  ).toBeLessThanOrEqual(320);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page
    .getByRole("textbox", { name: /상황이나 궁금한 점/ })
    .fill("이 내용은 다음 질문을 고르는 동안에도 유지되어야 해요.");
  await page.getByRole("button", { name: "카드 3장 뽑기" }).click();

  await expect(page.getByTestId("current-public-question")).toContainText(
    "우리는 서로를 어떻게 보고 있을까?",
  );
  await expect(page.getByTestId("current-question-frame")).toHaveText(
    "서로의 시선과 기대를 가능성으로 읽습니다.",
  );
  await expect(page.getByTestId("current-question-frame")).not.toContainText(
    "호감",
  );
  await page
    .getByTestId("prompt-content-disclosure")
    .locator("summary")
    .click();
  await expect(page.getByLabel("AI에 붙여 넣을 질문")).toHaveValue(
    /고른 질문: 상대가 독자를 보는 시선과 독자가 상대를 보는 시선을 카드 의미로 각각 읽고/,
  );
  await expect(page.getByLabel("AI에 붙여 넣을 질문")).toHaveValue(
    /첫 두 문장 안에 카드가 가장 강하게 시사하는 답을 주세요/,
  );
  await expect(page).toHaveURL(/question=mutual-view/);
  const committedUrl = page.url();
  const committedCards = await page
    .locator("[data-card-id]")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-card-id")),
    );

  await page.getByRole("button", { name: "다음 카드 준비하기" }).click();
  await expect(
    page.getByRole("region", { name: "다음 카드 준비하기" }),
  ).toBeVisible();
  await expect(page.getByTestId("card-overview")).toHaveCount(0);
  await expect(page.getByTestId("prompt-ready")).toHaveCount(0);
  await expect(
    page.getByText(
      "타로는 재미와 자기 성찰을 위한 도구입니다. 의료·법률·재정·투자·정신 건강에 관한 전문 조언을 대신하지 않습니다.",
      { exact: true },
    ),
  ).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("link", { name: "다른 관계 질문 둘러보기" }),
  ).toHaveCount(0);
  await page.getByTestId("topic-select").selectOption("love");
  await page
    .getByTestId("public-question-picker")
    .locator("summary")
    .first()
    .click();
  await page
    .getByRole("button", { name: /우리 속도는 서로에게 맞을까/ })
    .click();
  await expect(page.getByTestId("selected-public-question")).toContainText(
    "우리 속도는 서로에게 맞을까?",
  );
  await expect(page.getByTestId("current-public-question")).toHaveCount(0);
  expect(page.url()).toBe(committedUrl);
  await expect(page.locator("[data-card-id]")).toHaveCount(0);

  await expect(
    page.getByRole("textbox", { name: /상황이나 궁금한 점/ }),
  ).toHaveValue("이 내용은 다음 질문을 고르는 동안에도 유지되어야 해요.");
  await expect(page.getByRole("link", { name: "English" })).toHaveAttribute(
    "href",
    /topic=feelings.*question=mutual-view/,
  );

  await page.getByRole("button", { name: "이전 카드 결과로 돌아가기" }).click();
  await expect(page.getByTestId("public-question-picker")).toHaveCount(0);
  await expect(page.getByTestId("current-public-question")).toContainText(
    "우리는 서로를 어떻게 보고 있을까?",
  );
  expect(page.url()).toBe(committedUrl);
  expect(
    await page
      .locator("[data-card-id]")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-card-id")),
      ),
  ).toEqual(committedCards);

  await page.getByRole("button", { name: "다음 카드 준비하기" }).click();
  await page.getByTestId("topic-select").selectOption("love");
  await page
    .getByTestId("public-question-picker")
    .locator("summary")
    .first()
    .click();
  await page
    .getByRole("button", { name: /우리 속도는 서로에게 맞을까/ })
    .click();
  await page.getByRole("button", { name: "카드 3장 뽑기" }).click();
  await expect(page).toHaveURL(/topic=love.*question=pace-of-closeness/);
  await expect(page.getByTestId("current-public-question")).toContainText(
    "우리 속도는 서로에게 맞을까?",
  );
  await expect(page.getByTestId("reading-card-0")).toHaveAttribute(
    "data-reveal-sequence",
    "2",
  );
  await openPromptContent(page);
  await expect(page.getByLabel("AI에 붙여 넣을 질문")).toHaveValue(
    /관계의 속도에서 내가 편안한 지점, 상대가 행동으로 보인 속도/,
  );
  await expect(page.getByLabel("AI에 붙여 넣을 질문")).toHaveValue(
    /이 내용은 다음 질문을 고르는 동안에도 유지되어야 해요/,
  );
});

test("uses the selected question frame instead of broad interest copy", async ({
  page,
}) => {
  await page.goto("/?topic=feelings&question=mutual-view");
  await page.getByRole("button", { name: "Draw 3 cards" }).click();

  await expect(page.getByTestId("current-public-question")).toContainText(
    "How do we see each other?",
  );
  await expect(page.getByTestId("current-question-frame")).toHaveText(
    "Read each person's possible view and hopes.",
  );
  await expect(page.getByTestId("current-question-frame")).not.toContainText(
    "interest",
  );
});

test("keeps broad and partner impressions separate from current attraction", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 320 });
  await page.goto("/ko?topic=love");

  const picker = page.getByTestId("public-question-picker");
  const pickerSummary = picker.locator(":scope > summary");
  const perceptionGroup = page
    .getByTestId("public-question-groups")
    .locator(":scope > details")
    .filter({ hasText: "서로의 생각과 기대" });

  await pickerSummary.click();
  await perceptionGroup.locator(":scope > summary").click();
  await page
    .getByRole("button", { name: /그 사람은 나를 어떤 사람으로 볼까/ })
    .click();
  await expect(page).toHaveURL(/topic=love&question=how-they-see-me/);
  await expect(page.getByTestId("topic-select")).toHaveValue("love");

  await pickerSummary.click();
  await page
    .getByRole("button", { name: /나는 연애 상대로 어떤 인상일까/ })
    .click();
  await expect(page).toHaveURL(
    /topic=love&question=romantic-partner-impression/,
  );
  await page.getByRole("button", { name: "카드 3장 뽑기" }).click();

  const result = page.getByTestId("reading-result-observer");
  await expect(result).toContainText("나는 연애 상대로 어떤 인상일까?");
  await expect(result).toContainText(
    "다가가기 쉬운 점과 망설이게 할 수 있는 모습을 봅니다.",
  );
  await openPromptContent(page);
  await expect(page.getByLabel("AI에 붙여 넣을 질문")).toHaveValue(
    /고른 질문: 특정 상대의 현재 호감을 꾸며내지 말고/,
  );
  await expect(page.getByLabel("AI에 붙여 넣을 질문")).toHaveValue(
    /질문에 없는 호감 해석을 덧붙이지 마세요/,
  );
});

test("offers distinctive career questions under one optional hierarchy", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 320 });
  await page.goto("/ko?topic=career-direction");
  await page
    .getByTestId("public-question-picker")
    .locator("summary")
    .first()
    .click();

  await expect(
    page.getByTestId("public-question-groups").locator(":scope > details"),
  ).toHaveCount(5);
  await expect(page.getByTestId("public-question-option")).toHaveCount(14);
  await page.getByText("내 강점과 성장", { exact: true }).click();
  await page
    .getByRole("button", {
      name: /내가 놓치고 있는 강점은/,
    })
    .click();

  await expect(page).toHaveURL(
    /topic=career-direction&question=career-underused-strength/,
  );
  await expect(page.getByTestId("selected-public-question")).toContainText(
    "너무 익숙해 몰랐던 내 강점",
  );
  await expect(page.getByRole("link", { name: "English" })).toHaveAttribute(
    "href",
    /topic=career-direction.*question=career-underused-strength/,
  );

  await page
    .getByTestId("public-question-picker")
    .locator(":scope > summary")
    .click();
  await page.getByRole("button", { name: "구체 질문만 지우기" }).click();
  await expect(page).toHaveURL(/\/ko\?topic=career-direction$/);
  await expect(page.getByTestId("selected-public-question")).toHaveCount(0);
  await page.getByRole("button", { name: "카드 3장 뽑기" }).click();
  await expect(page.getByTestId("current-public-question")).toHaveCount(0);
  await openPromptContent(page);
  await expect(page.getByLabel("AI에 붙여 넣을 질문")).toHaveValue(
    /주제의 세부 초점: 일에서 어디에 힘을 쏟고 있는지/,
  );

  await page.getByRole("button", { name: "다음 카드 준비하기" }).click();
  await page
    .getByTestId("public-question-picker")
    .locator("summary")
    .first()
    .click();
  await page.getByText("내 강점과 성장", { exact: true }).click();
  await page
    .getByRole("button", {
      name: /내가 놓치고 있는 강점은/,
    })
    .click();
  await page.getByRole("button", { name: "카드 3장 뽑기" }).click();
  await expect(page.getByTestId("current-public-question")).toContainText(
    "내가 놓치고 있는 강점은?",
  );
  await openPromptContent(page);
  await expect(page.getByLabel("AI에 붙여 넣을 질문")).toHaveValue(
    /고른 질문: 익숙해서 지나치고 있을 수 있는 강점/,
  );
  await expect(page.getByLabel("AI에 붙여 넣을 질문")).not.toHaveValue(
    /주제의 세부 초점: 일에서 어디에 힘을 쏟고 있는지/,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("carries a money question from the complete catalog through a safe mobile result", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 320 });
  await page.goto("/ko/tarot-questions#money-priorities");
  await page.locator("#money-priorities > summary").click();
  await page.getByRole("link", { name: "소비 구분하기" }).click();

  await expect(page).toHaveURL(/topic=money-life&question=money-want-or-need/);
  await expect(page.getByTestId("topic-select")).toHaveValue("money-life");
  await expect(page.getByTestId("selected-public-question")).toContainText(
    "원하는 소비와 필요한 소비를 어떻게 나눌까?",
  );
  await expect(
    page.getByTestId("public-question-picker").locator(":scope > summary"),
  ).toContainText("원하는 소비와 필요한 소비를 어떻게 나눌까?");
  await expect(page.getByTestId("money-reading-disclaimer")).toHaveText(
    "돈 리딩은 자기 성찰용이며 재정 조언이 아닙니다. 결정 전 실제 비용과 조건을 확인하세요.",
  );

  await page.getByRole("button", { name: "카드 3장 뽑기" }).click();

  await expect(page.getByTestId("result-context-notice")).toHaveText(
    "돈 리딩은 자기 성찰용이며 재정 조언이 아닙니다. 결정 전 실제 비용과 조건을 확인하세요.",
  );
  await expect(page.getByTestId("prompt-ready")).toContainText(
    "복사할 질문은 AI에 카드가 시사하는 답부터 말한 뒤, 가능한 해석 두 가지와 직접 확인할 점, 해볼 일 하나를 알려 달라고 요청해요.",
  );
  await expect(
    page.getByRole("button", { name: "지금 바로 해석하기" }),
  ).toHaveCount(0);
  await openPromptContent(page);
  await expect(page.getByLabel("AI에 붙여 넣을 질문")).toHaveValue(
    /수입·가격·대출·빚·투자 수익을 예측하거나 매수·매도·차입을 지시하거나 감당 가능하다고 판단하지 마세요/,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

for (const width of [390, 1280]) {
  test(`takes a first-time user from the footer catalog to money and broad self readings at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width });
    await page.goto("/ko");
    await page
      .getByTestId("site-footer")
      .getByRole("link", { name: "타로 질문 모음" })
      .click();

    await expect(page).toHaveURL("/ko/tarot-questions");
    await expect(page.locator("#domain-self")).toBeVisible();
    await page.locator("#money-priorities > summary").click();
    await page.getByRole("link", { name: "소비 구분하기" }).click();

    await expect(page).toHaveURL(
      /\/ko\?topic=money-life&question=money-want-or-need$/,
    );
    await expect(page.getByTestId("selected-public-question")).toContainText(
      "원하는 소비와 필요한 소비를 어떻게 나눌까?",
    );
    await page.getByRole("button", { name: "카드 3장 뽑기" }).click();
    await expect(page.getByTestId("current-public-question")).toContainText(
      "원하는 소비와 필요한 소비를 어떻게 나눌까?",
    );
    await page.getByRole("button", { name: "질문 복사하기" }).click();
    await expect(page.getByTestId("prompt-copy-success")).toContainText(
      "복사했어요",
    );
    await expect(
      page.getByRole("button", { name: "지금 바로 해석하기" }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "다음 카드 준비하기" }).click();
    await page.getByTestId("topic-select").selectOption("self-direction");
    await expect(page.getByTestId("selected-public-question")).toHaveCount(0);
    await expect(
      page.getByTestId("public-question-picker").locator(":scope > summary"),
    ).toContainText("이 영역 질문 18개");
    await page.getByRole("button", { name: "카드 3장 뽑기" }).click();

    await expect(page).toHaveURL((url) => {
      return (
        url.pathname === "/ko" &&
        url.searchParams.get("topic") === "self-direction" &&
        !url.searchParams.has("question")
      );
    });
    await expect(page.getByTestId("current-public-question")).toHaveCount(0);
    await openPromptContent(page);
    await expect(page.getByLabel("AI에 붙여 넣을 질문")).toHaveValue(
      /남의 기대와 사용자가 실제로 중요하게 여기는 가치를 나누고/,
    );
    await expect(
      page.getByRole("button", { name: "지금 바로 해석하기" }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}

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

test("serves every complete tarot guide at an exact localized route", async ({
  page,
}) => {
  const guideRoutePairs = [
    ["/three-card-tarot-reading", "/ko/three-card-tarot-reading"],
    ["/how-to-ask-tarot-questions", "/ko/how-to-ask-tarot-questions"],
    ["/tarot-card-combinations", "/ko/tarot-card-combinations"],
  ] as const;

  for (const [englishPath, koreanPath] of guideRoutePairs) {
    for (const currentPath of [englishPath, koreanPath]) {
      const response = await page.goto(currentPath);

      expect(response?.status()).toBe(200);
      expectPathname(
        await page.locator('link[rel="canonical"]').getAttribute("href"),
        currentPath,
      );
      expectPathname(
        await page
          .locator('link[rel="alternate"][hreflang="en"]')
          .getAttribute("href"),
        englishPath,
      );
      expectPathname(
        await page
          .locator('link[rel="alternate"][hreflang="ko"]')
          .getAttribute("href"),
        koreanPath,
      );
      expectPathname(
        await page
          .locator('link[rel="alternate"][hreflang="x-default"]')
          .getAttribute("href"),
        englishPath,
      );
    }
  }

  await page.goto("/ko/three-card-tarot-reading");

  await expect(
    page.getByRole("heading", {
      name: /과거·현재·미래를 정하지 않고 카드 세 장 읽는 법/,
    }),
  ).toBeVisible();
  await expect(page.getByText(/대안 A: 신뢰는 회복 중이지만/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "카드 세 장 뽑기" }),
  ).toHaveAttribute("href", "/ko?spread=quick");
  await page.goto("/tarot-card-combinations");
  await expect(
    page.getByRole("heading", {
      name: /read tarot card combinations without a fixed pair dictionary/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/Alternative A: the next direction/i),
  ).toBeVisible();
});

test("preserves reading and private context when switching languages", async ({
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
  await page.goto("/");

  await page
    .getByRole("textbox", { name: /Your situation or question/ })
    .fill("My manager relationship is difficult.");
  const activeLocaleUrl = page.url();
  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(activeLocaleUrl);
  await expect(
    page.getByRole("textbox", { name: /Your situation or question/ }),
  ).toHaveValue("My manager relationship is difficult.");
  await page.getByRole("button", { name: "Draw 3 cards" }).click();
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
      name: "카드를 뽑고, 평소 쓰는 AI에 물어보세요.",
    }),
  ).toBeVisible();
  await page.getByText("같은 카드로 질문 다듬기").click();
  await openPromptContent(page);
  await expect(page.getByLabel("AI에 붙여 넣을 질문")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: /상황이나 궁금한 점/ }),
  ).toHaveValue("My manager relationship is difficult.");
  expect(
    await page
      .locator("[data-card-id]")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-card-id")),
      ),
  ).toEqual(englishCardIds);
  await expect(page).not.toHaveURL(/manager|context/i);
  expect(hydrationErrors).toEqual([]);
});

test("creates a direct six-card prompt while keeping context private", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("radio", { name: /Deep 6-card/ }).check();
  await page.getByRole("radio", { name: /Direct/ }).check();
  await page
    .getByRole("textbox", { name: /Your situation or question/ })
    .fill(
      "My manager relationship is exhausting. Should I stay at this company?",
    );
  await page.getByRole("button", { name: "Draw 6 cards" }).click();
  await openPromptContent(page);

  await expect(page.locator('[data-testid^="reading-card-"]')).toHaveCount(6);
  await expect(page.getByLabel("Generated prompt")).toContainText(
    "Drawn cards (6-card reading)",
  );
  await expect(page.getByLabel("Generated prompt")).toContainText(
    "Tone: Direct",
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
  await page.setViewportSize({ height: 844, width: 390 });
  let providerRequest: Record<string, unknown> | undefined;
  await page.route("**/api/reading", async (route) => {
    providerRequest = route.request().postDataJSON() as Record<string, unknown>;
    const cards = providerRequest["cards"] as { cardId: string }[];

    await route.fulfill({
      body: JSON.stringify({ text: createValidInstantReading(cards.length) }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.goto("/ko");

  await page
    .getByRole("textbox", { name: /상황이나 궁금한 점/ })
    .fill("서버로 보내면 안 되는 민감한 개인 상황");
  await page.getByRole("button", { name: "카드 3장 뽑기" }).click();
  await page.getByRole("button", { name: "지금 바로 해석하기" }).click();

  await expect(page.getByTestId("instant-reading-result")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "AI 카드 흐름 해석" }),
  ).toBeFocused();
  await expect(page.getByTestId("instant-reading-result")).toContainText(
    "[가능성 A]",
  );
  await expect(page.getByTestId("instant-reading-result")).toContainText(
    "멈추거나 다시 볼 조건:",
  );
  await expect(
    page.getByText("생성형 AI를 활용해 작성한 해석입니다."),
  ).toBeVisible();
  await openPromptContent(page);
  await expect(page.getByLabel("AI에 붙여 넣을 질문")).toBeVisible();
  expect(Object.keys(providerRequest ?? {}).sort()).toEqual(
    ["cards", "spreadId", "styleId", "topicId"].sort(),
  );
  expect(JSON.stringify(providerRequest)).not.toContain("민감한 개인 상황");
  expect(JSON.stringify(providerRequest)).not.toContain("userContext");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("draws tarot cards and copies the generated prompt", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: undefined,
    });
  });
  await page.goto("/");

  await page.getByTestId("topic-select").selectOption("reunion");
  await expect(page.getByRole("link", { name: "한국어" })).toHaveAttribute(
    "href",
    "/ko?topic=reunion",
  );
  await page.getByRole("button", { name: "Draw 3 cards" }).click();
  await openPromptContent(page);

  await expect(page.getByLabel("Generated prompt")).toContainText(
    "Topic: Reunion",
  );
  await expect(page.getByLabel("Generated prompt")).toContainText(
    "No card images are attached",
  );
  const firstCardName = await page
    .getByTestId("reading-card-0")
    .locator(":scope > span")
    .last()
    .innerText();
  await expect(page.getByLabel("Generated prompt")).toContainText(
    `1. ${firstCardName}`,
  );
  await expect(
    page.getByText(/Tarot content is for entertainment/),
  ).toBeVisible();

  await page.getByRole("button", { name: "Copy prompt" }).click();

  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
  await expect(
    page.getByText(
      "Copied. Paste it into the AI tool you use to get the reading.",
    ),
  ).toBeVisible();

  await openShareOptions(page);
  await page.getByRole("button", { name: "Copy URL" }).click();

  await expect(page.getByRole("button", { name: "URL copied" })).toBeVisible();

  const instagramAction = page.getByRole("button", {
    name: "Save image for Instagram",
  });
  await expect(instagramAction).toBeEnabled();
  const downloadPromise = page.waitForEvent("download");
  await instagramAction.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("tarot-spark.png");
  await expect(page.getByTestId("share-status")).toHaveText(
    "Image download started",
  );
  expect(
    await page.getByTestId("share-actions").getByRole("button").count(),
  ).toBeGreaterThanOrEqual(2);
});

test("serves the relationship guide and a noindex privacy-safe share preview", async ({
  page,
  request,
}) => {
  await page.goto("/relationship-flow?source=naver&campaign=topic-guide");

  await expect(
    page.getByRole("heading", {
      name: /if ai tarot answers feel generic/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Start with three cards" }).first(),
  ).toHaveAttribute(
    "href",
    "/?topic=relationship-flow&style=relational&source=naver&campaign=topic-guide",
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
  expect(localImageUrl.searchParams.has("rev")).toBe(false);
  expect(localImageUrl.searchParams.has("v")).toBe(false);

  const imageStates = [
    "spread=quick&cards=the-fool,the-lovers,the-star",
    "spread=deep&cards=pentacles-queen,the-high-priestess,wands-knight,swords-10,cups-page,wheel-of-fortune",
  ] as const;

  for (const locale of ["en", "ko"] as const) {
    for (const state of imageStates) {
      const imageResponse = await request.get(
        `/api/share-image?locale=${locale}&topic=relationship-flow&style=relational&${state}`,
      );
      const imageBody = await imageResponse.body();

      expect(imageResponse.ok()).toBe(true);
      expect(imageResponse.headers()["content-type"]).toContain("image/png");
      expect(imageResponse.headers()["cache-control"]).toContain(
        "s-maxage=86400",
      );
      expect(imageResponse.headers()["cache-control"]).not.toContain(
        "immutable",
      );
      expect(Array.from(imageBody.subarray(0, 8))).toEqual([
        137, 80, 78, 71, 13, 10, 26, 10,
      ]);
      expect(imageBody.readUInt32BE(16)).toBe(1200);
      expect(imageBody.readUInt32BE(20)).toBe(630);
    }
  }

  await page.goto(
    "/share?topic=relationship-flow&cards=the-fool,the-lovers,the-star&context=private",
  );
  await expect(page).toHaveURL(/\/relationship-flow$/);
  await expect(page).not.toHaveURL(/private|context/);
});

test("keeps a shared money reading noindex with the complete catalog canonical", async ({
  page,
}) => {
  await page.goto(
    "/ko/share?topic=money-life&question=money-want-or-need&cards=the-fool,the-lovers,the-star&source=copy&campaign=vertical-slice",
  );

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  expectPathname(
    await page.locator('link[rel="canonical"]').getAttribute("href"),
    "/ko/tarot-questions",
  );
  await expect(page.getByTestId("result-context-notice")).toHaveText(
    "돈 리딩은 자기 성찰용이며 재정 조언이 아닙니다. 결정 전 실제 비용과 조건을 확인하세요.",
  );

  const openGraphUrl = new URL(
    (await page.locator('meta[property="og:url"]').getAttribute("content")) ??
      "http://localhost",
  );
  expect(openGraphUrl.pathname).toBe("/ko/share");
  expect(openGraphUrl.searchParams.get("topic")).toBe("money-life");
  expect(openGraphUrl.searchParams.get("question")).toBe("money-want-or-need");
  expect(openGraphUrl.searchParams.has("source")).toBe(false);
  expect(openGraphUrl.searchParams.has("campaign")).toBe(false);

  const imageUrl = new URL(
    (await page.locator('meta[property="og:image"]').getAttribute("content")) ??
      "http://localhost",
  );
  expect(imageUrl.searchParams.get("topic")).toBe("money-life");
  expect(imageUrl.searchParams.has("question")).toBe(false);
  expect(imageUrl.searchParams.has("focus")).toBe(false);
});

test("renders a shared reading first and keeps its localized share route", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  const response = await page.goto(
    "/share?topic=relationship-flow&style=relational&cards=the-fool,the-lovers,the-star&source=instagram&campaign=vertical-slice",
  );

  expect(await response?.text()).toContain(
    "Someone shared a tarot-spark reading.",
  );
  await expect(page.getByTestId("shared-reading-view")).toBeVisible();
  await expect(page.locator('[data-testid^="reading-card-"]')).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: /Draw \d+ cards/ }),
  ).toHaveCount(0);
  await expect(page.getByTestId("reading-preferences")).toHaveCount(0);
  await expect(page.getByTestId("situation-context")).toHaveCount(0);
  await expect(page.getByTestId("public-question-picker")).toHaveCount(0);
  await expect(page.getByTestId("next-reading-action")).toHaveCount(0);

  const workspaceTop = await page
    .getByTestId("reading-result-observer")
    .evaluate((element) => element.getBoundingClientRect().top + scrollY);
  expect(workspaceTop).toBeLessThan(844);

  await expect(
    page.getByRole("link", { name: "Draw my cards" }),
  ).toHaveAttribute("href", "/?source=instagram&campaign=vertical-slice");
  expect(
    await page.evaluate(() => {
      const copyPrompt = document.querySelector('[data-testid="prompt-ready"]');
      const createOwn = document.querySelector(
        '[data-testid="shared-create-own"]',
      );

      return Boolean(
        copyPrompt &&
        createOwn &&
        copyPrompt.compareDocumentPosition(createOwn) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }),
  ).toBe(true);
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

function createValidInstantReading(cardCount: number) {
  const cardLines = [
    "새로운 시도를 열어 두되 아직 확인하지 않은 기대를 사실처럼 단정하지 않는 태도를 살펴봅니다.",
    "표현할 수 있는 선택과 자원을 구체적으로 사용하면 원하는 경계를 더 분명히 전할 수 있습니다.",
    "아픈 감정을 서둘러 지우기보다 실제로 확인한 행동과 해석을 나누어 바라볼 필요가 있습니다.",
    "서로 주고받는 균형이 한쪽의 희생으로 기울지 않는지 현실의 부담을 함께 확인해 봅니다.",
    "감정의 친밀함과 실제 약속의 범위가 같은 방향인지 행동을 통해 천천히 살펴봅니다.",
    "공정함을 원하는 마음이 단단한 경계로 이어지는지 같은 기준을 적용하는지 봅니다.",
  ]
    .slice(0, cardCount)
    .map((line, index) => `${index + 1}. ${line}`)
    .join("\n");

  return `[전체 흐름]
새로운 가능성과 분명한 표현이 함께 필요하지만 확인하지 않은 부분은 현실의 대화로 살펴야 기대와 관찰을 구분할 수 있습니다.
[카드별 흐름]
${cardLines}
[가장 강한 연결]
열린 가능성과 능동적인 표현이 서로 힘을 보태지만 감정을 건너뛰면 속도가 현실보다 앞설 수 있다는 긴장이 두드러집니다.
[가능성 A]
서로 표현하는 속도가 달라서 같은 행동을 다르게 받아들이며 불확실성이 커졌을 수 있습니다.
[가능성 B]
기대가 실제로 확인한 신호보다 앞서서 관계의 빈칸을 스스로 채우고 있을 수 있습니다.
[현실 확인]
아직 모르는 점: 현재 정보만으로는 서로 같은 기대와 관계의 속도를 원하는지 알 수 없습니다.
관찰할 점: 다음 대화에서 질문에 대한 답과 이후 행동이 일정하게 이어지는지 살펴보세요.
다시 볼 조건: 말과 행동이 계속 어긋나면 두 가능성을 모두 내려놓고 다시 살펴보세요.
[다음 행동]
작은 행동: 부담이 적은 질문 하나를 골라 서로 확인할 수 있는 범위에서 짧게 대화해 보세요.
멈추거나 다시 볼 조건: 대화가 반복해서 경계를 넘거나 일상에 큰 비용을 만들면 이 행동을 멈추고 다시 판단하세요.
[성찰 질문]
지금 내가 기대와 실제 관찰을 구분하기 위해 가장 먼저 확인할 수 있는 것은 무엇인가요?`;
}
