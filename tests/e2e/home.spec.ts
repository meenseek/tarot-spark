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
      name: "Draw your cards.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/copy your card prompt and ask your AI/i),
  ).toBeVisible();
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
      name: "카드를 뽑아보세요.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/카드를 뽑고, 궁금한 이야기의 AI 해석을 여기서 읽어보세요/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "카드 3장 뽑기" }),
  ).toBeVisible();
});

for (const locale of ["ko", "en"] as const) {
  for (const width of [390, 1280]) {
    test(`resets the reading through the home brand in ${locale} at ${width}px`, async ({
      page,
    }) => {
      const ko = locale === "ko";
      const home = ko ? "/ko" : "/";
      const context = page.getByRole("textbox", {
        name: ko
          ? "상황이나 궁금한 점 (선택)"
          : "Your situation or question (Optional)",
        exact: true,
      });
      const quick = page.getByRole("radio", {
        name: ko ? "빠른 3장" : "Quick 3-card",
        exact: true,
      });
      const deep = page.getByRole("radio", {
        name: ko ? "심화 6장" : "Deep 6-card",
        exact: true,
      });
      const direct = page.getByRole("radio", {
        name: ko ? "솔직하고 분명하게" : "Direct",
        exact: true,
      });
      const brand = page
        .getByTestId("site-header")
        .getByRole("link", { name: "tarot-spark", exact: true });

      async function expectCleanHome() {
        await expect(page).toHaveURL((url) => {
          return url.pathname === home && url.search === "";
        });
        await expect(page.getByTestId("generator-layout")).toHaveAttribute(
          "data-layout-mode",
          "setup",
        );
        await expect(page.getByTestId("reading-setup-form")).toBeVisible();
        await expect(page.getByTestId("reading-result-observer")).toHaveCount(
          0,
        );
        await expect(page.getByTestId("next-reading-action")).toHaveCount(0);
        await expect(page.getByTestId("topic-select")).toHaveValue("love");
        await expect(quick).toBeChecked();
        await expect(
          page.getByRole("radio", {
            name: ko ? "균형 있게" : "Balanced",
            exact: true,
          }),
        ).toBeChecked();
        await expect(context).toHaveCount(0);
      }

      await page.setViewportSize({ height: 844, width });
      await page.goto(home);
      if (width === 1280) await deep.check();
      await page
        .getByRole("button", {
          name: ko
            ? `카드 ${width === 1280 ? 6 : 3}장 뽑기`
            : `Draw ${width === 1280 ? 6 : 3} cards`,
          exact: true,
        })
        .click();
      await expect(page.getByTestId(/^reading-card-\d+$/)).toHaveCount(
        width === 1280 ? 6 : 3,
      );
      await openCopyContext(page);
      await context.fill("A private situation for this reading.");
      if (width === 390) {
        await brand.focus();
        await brand.press("Enter");
      } else {
        await brand.click();
      }
      await expectCleanHome();

      await page.getByTestId("topic-select").selectOption("career-direction");
      await expect(context).toHaveCount(0);
      await deep.check();
      await direct.check();
      await brand.click();
      await expectCleanHome();

      await page
        .getByRole("button", {
          name: ko ? "카드 3장 뽑기" : "Draw 3 cards",
          exact: true,
        })
        .click();
      await page.getByTestId("next-reading-action").click();
      await expect(context).toHaveCount(0);
      await deep.check();
      await direct.check();
      await brand.click();
      await expectCleanHome();
    });
  }
}

