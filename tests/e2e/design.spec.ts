import { expect, test, type Locator, type Page } from "@playwright/test";
import { rejectOptionalServices } from "./privacy-helpers";

const colors = {
  action: "rgb(112, 65, 88)",
  actionPressed: "rgb(79, 41, 63)",
  blush: "rgb(233, 210, 221)",
  blushStrong: "rgb(223, 194, 208)",
  border: "rgb(139, 115, 127)",
  canvas: "rgb(251, 247, 242)",
  ink: "rgb(58, 38, 51)",
  surface: "rgb(255, 253, 252)",
} as const;

test.beforeEach(async ({ context }) => {
  await rejectOptionalServices(context);
});

test("locks the semantic token values and primary visual roles", async ({
  page,
}) => {
  await page.goto("/");

  const tokens = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);

    return {
      action: style.getPropertyValue("--ts-color-action").trim(),
      blush: style.getPropertyValue("--ts-color-blush").trim(),
      border: style.getPropertyValue("--ts-color-border").trim(),
      canvas: style.getPropertyValue("--ts-color-canvas").trim(),
      ink: style.getPropertyValue("--ts-color-ink").trim(),
      panelRadius: style.getPropertyValue("--ts-radius-panel").trim(),
      surface: style.getPropertyValue("--ts-color-surface").trim(),
    };
  });

  expect(tokens).toEqual({
    action: "#704158",
    blush: "#e9d2dd",
    border: "#8b737f",
    canvas: "#fbf7f2",
    ink: "#3a2633",
    panelRadius: ".875rem",
    surface: "#fffdfc",
  });

  await expect(page.getByRole("main")).toHaveCSS(
    "background-color",
    colors.canvas,
  );
  await expect(page.getByRole("button", { name: "Draw cards" })).toHaveCSS(
    "background-color",
    colors.action,
  );
  await expect(page.getByRole("button", { name: "Love 3 cards" })).toHaveCSS(
    "background-color",
    colors.blush,
  );
  await expect(page.getByTestId("reading-workspace")).toHaveCSS(
    "background-color",
    colors.surface,
  );
  await expect(page.getByTestId("reading-workspace")).toHaveCSS(
    "border-radius",
    "14px",
  );
});

test("keeps active, hover, pressed, and keyboard-focus states explicit", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/");

  const englishLocale = page.getByRole("link", {
    exact: true,
    name: "English",
  });
  const loveTopic = page.getByRole("button", { name: "Love 3 cards" });
  const reunionTopic = page.getByRole("button", { name: "Reunion 3 cards" });
  const drawButton = page.getByRole("button", { name: "Draw cards" });

  const localeStyle = await englishLocale.evaluate((element) => {
    const style = getComputedStyle(element);

    return {
      boxShadow: style.boxShadow,
      fontWeight: style.fontWeight,
    };
  });
  expect(localeStyle.boxShadow).toContain(colors.action);
  expect(localeStyle.boxShadow).toContain("inset");
  expect(Number(localeStyle.fontWeight)).toBeGreaterThanOrEqual(700);
  await expect(englishLocale).toHaveAttribute("aria-current", "page");

  await englishLocale.hover();
  await expect
    .poll(() => computedStyle(englishLocale, "backgroundColor"))
    .toBe(colors.blushStrong);

  await page.mouse.down();
  try {
    await page.waitForTimeout(240);
    expect(await computedStyle(englishLocale, "color")).toBe(
      colors.actionPressed,
    );
    expect(await computedStyle(englishLocale, "boxShadow")).toContain(
      colors.actionPressed,
    );
  } finally {
    await page.mouse.up();
  }

  await loveTopic.hover();
  await expect
    .poll(() => computedStyle(loveTopic, "backgroundColor"))
    .toBe(colors.blushStrong);

  await page.mouse.down();
  try {
    await page.waitForTimeout(240);
    expect(await computedStyle(loveTopic, "borderColor")).toBe(
      colors.actionPressed,
    );
  } finally {
    await page.mouse.up();
  }

  await reunionTopic.hover();
  await expect
    .poll(() => computedStyle(reunionTopic, "backgroundColor"))
    .toBe(colors.blush);

  await page.mouse.down();
  try {
    await page.waitForTimeout(240);
    expect(await computedStyle(reunionTopic, "backgroundColor")).toBe(
      colors.blushStrong,
    );
    expect(await computedStyle(reunionTopic, "borderColor")).toBe(
      colors.actionPressed,
    );
  } finally {
    await page.mouse.up();
  }

  await reunionTopic.click();
  await expect(reunionTopic).toHaveAttribute("aria-pressed", "true");
  await expect(
    reunionTopic.locator('[data-selected-indicator="reunion"]'),
  ).toHaveCSS("opacity", "1");
  await expect(reunionTopic).toHaveCSS("border-color", colors.action);

  await page.goto("/");
  await page.keyboard.press("Tab");
  await assertFocusOutline(englishLocale, page);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await assertFocusOutline(loveTopic, page);
  await tabTo(page, drawButton);
  await assertFocusOutline(drawButton, page);

  await drawButton.click();
  const copyPromptButton = page.getByRole("button", { name: "Copy prompt" });
  await tabTo(page, copyPromptButton);
  await assertFocusOutline(copyPromptButton, page);
});

