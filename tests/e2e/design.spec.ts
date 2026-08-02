import { expect, test, type Locator, type Page } from "@playwright/test";
import { rejectOptionalServices } from "./privacy-helpers";

const colors = {
  action: "rgb(112, 65, 88)",
  actionPressed: "rgb(79, 41, 63)",
  blush: "rgb(233, 210, 221)",
  blushStrong: "rgb(223, 194, 208)",
  border: "rgb(139, 115, 127)",
  canvas: "rgb(251, 247, 242)",
  divider: "rgb(217, 204, 210)",
  ink: "rgb(58, 38, 51)",
  surface: "rgb(255, 253, 252)",
} as const;

const previousCardPreviewArea = 80 * 112;

type RectGeometry = {
  readonly bottom: number;
  readonly height: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly width: number;
};

async function serveCardArtFixture(page: Page, delayMs = 0) {
  await page.route("**/_next/image**", async (route) => {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    await route.fulfill({
      contentType: "image/jpeg",
      path: "public/cards/the-fool.jpg",
      status: 200,
    });
  });
}

async function expectPreparedCardBacks(page: Page) {
  const cards = page.locator('[data-testid^="reading-card-"]');
  const cardBacks = cards.locator("[data-card-back]");

  await expect(cards).toHaveCount(3);
  await expect(cardBacks).toHaveCount(3);
  await expect(cards.locator("[data-glyph-id]")).toHaveCount(0);
  await expect(cards.locator("[data-art-id]")).toHaveCount(0);
  await expect(cards.locator("img")).toHaveCount(0);

  const cardBackIdentity = await cardBacks.evaluateAll((elements) =>
    elements.map((element) => ({
      markup: element.innerHTML,
      pattern: element.getAttribute("data-card-back-pattern"),
    })),
  );

  expect(new Set(cardBackIdentity.map(({ markup }) => markup)).size).toBe(1);
  expect(new Set(cardBackIdentity.map(({ pattern }) => pattern))).toEqual(
    new Set(["quiet-celestial-medallion"]),
  );
  await expectCardArtFrameBorders(cards);

  return expectCardSpreadLayout(page, 3);
}

async function expectCardSpreadLayout(page: Page, expectedCardCount: number) {
  const cards = page.locator('[data-testid^="reading-card-"]');
  await expect(cards).toHaveCount(expectedCardCount);
  await cards.evaluateAll(async (elements) => {
    await Promise.all(
      elements.flatMap((element) =>
        element
          .getAnimations()
          .map((animation) => animation.finished.catch(() => undefined)),
      ),
    );
  });

  const layout = await cards.evaluateAll((elements) => {
    const getRect = (element: Element) => {
      const rect = element.getBoundingClientRect();

      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      };
    };

    return elements.map((card) => {
      const frame = card.querySelector("[data-card-art-frame]");
      const heading = card.querySelector("h2");
      const position = card.firstElementChild?.querySelector("span");
      const tone = card.querySelector("p");

      if (!frame || !heading || !position || !tone) {
        throw new Error("Card spread layout elements are missing");
      }

      const frameRect = getRect(frame);
      const frameStyle = getComputedStyle(frame);
      const frameContentWidth =
        frameRect.width -
        Number.parseFloat(frameStyle.borderLeftWidth) -
        Number.parseFloat(frameStyle.borderRightWidth);
      const frameContentHeight =
        frameRect.height -
        Number.parseFloat(frameStyle.borderTopWidth) -
        Number.parseFloat(frameStyle.borderBottomWidth);

      return {
        card: getRect(card),
        frame: frameRect,
        frameContentRatio: frameContentWidth / frameContentHeight,
        heading: getRect(heading),
        position: getRect(position),
        tone: getRect(tone),
      };
    });
  });
  const viewportWidth = page.viewportSize()?.width;
  expect(viewportWidth).toBeDefined();
  const minimumAreaGain = (viewportWidth ?? 0) < 640 ? 1.4 : 1.2;

  for (const [index, geometry] of layout.entries()) {
    expectContained(geometry.card, geometry.frame, `card ${index} frame`);
    expectContained(geometry.card, geometry.position, `card ${index} position`);
    expectContained(geometry.card, geometry.heading, `card ${index} heading`);
    expectContained(geometry.card, geometry.tone, `card ${index} tone`);
    expect(geometry.frameContentRatio).toBeCloseTo(5 / 7, 2);
    expect(geometry.frame.width * geometry.frame.height).toBeGreaterThanOrEqual(
      previousCardPreviewArea * minimumAreaGain - 1,
    );
    expect(
      rectanglesOverlap(geometry.frame, geometry.position),
      `card ${index} frame and position overlap`,
    ).toBe(false);
    expect(
      rectanglesOverlap(geometry.frame, geometry.heading),
      `card ${index} frame and heading overlap`,
    ).toBe(false);
    expect(
      rectanglesOverlap(geometry.frame, geometry.tone),
      `card ${index} frame and tone overlap`,
    ).toBe(false);
  }

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

  return layout.map(({ frame }) => frame);
}