test("keeps campaign attribution when the home brand restarts a reading", async ({
  page,
}) => {
  await page.goto("/ko?source=instagram&campaign=prompt-education");
  await page.getByRole("button", { name: "카드 3장 뽑기" }).click();
  await expect(page.getByTestId("next-reading-action")).toBeVisible();
  await page
    .getByTestId("site-header")
    .getByRole("link", { name: "tarot-spark", exact: true })
    .click();
  await expect(page).toHaveURL(
    "/ko?source=instagram&campaign=prompt-education",
  );
  await expect(page.getByTestId("generator-layout")).toHaveAttribute(
    "data-layout-mode",
    "setup",
  );
  await expect(page.getByTestId("reading-result-observer")).toHaveCount(0);
  await expect(page.getByTestId("reading-setup-form")).toBeVisible();
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

test("shows draw settings first and collects context only for copying", async ({
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
    await expect(context).toHaveCount(0);
    await expect(form.getByRole("radio")).toHaveCount(6);
    for (const option of await form.getByRole("radio").all())
      await expect(option).toBeVisible();
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
    await openCopyContext(page);
    await context.fill("I want to understand what I can change.");
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
    await expect(context).toHaveCount(0);
    await expect(page.getByTestId("retained-copy-context")).toBeVisible();
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
    await openCopyContext(page);
    await expect(context).toHaveValue(
      "I want to understand what I can change.",
    );
  }
});

for (const width of [390, 1280]) {
  test(`finishes a reading after oversized situation input at ${width}px`, async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.setViewportSize({ height: 844, width });

    for (const locale of ["ko", "en"] as const) {
      const ko = locale === "ko";
      await page.goto(ko ? "/ko" : "/");
      const context = page.getByRole("textbox", {
        name: ko
          ? "상황이나 궁금한 점 (선택)"
          : "Your situation or question (Optional)",
        exact: true,
      });
      await page
        .getByRole("button", {
          name: ko ? "카드 3장 뽑기" : "Draw 3 cards",
          exact: true,
        })
        .click();
      const resultUrl = page.url();
      await expect(page.getByTestId(/^reading-card-\d+$/)).toHaveCount(3);
      const cardIds = await page
        .locator("[data-card-id]")
        .evaluateAll((cards) =>
          cards.map((card) => card.getAttribute("data-card-id")),
        );
      await page
        .getByTestId("current-prompt-customization")
        .locator("summary")
        .click();
      await context.fill(`${"a".repeat(500)}discarded-tail`);
      await expect(context).toHaveValue("a".repeat(500));
      await context.fill(`${"b".repeat(500)}discarded-tail`);
      await expect(context).toHaveValue("b".repeat(500));
      await expect(
        page.getByText(ko ? "500/500자" : "500/500 characters", {
          exact: true,
        }),
      ).toBeVisible();
      await openPromptContent(page);
      const prompt = page.getByLabel(
        ko ? "AI에 붙여 넣을 질문" : "Generated prompt",
      );
      await expect(prompt).toContainText("b".repeat(500));
      await expect(prompt).not.toContainText("discarded-tail");
      await page
        .getByRole("button", {
          name: ko ? "질문 복사하기" : "Copy prompt",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("button", {
          name: ko ? "복사했어요" : "Copied",
          exact: true,
        }),
      ).toBeVisible();
      expect(page.url()).toBe(resultUrl);
      expect(page.url()).not.toContain("context");
      expect(page.url()).not.toContain("b".repeat(500));

      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByTestId(/^reading-card-\d+$/)).toHaveCount(3);
      expect(
        await page
          .locator("[data-card-id]")
          .evaluateAll((cards) =>
            cards.map((card) => card.getAttribute("data-card-id")),
          ),
      ).toEqual(cardIds);
      await page
        .getByTestId("current-prompt-customization")
        .locator("summary")
        .click();
      await expect(context).toHaveValue("");
    }
    expect(pageErrors).toEqual([]);
  });
}

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
    copyAction: "지금 바로 해석하기",
    drawAction: "카드 6장 뽑기",
    localePath: "/ko",
    spread: "deep",
  },
] as const) {
  test(`keeps the ${readingCase.spread} overview and primary action in the first mobile result viewport`, async ({
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
          "[data-analytics-result-view-target]",
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
    await nextReadingAction.scrollIntoViewIfNeeded();
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
        ko ? /다른 AI에 복사할 상황/ : /Add context for another AI/,
      );
      const copyBox = await copyAction.boundingBox();
      const editBox = await currentEdit.boundingBox();
      const nextBox = await nextAction.boundingBox();
      expect(copyBox!.y + copyBox!.height).toBeLessThanOrEqual(editBox!.y);
      expect(editBox!.y + editBox!.height).toBeLessThanOrEqual(nextBox!.y);
      await currentEdit.locator("summary").click();
      const customizationGuidance = currentEdit.getByText(
        ko
          ? "따로 적은 상황은 복사할 질문에만 담겨요."
          : "Context is included only in the prompt you copy.",
        { exact: false },
      );
      await expect(customizationGuidance).toBeVisible();
      await expect(customizationGuidance).toContainText(
        ko
          ? "수정한 내용을 쓰려면 질문을 다시 복사해 주세요."
          : "Copy the prompt again after editing.",
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

      await expect(page.getByTestId("situation-context")).toHaveCount(0);
      await expect(page.getByTestId("retained-copy-context")).toBeVisible();
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
      await expect(page.getByTestId("prompt-ready")).toContainText(
        ko
          ? "Your situation is included in the prompt."
          : "작성한 상황도 질문에 담았어요.",
      );
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
      name: "카드를 뽑아보세요.",
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
      heading: "Draw your cards.",
      intro: /copy your card prompt and ask your AI/i,
      path: "/",
    },
    {
      draw: "카드 3장 뽑기",
      heading: "카드를 뽑아보세요.",
      intro: /카드를 뽑고, 궁금한 이야기의 AI 해석을 여기서 읽어보세요/,
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
      await page
        .getByRole("button", {
          name: path === "/ko" ? "카드 3장 뽑기" : "Draw 3 cards",
        })
        .click();
      await openCopyContext(page);
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
      await page.getByTestId("next-reading-action").click();
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
  await page.getByRole("link", { name: "서로의 인상 읽기" }).click();

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

  await page.getByRole("button", { name: "카드 3장 뽑기" }).click();
  await openCopyContext(page);
  await page
    .getByRole("textbox", { name: /상황이나 궁금한 점/ })
    .fill("이 내용은 다음 질문을 고르는 동안에도 유지되어야 해요.");

  await expect(page.getByTestId("current-public-question")).toContainText(
    "우리는 서로를 어떻게 보고 있을까?",
  );
  await expect(page.getByTestId("current-question-frame")).toHaveText(
    "서로가 상대에게 어떤 사람으로 비치는지 읽습니다.",
  );
  await expect(page.getByTestId("current-question-frame")).not.toContainText(
    "호감",
  );
  await page
    .getByTestId("prompt-content-disclosure")
    .locator("summary")
    .click();
  await expect(page.getByLabel("AI에 붙여 넣을 질문")).toHaveValue(
    /고른 질문: 우리는 서로를 어떻게 보고 있을까\?/,
  );
  await expect(page.getByLabel("AI에 붙여 넣을 질문")).toHaveValue(
    /해요체로 질문부터 답하세요/,
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
  ).toHaveCount(0);
  await expect(page.getByTestId("retained-copy-context")).toBeVisible();
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
    /고른 질문: 우리 속도는 서로에게 맞을까\?/,
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
    "Read what kind of person each of you sees in the other.",
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
    /고른 질문: 나는 연애 상대로 어떤 인상일까\?/,
  );
  await expect(page.getByLabel("AI에 붙여 넣을 질문")).toHaveValue(
    /묻지 않은 미래·연애·조언·숙제·요약은 붙이지 마세요/,
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
    /주제의 세부 초점: 일을 향한 마음이/,
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
    /고른 질문: 내가 놓치고 있는 강점은\?/,
  );
  await expect(page.getByLabel("AI에 붙여 넣을 질문")).not.toHaveValue(
    /주제의 세부 초점: 일을 향한 마음이/,
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
    "복사할 질문은 AI에 카드 뜻을 연결해 궁금한 점부터 답하고, 한 편의 짧은 이야기처럼 읽어 달라고 요청해요.",
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
  await page.getByRole("button", { name: "Draw 3 cards" }).click();
  await openCopyContext(page);
  await page
    .getByRole("textbox", { name: /Your situation or question/ })
    .fill("My manager relationship is difficult.");
  const activeLocaleUrl = page.url();
  await page.getByRole("link", { name: "English", exact: true }).click();
  await expect(page).toHaveURL(activeLocaleUrl);
  await expect(
    page.getByRole("textbox", { name: /Your situation or question/ }),
  ).toHaveValue("My manager relationship is difficult.");
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
      name: "카드를 뽑아보세요.",
    }),
  ).toBeVisible();
  await page.getByText("다른 AI에 복사할 상황").click();
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

  await page.getByRole("button", { name: "Draw 6 cards" }).click();
  await openCopyContext(page);
  await page
    .getByRole("textbox", { name: /Your situation or question/ })
    .fill(
      "My manager relationship is exhausting. Should I stay at this company?",
    );
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

  await page.getByRole("button", { name: "카드 3장 뽑기" }).click();
  await openCopyContext(page);
  await page
    .getByRole("textbox", { name: /상황이나 궁금한 점/ })
    .fill("서버로 보내면 안 되는 민감한 개인 상황");
  await page.getByRole("button", { name: "지금 바로 해석하기" }).click();

  await expect(page.getByTestId("instant-reading-result")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "AI 카드 흐름 해석" }),
  ).toBeFocused();
  await expect(page.getByTestId("instant-reading-result")).toContainText(
    "다가가고 싶은 마음, 지키고 싶은 선",
  );
  await expect(page.getByTestId("instant-reading-result")).not.toContainText(
    "멈추거나 다시 볼 조건:",
  );
  await expect(
    page.getByText("AI가 카드의 상징을 읽어 전하는 이야기입니다."),
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

for (const width of [390, 1280]) {
  test(`reads the primary interpretation comfortably at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    let requests = 0;
    let lastRequest: Record<string, unknown> = {};
    await page.route("**/api/reading", async (route) => {
      requests++;
      lastRequest = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          text: createValidInstantReading(width === 390 ? 3 : 6),
        }),
      });
    });
    await page.goto("/ko");
    await expect(
      page.getByTestId("instant-reading-availability"),
    ).toBeVisible();
    await expect(page.getByTestId("situation-context")).toHaveCount(0);
    if (width === 1280)
      await page.getByRole("radio", { name: "심화 6장", exact: true }).check();
    await page
      .getByRole("button", {
        name: width === 390 ? "카드 3장 뽑기" : "카드 6장 뽑기",
      })
      .click();
    const primary = page.getByRole("button", { name: "지금 바로 해석하기" });
    await expect(primary).toBeInViewport();
    await expect(primary).toHaveClass(/ts-primary-action/);
    await expect(
      page.getByRole("button", { name: "질문 복사하기" }),
    ).toHaveClass(/ts-secondary-action/);
    await primary.click();
    const heading = page.getByRole("heading", {
      name: "AI 카드 흐름 해석",
      exact: true,
    });
    await expect(heading).toBeFocused();
    await expect(heading).toHaveCount(1);
    const body = page.getByTestId("instant-reading-result").locator("div");
    await expect(body).toHaveCSS("font-size", width === 390 ? "16px" : "18px");
    expect(
      await body.evaluate((el) => el.getBoundingClientRect().width),
    ).toBeLessThanOrEqual(640);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await test.info().attach(`instant-reading-${width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
    const originalCards = await page
      .locator("[data-card-id]")
      .evaluateAll((elements) =>
        elements.map((el) => el.getAttribute("data-card-id")),
      );
    const originalText = await body.innerText();
    await openCopyContext(page);
    await page
      .getByRole("textbox", { name: /상황이나 궁금한 점/ })
      .fill("이 상황은 복사할 질문에만 담겨야 해요.");
    await expect(body).toHaveText(originalText);
    expect(requests).toBe(1);
    await page.getByTestId("current-reading-style").locator("summary").click();
    await page
      .getByRole("radio", { name: "솔직하고 분명하게", exact: true })
      .check();
    await expect(page.getByTestId("instant-reading-result")).toHaveCount(0);
    expect(
      await page
        .locator("[data-card-id]")
        .evaluateAll((elements) =>
          elements.map((el) => el.getAttribute("data-card-id")),
        ),
    ).toEqual(originalCards);
    expect(new URL(page.url()).searchParams.get("drawStyle")).toBe("balanced");
    await page.getByRole("button", { name: "지금 바로 해석하기" }).click();
    await expect(heading).toBeFocused();
    expect(lastRequest["styleId"]).toBe("direct");
    expect(JSON.stringify(lastRequest)).not.toContain("복사할 질문에만");
    await page.getByTestId("next-reading-action").click();
    await page
      .getByRole("button", { name: "이전 카드 결과로 돌아가기" })
      .click();
    await expect(page.getByTestId("instant-reading-result")).toBeVisible();
    expect(requests).toBe(2);
  });

  test(`recovers a failed interpretation without another API call at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            sessionStorage.setItem("synthetic-copied-prompt", text);
          },
        },
      });
    });
    let requests = 0;
    await page.route("**/api/reading", async (route) => {
      requests++;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ code: "unavailable" }),
      });
    });
    await page.goto("/ko");
    await page.getByRole("button", { name: "카드 3장 뽑기" }).click();
    await page.getByRole("button", { name: "지금 바로 해석하기" }).click();
    await expect(
      page.getByRole("button", { name: "다시 시도하기" }),
    ).toBeFocused();
    await page.getByRole("button", { name: "질문 복사해서 계속하기" }).click();
    await expect(
      page.getByRole("button", { name: "질문을 복사했어요", exact: true }),
    ).toBeVisible();
    await openPromptContent(page);
    expect(
      await page.evaluate(() =>
        sessionStorage.getItem("synthetic-copied-prompt"),
      ),
    ).toBe(await page.getByLabel("AI에 붙여 넣을 질문").inputValue());
    expect(requests).toBe(1);
  });
}

test("cancels visible loading and retries an error into a successful reading", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let requests = 0;
  await page.route("**/api/reading", async (route) => {
    requests++;
    // Leave the first intercepted request pending until the UI cancels it.
    if (requests === 1) return;
    await route.fulfill({
      status: requests === 2 ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        requests === 2
          ? { code: "unavailable" }
          : { text: createValidInstantReading(3) },
      ),
    });
  });
  await page.goto("/ko");
  await page.getByRole("button", { name: "카드 3장 뽑기" }).click();
  await page.getByRole("button", { name: "지금 바로 해석하기" }).click();
  await expect(
    page.getByText("카드의 흐름을 정리하고 있어요…", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "해석 취소하기" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "해석 취소하기" }).click();
  await expect(
    page.getByRole("button", { name: "지금 바로 해석하기" }),
  ).toBeFocused();
  await expect(page.getByTestId("instant-reading-result")).toHaveCount(0);
  await page.getByRole("button", { name: "지금 바로 해석하기" }).click();
  await expect(
    page.getByRole("button", { name: "다시 시도하기" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "다시 시도하기" }).click();
  await expect(
    page.getByRole("heading", { name: "AI 카드 흐름 해석", exact: true }),
  ).toBeFocused();
  expect(requests).toBe(3);
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

async function openCopyContext(page: Page) {
  const disclosure = page.getByTestId("current-prompt-customization");
  if (!(await disclosure.getAttribute("open"))) {
    // An open details attribute is the empty string; use the DOM property.
    if (
      !(await disclosure.evaluate(
        (element) => (element as HTMLDetailsElement).open,
      ))
    )
      await disclosure.locator("summary").click();
  }
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

function createValidInstantReading(_cardCount: number) {
  return `다가가고 싶은 마음, 지키고 싶은 선

당신에게는 설렘과 조심스러움이 함께 있어요. 새로운 만남을 향해 한 걸음 내딛고 싶지만, 좋아하는 마음만으로 자신의 속도를 놓치고 싶지는 않아요.

가볍게 시작하는 용기에 자신을 표현하는 힘이 더해져요. 여기에 상처를 경계하는 마음도 나란히 놓여 있어서, 모든 것을 한꺼번에 보여주기보다 편안한 만큼 가까워지는 쪽이 잘 어울립니다. 잘 보이려고 괜찮지 않은 것까지 괜찮다고 넘길 필요는 없어요.

지금은 큰 약속보다 서로 부담 없이 대화를 이어갈 수 있는지를 느껴보세요. 작은 표현에도 자신답게 웃을 수 있는 만남을 바라고 있어요.`;
}