test("removes decorative motion when reduced motion is requested", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const duration = await page
    .getByRole("button", { name: "Reunion 3 cards" })
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  const durationSeconds = duration
    .split(",")
    .map((value) => Number.parseFloat(value))
    .reduce((maximum, value) => Math.max(maximum, value), 0);

  expect(durationSeconds).toBeLessThanOrEqual(0.001);
});

for (const width of [320, 360, 390] as const) {
  test(`keeps the complete Korean reading flow inside ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width });
    await page.goto("/ko");
    await page.getByRole("button", { name: "카드 뽑기" }).click();

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

    const interactiveTargets = page.locator(
      "main a:visible, main button:visible, main textarea:visible",
    );
    const count = await interactiveTargets.count();

    for (let index = 0; index < count; index += 1) {
      const box = await interactiveTargets.nth(index).boundingBox();
      expect(box, `interactive target ${index}`).not.toBeNull();
      expect(
        box?.height ?? 0,
        `interactive target ${index}`,
      ).toBeGreaterThanOrEqual(44);
      expect(
        box?.width ?? 0,
        `interactive target ${index}`,
      ).toBeGreaterThanOrEqual(44);
    }
  });
}

test("reserves the hydrated Daily panel height at mobile widths", async ({
  browser,
}) => {
  for (const width of [320, 390] as const) {
    const contextOptions = {
      baseURL: "http://127.0.0.1:3000",
      viewport: { height: 844, width },
    };
    const staticContext = await browser.newContext({
      ...contextOptions,
      javaScriptEnabled: false,
    });
    const hydratedContext = await browser.newContext(contextOptions);

    try {
      const staticPage = await staticContext.newPage();
      await staticPage.goto("/ko/daily");
      await expect(staticPage.getByTestId("daily-placeholder")).toBeVisible();
      const placeholderGeometry = await staticPage
        .getByTestId("daily-placeholder")
        .evaluate((element) => {
          const panel = element.parentElement;
          if (!panel) {
            throw new Error("Daily placeholder panel is missing");
          }
          const childBox = element.getBoundingClientRect();
          const panelBox = panel.getBoundingClientRect();
          return {
            bottomInset: panelBox.bottom - childBox.bottom,
            childHeight: childBox.height,
            panelHeight: panelBox.height,
            topInset: childBox.top - panelBox.top,
          };
        });

      const hydratedPage = await hydratedContext.newPage();
      await hydratedPage.goto("/ko/daily");
      await expect(hydratedPage.getByTestId("daily-card")).toBeVisible();
      const hydratedGeometry = await hydratedPage
        .getByTestId("daily-card")
        .evaluate((element) => {
          const panel = element.parentElement;
          if (!panel) {
            throw new Error("Hydrated Daily panel is missing");
          }
          const childBox = element.getBoundingClientRect();
          const panelBox = panel.getBoundingClientRect();
          return {
            bottomInset: panelBox.bottom - childBox.bottom,
            childHeight: childBox.height,
            panelHeight: panelBox.height,
            topInset: childBox.top - panelBox.top,
          };
        });

      for (const dimension of [
        "panelHeight",
        "childHeight",
        "topInset",
        "bottomInset",
      ] as const) {
        expect(
          Math.abs(
            placeholderGeometry[dimension] - hydratedGeometry[dimension],
          ),
          `${width}px Daily ${dimension} shift`,
        ).toBeLessThanOrEqual(1);
      }
    } finally {
      await staticContext.close();
      await hydratedContext.close();
    }
  }
});

test("maps restored cards to distinct typed glyphs", async ({ page }) => {
  await page.goto(
    "/?topic=love&cards=the-fool,the-magician,the-high-priestess",
  );

  const expectedCards = [
    ["the-fool", "The Fool"],
    ["the-magician", "The Magician"],
    ["the-high-priestess", "The High Priestess"],
  ] as const;

  for (const [cardId, cardName] of expectedCards) {
    const card = page.locator(`[data-card-id="${cardId}"]`);
    await expect(card.getByRole("heading", { name: cardName })).toBeVisible();
    await expect(card.locator(`[data-glyph-id="${cardId}"]`)).toBeVisible();
  }
});

test("uses the same paper system on Daily and public pages", async ({
  page,
}) => {
  await page.goto("/daily");
  const dailyCard = page.getByTestId("daily-card");
  await expect(dailyCard).toBeVisible();
  await expect(page.getByTestId("daily-question-block")).toHaveCSS(
    "background-color",
    colors.blush,
  );
  await expect(page.getByTestId("daily-question-block")).toHaveCSS(
    "border-radius",
    "16px",
  );
  const dailyCardId = await dailyCard.getAttribute("data-card-id");
  await expect(
    dailyCard.locator(`[data-glyph-id="${dailyCardId}"]`),
  ).toBeVisible();

  await page.goto("/privacy");
  await expect(page.getByRole("main")).toHaveCSS(
    "background-color",
    colors.canvas,
  );
  await expect(
    page.getByRole("article").filter({ hasText: "Privacy Policy" }),
  ).toHaveCSS("background-color", colors.surface);
});

async function computedStyle(
  locator: Locator,
  property: keyof CSSStyleDeclaration,
) {
  return locator.evaluate(
    (element, styleProperty) =>
      getComputedStyle(element)[styleProperty] as unknown as string,
    property,
  );
}

async function assertFocusOutline(locator: Locator, page: Page) {
  await expect(locator).toBeFocused();
  const style = await locator.evaluate((element) => {
    const computed = getComputedStyle(element);

    return {
      color: computed.outlineColor,
      offset: computed.outlineOffset,
      style: computed.outlineStyle,
      width: computed.outlineWidth,
    };
  });
  expect(style).toEqual({
    color: colors.action,
    offset: "2px",
    style: "solid",
    width: "2px",
  });

  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box?.x ?? 0).toBeGreaterThanOrEqual(2);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
    (viewport?.width ?? 0) - 2,
  );
}

async function tabTo(page: Page, target: Locator) {
  for (let index = 0; index < 20; index += 1) {
    await page.keyboard.press("Tab");

    if (
      await target.evaluate((element) => element === document.activeElement)
    ) {
      return;
    }
  }

  throw new Error("Keyboard focus did not reach the target within 20 tabs.");
}