function expectContained(
  container: RectGeometry,
  content: RectGeometry,
  label: string,
) {
  const tolerance = 1;

  expect(content.width, label).toBeGreaterThan(0);
  expect(content.height, label).toBeGreaterThan(0);
  expect(content.left, label).toBeGreaterThanOrEqual(
    container.left - tolerance,
  );
  expect(content.right, label).toBeLessThanOrEqual(container.right + tolerance);
  expect(content.top, label).toBeGreaterThanOrEqual(container.top - tolerance);
  expect(content.bottom, label).toBeLessThanOrEqual(
    container.bottom + tolerance,
  );
}

function rectanglesOverlap(first: RectGeometry, second: RectGeometry) {
  const tolerance = 0.5;

  return (
    first.left < second.right - tolerance &&
    first.right > second.left + tolerance &&
    first.top < second.bottom - tolerance &&
    first.bottom > second.top + tolerance
  );
}

function expectMatchingFrames(
  before: readonly RectGeometry[],
  after: readonly RectGeometry[],
) {
  expect(after).toHaveLength(before.length);

  before.forEach((frame, index) => {
    expect(after[index]?.width).toBeCloseTo(frame.width, 1);
    expect(after[index]?.height).toBeCloseTo(frame.height, 1);
  });
}

async function expectCardArtFrameBorders(cards: Locator) {
  const frameBorders = cards.locator("[data-card-art-frame-border]");

  await expect(frameBorders).toHaveCount(3);
  const borderStyles = await frameBorders.evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);

      return {
        boxShadow: style.boxShadow,
        pointerEvents: style.pointerEvents,
        zIndex: style.zIndex,
      };
    }),
  );

  borderStyles.forEach(({ boxShadow, pointerEvents, zIndex }) => {
    expect(boxShadow).toContain(colors.divider);
    expect(boxShadow).toContain("inset");
    expect(pointerEvents).toBe("none");
    expect(zIndex).toBe("10");
  });
}

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
  const copyPromptButton = page.getByRole("button", {
    name: "Copy selected prompt",
  });
  await tabTo(page, copyPromptButton);
  await assertFocusOutline(copyPromptButton, page);
});

test("removes decorative motion when reduced motion is requested", async ({
  page,
}) => {
  await serveCardArtFixture(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const duration = await page
    .getByRole("button", { name: "Reunion 3 cards" })
    .evaluate((element) => getComputedStyle(element).transitionDuration);

  expect(maximumCssSeconds(duration)).toBeLessThanOrEqual(0.001);

  await page.getByRole("button", { name: "Draw cards" }).click();

  const card = page.getByTestId("reading-card-0");
  const art = card.locator("[data-art-id]");
  const plane = card.locator("[data-card-plane]");
  await expect(art).toHaveAttribute("data-art-ready", "true", {
    timeout: 10_000,
  });
  const cardAnimation = await getAnimationTiming(card);
  const planeAnimation = await getAnimationTiming(plane);

  expect(maximumCssSeconds(cardAnimation.duration)).toBeLessThanOrEqual(0.001);
  expect(maximumCssSeconds(planeAnimation.duration)).toBeLessThanOrEqual(0.001);
  expect(maximumCssSeconds(cardAnimation.delay)).toBe(0);
  expect(maximumCssSeconds(planeAnimation.delay)).toBe(0);
  await expect(card.locator("[data-card-visual-state]")).toHaveAttribute(
    "data-card-visual-state",
    "front",
  );
});

test("stages only a user-initiated card reveal with locked timing", async ({
  page,
}) => {
  await serveCardArtFixture(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Draw cards" }).click();

  const firstCard = page.getByTestId("reading-card-0");
  const secondCard = page.getByTestId("reading-card-1");
  const firstArt = firstCard.locator("[data-art-id]");
  const secondArt = secondCard.locator("[data-art-id]");
  const firstPlane = firstCard.locator("[data-card-plane]");
  const secondPlane = secondCard.locator("[data-card-plane]");

  await expect(firstCard).toHaveAttribute("data-reveal-sequence", "1");
  await expect(firstCard).toHaveCSS("animation-duration", "0.52s");
  await expect(firstCard).toHaveCSS("animation-delay", "0s");
  await expect(secondCard).toHaveCSS("animation-delay", "0.08s");
  await expect(firstCard).toHaveCSS("--ts-card-tilt", "-1.15deg");
  await expect(secondCard).toHaveCSS("--ts-card-tilt", "1.15deg");
  await expect(firstArt).toHaveAttribute("data-art-ready", "true", {
    timeout: 10_000,
  });
  await expect(secondArt).toHaveAttribute("data-art-ready", "true", {
    timeout: 10_000,
  });
  await expect(firstPlane).toHaveClass(/ts-card-plane-flip/);
  await firstPlane.evaluate((element) => {
    element.getAnimations().forEach((animation) => animation.pause());
  });
  await secondPlane.evaluate((element) => {
    element.getAnimations().forEach((animation) => animation.pause());
  });
  await expect(firstPlane).toHaveCSS("animation-duration", "0.48s");
  await expect(firstPlane).toHaveCSS("animation-delay", "0.12s");
  await expect(secondPlane).toHaveCSS("animation-delay", "0.2s");
  await expect(firstPlane).toHaveCSS("animation-name", "ts-card-plane-flip");
  await expect(firstCard.locator('[data-card-face="back"]')).toHaveCSS(
    "backface-visibility",
    "hidden",
  );
  await expect(firstCard.locator('[data-card-face="front"]')).toHaveCSS(
    "backface-visibility",
    "hidden",
  );
  const flipKeyframes = await firstPlane.evaluate((element) => {
    const [animation] = element.getAnimations();
    const effect = animation?.effect as KeyframeEffect | null;

    return effect?.getKeyframes().map(({ transform }) => transform) ?? [];
  });
  expect(flipKeyframes).toEqual(["rotateY(0deg)", "rotateY(180deg)"]);

  await page.getByRole("button", { name: "Draw cards" }).click();
  await expect(page.getByTestId("reading-card-0")).toHaveAttribute(
    "data-reveal-sequence",
    "2",
  );

  await page.goto(
    "/?topic=relationship-flow&style=relational&cards=the-fool,the-lovers,the-star",
  );
  await expect(page.getByTestId("reading-card-0")).not.toHaveClass(
    /ts-card-arrive/,
  );
  await expect(page.getByTestId("reading-card-0")).not.toHaveAttribute(
    "data-reveal-sequence",
  );
  const restoredArt = page
    .getByTestId("reading-card-0")
    .locator("[data-art-id]");
  await expect(restoredArt).toHaveAttribute("data-art-ready", "true");
  const restoredPlane = page
    .getByTestId("reading-card-0")
    .locator("[data-card-plane]");
  await expect(restoredPlane).toHaveCSS("animation-name", "none");
  await expect(restoredPlane).toHaveCSS(
    "transform",
    "matrix3d(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1)",
  );
});

test("keeps the card back visible until delayed card art can reveal", async ({
  page,
}) => {
  await serveCardArtFixture(page, 1_200);
  await page.goto("/");
  await page.getByRole("button", { name: "Draw cards" }).click();

  const firstCard = page.getByTestId("reading-card-0");
  const image = firstCard.locator("[data-art-id]");
  const plane = firstCard.locator("[data-card-plane]");

  await firstCard.evaluate(async (element) => {
    const arrivalAnimations = element.getAnimations().filter((animation) => {
      const effect = animation.effect as KeyframeEffect | null;

      return (
        animation instanceof CSSAnimation &&
        animation.animationName === "ts-card-arrive" &&
        effect?.target === element
      );
    });
    const [arrivalAnimation] = arrivalAnimations;

    if (!arrivalAnimation || arrivalAnimations.length !== 1) {
      throw new Error(
        `Expected exactly one card arrival animation, found ${arrivalAnimations.length}`,
      );
    }

    await arrivalAnimation.finished;
  });
  await expect(firstCard.locator("[data-card-back]")).toBeVisible();
  await expect(firstCard.locator("[data-glyph-id]")).toHaveCount(0);
  await expect(firstCard.locator("[data-card-visual-state]")).toHaveAttribute(
    "data-card-visual-state",
    "pending",
  );
  await expect(image).toHaveAttribute("data-art-ready", "false");
  await expect(image).toHaveCSS("opacity", "0");
  await expect(plane).toHaveCSS("animation-name", "none");

  await expect(image).toHaveAttribute("data-art-ready", "true", {
    timeout: 10_000,
  });
  await expect(plane).toHaveClass(/ts-card-plane-flip/);
  await expect(plane).toHaveCSS("animation-name", "ts-card-plane-flip");
  await expectCardArtFrameBorders(
    page.locator('[data-testid^="reading-card-"]'),
  );
});

for (const width of [320, 360, 390] as const) {
  test(`keeps the complete Korean reading flow inside ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 844, width });
    await page.goto("/ko");
    const preparedFrames = await expectPreparedCardBacks(page);
    await page.getByRole("button", { name: "카드 뽑기" }).click();
    const drawnFrames = await expectCardSpreadLayout(page, 3);
    expectMatchingFrames(preparedFrames, drawnFrames);

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

test("keeps restored and shared card spreads readable across breakpoints", async ({
  page,
}) => {
  const cases = [
    {
      cardCount: 3,
      path: "/?topic=relationship-flow&style=relational&cards=the-fool,the-lovers,the-star",
      width: 639,
    },
    {
      cardCount: 6,
      path: "/ko?topic=love&spread=deep&cards=the-fool,the-magician,the-high-priestess,the-empress,the-emperor,the-lovers",
      width: 640,
    },
    {
      cardCount: 3,
      path: "/share?topic=relationship-flow&style=relational&cards=the-fool,the-lovers,the-star",
      shared: true,
      width: 1024,
    },
  ] as const;

  for (const currentCase of cases) {
    await page.setViewportSize({ height: 844, width: currentCase.width });
    await page.goto(currentCase.path);
    await expectCardSpreadLayout(page, currentCase.cardCount);

    if ("shared" in currentCase) {
      const resultContent = page.getByTestId("shared-reading-result-content");
      await expect(resultContent).toBeVisible();
      const resultTop = await resultContent.evaluate(
        (element) => element.getBoundingClientRect().top,
      );
      const cardBottoms = await page
        .locator('[data-testid^="reading-card-"]')
        .evaluateAll((elements) =>
          elements.map((element) => element.getBoundingClientRect().bottom),
        );
      expect(resultTop).toBeGreaterThanOrEqual(Math.max(...cardBottoms) - 1);
    }
  }
});

test("keeps the quick reading result start in view after a pointer draw", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Draw cards" }).click();

  const result = page.getByTestId("reading-result-observer");
  await expect(result).toBeVisible();
  await expect
    .poll(async () =>
      result.evaluate((element) => {
        const rect = element.getBoundingClientRect();

        return rect.top >= 0 && rect.top < innerHeight;
      }),
    )
    .toBe(true);
});

test("keeps a failed-art glyph centered inside the enlarged frame", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 320 });
  await page.route("**/_next/image**", async (route) => {
    const optimizedUrl = new URL(route.request().url()).searchParams.get("url");

    if (optimizedUrl === "/cards/the-fool.jpg") {
      await route.fulfill({
        body: "failed card art",
        contentType: "text/plain",
        status: 500,
      });
      return;
    }

    await route.fulfill({
      contentType: "image/jpeg",
      path: "public/cards/the-fool.jpg",
      status: 200,
    });
  });
  await page.goto(
    "/?topic=love&cards=the-fool,the-magician,the-high-priestess",
  );

  const firstCard = page.getByTestId("reading-card-0");
  const glyph = firstCard.locator('[data-glyph-id="the-fool"]');
  await expect(glyph).toBeVisible({ timeout: 10_000 });
  await expectCardSpreadLayout(page, 3);

  const geometry = await firstCard.evaluate((card) => {
    const frame = card.querySelector("[data-card-art-frame]");
    const currentGlyph = card.querySelector('[data-glyph-id="the-fool"]');

    if (!frame || !currentGlyph) {
      throw new Error("Fallback frame or glyph is missing");
    }

    const frameRect = frame.getBoundingClientRect();
    const glyphRect = currentGlyph.getBoundingClientRect();

    return {
      frame: {
        bottom: frameRect.bottom,
        height: frameRect.height,
        left: frameRect.left,
        right: frameRect.right,
        top: frameRect.top,
        width: frameRect.width,
      },
      glyph: {
        bottom: glyphRect.bottom,
        height: glyphRect.height,
        left: glyphRect.left,
        right: glyphRect.right,
        top: glyphRect.top,
        width: glyphRect.width,
      },
    };
  });

  expectContained(geometry.frame, geometry.glyph, "fallback glyph");
  expect(
    Math.abs(
      geometry.frame.left +
        geometry.frame.width / 2 -
        (geometry.glyph.left + geometry.glyph.width / 2),
    ),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(
      geometry.frame.top +
        geometry.frame.height / 2 -
        (geometry.glyph.top + geometry.glyph.height / 2),
    ),
  ).toBeLessThanOrEqual(1);
});

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

test("maps every restored preview card to approved art", async ({ page }) => {
  test.setTimeout(60_000);

  const cardBatches = [
    [
      ["the-fool", "The Fool"],
      ["the-magician", "The Magician"],
      ["the-high-priestess", "The High Priestess"],
      ["the-empress", "The Empress"],
      ["the-emperor", "The Emperor"],
      ["the-lovers", "The Lovers"],
    ],
    [
      ["the-chariot", "The Chariot"],
      ["strength", "Strength"],
      ["the-hermit", "The Hermit"],
      ["wheel-of-fortune", "Wheel of Fortune"],
      ["temperance", "Temperance"],
      ["the-star", "The Star"],
    ],
  ] as const;

  for (const batch of cardBatches) {
    await page.goto(
      `/?topic=love&spread=deep&cards=${batch
        .map(([cardId]) => cardId)
        .join(",")}`,
    );

    for (const [cardId, cardName] of batch) {
      const card = page.locator(`[data-card-id="${cardId}"]`);
      const art = card.locator(`[data-art-id="${cardId}"]`);

      await card.scrollIntoViewIfNeeded();
      await expect(card.getByRole("heading", { name: cardName })).toBeVisible();
      try {
        await expect(art).toHaveAttribute("data-art-ready", "true", {
          timeout: 10_000,
        });
      } catch (error) {
        const imageState = await page
          .evaluate((currentCardId) => {
            const image = document.querySelector<HTMLImageElement>(
              `[data-art-id="${currentCardId}"]`,
            );

            return {
              collectionError: null,
              complete: image?.complete ?? null,
              currentSrc: image?.currentSrc ?? null,
              dataArtReady: image?.getAttribute("data-art-ready") ?? null,
              naturalWidth: image?.naturalWidth ?? null,
            };
          }, cardId)
          .catch((collectionError: unknown) => ({
            collectionError:
              collectionError instanceof Error
                ? collectionError.message
                : String(collectionError),
            complete: null,
            currentSrc: null,
            dataArtReady: null,
            naturalWidth: null,
          }));

        if (error instanceof Error) {
          error.message = `Card art state at readiness timeout: ${JSON.stringify(imageState)}\n\n${error.message}`;
        }

        throw error;
      }

      const decodedImage = await art.evaluate((element) => {
        const image = element as HTMLImageElement;

        return {
          complete: image.complete,
          naturalWidth: image.naturalWidth,
        };
      });

      expect(decodedImage.complete).toBe(true);
      expect(decodedImage.naturalWidth).toBeGreaterThan(0);
    }
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
  expect(dailyCardId).not.toBeNull();
  await expect(
    dailyCard.locator(`[data-art-id="${dailyCardId}"]`),
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

async function getAnimationTiming(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);

    return {
      delay: style.animationDelay,
      duration: style.animationDuration,
    };
  });
}

function maximumCssSeconds(value: string) {
  return value
    .split(",")
    .map((part) => {
      const normalizedPart = part.trim();
      const numericValue = Number.parseFloat(normalizedPart);

      return normalizedPart.endsWith("ms")
        ? numericValue / 1_000
        : numericValue;
    })
    .reduce((maximum, current) => Math.max(maximum, current), 0);
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
