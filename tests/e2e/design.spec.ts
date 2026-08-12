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

type RectGeometry = {
  readonly bottom: number;
  readonly height: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly width: number;
};

async function getDocumentRect(locator: Locator): Promise<RectGeometry> {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();

    return {
      bottom: rect.bottom + scrollY,
      height: rect.height,
      left: rect.left,
      right: rect.right,
      top: rect.top + scrollY,
      width: rect.width,
    };
  });
}

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
      const [position, heading] = card.querySelectorAll(":scope > span");

      if (!frame || !heading || !position) {
        throw new Error("Card overview layout elements are missing");
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
      };
    });
  });

  for (const [index, geometry] of layout.entries()) {
    expectContained(geometry.card, geometry.frame, `card ${index} frame`);
    expectContained(geometry.card, geometry.position, `card ${index} position`);
    expectContained(geometry.card, geometry.heading, `card ${index} heading`);
    expect(geometry.frameContentRatio).toBeCloseTo(5 / 7, 2);
    expect(
      rectanglesOverlap(geometry.frame, geometry.position),
      `card ${index} frame and position overlap`,
    ).toBe(false);
    expect(
      rectanglesOverlap(geometry.frame, geometry.heading),
      `card ${index} frame and heading overlap`,
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

async function expectTopicSelectorLayout(
  topicOptions: Locator,
  contextLabel: string,
) {
  await expect(topicOptions, contextLabel).toBeVisible();

  const group = await topicOptions.evaluate((element) => {
    const rect = element.getBoundingClientRect();

    return {
      bottom: rect.bottom,
      height: rect.height,
      left: rect.left,
      right: rect.right,
      top: rect.top,
      width: rect.width,
    };
  });
  const options = await topicOptions
    .getByTestId("topic-option")
    .evaluateAll((labels) =>
      labels.map((label) => {
        const text = label.querySelector('[data-testid="topic-option-label"]');
        const indicator = label.querySelector("[data-selected-indicator]");

        if (!text || !indicator) {
          throw new Error("A tarot topic option is incomplete");
        }

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
        const textStyle = getComputedStyle(text);

        return {
          indicator: getRect(indicator),
          label: getRect(label),
          text: getRect(text),
          textClientWidth: text.clientWidth,
          textLineHeight: Number.parseFloat(textStyle.lineHeight),
          textScrollWidth: text.scrollWidth,
        };
      }),
    );

  expect(options, `${contextLabel} option count`).toHaveLength(5);
  const firstOption = options[0];

  if (!firstOption) {
    throw new Error("The tarot topic group is empty");
  }

  options.forEach((option, index) => {
    expect(
      Math.abs(option.label.width - firstOption.label.width),
      `${contextLabel} option ${index} width`,
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(option.label.height - firstOption.label.height),
      `${contextLabel} option ${index} height`,
    ).toBeLessThanOrEqual(1);
    expectContained(
      option.label,
      option.text,
      `${contextLabel} option ${index} text`,
    );
    expectContained(
      option.label,
      option.indicator,
      `${contextLabel} option ${index} indicator`,
    );
    expect(
      rectanglesOverlap(option.text, option.indicator),
      `${contextLabel} option ${index} text and indicator`,
    ).toBe(false);
    expect(
      option.textScrollWidth,
      `${contextLabel} option ${index} text overflow`,
    ).toBeLessThanOrEqual(option.textClientWidth + 1);
    expect(
      option.text.height,
      `${contextLabel} option ${index} text lines`,
    ).toBeLessThanOrEqual(option.textLineHeight * 2 + 0.5);
  });

  const expectedMode = group.width >= 640 ? "row" : "list";

  if (expectedMode === "list") {
    expect(
      group.height,
      `${contextLabel} compact group height`,
    ).toBeLessThanOrEqual(244);
    options.forEach((option, index) => {
      expect(
        option.label.height,
        `${contextLabel} option ${index} touch height`,
      ).toBeGreaterThanOrEqual(48);
      expect(
        Math.abs(option.label.left - firstOption.label.left),
        `${contextLabel} option ${index} left edge`,
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(option.label.right - firstOption.label.right),
        `${contextLabel} option ${index} right edge`,
      ).toBeLessThanOrEqual(1);

      if (index > 0) {
        expect(
          Math.abs(option.label.top - (options[index - 1]?.label.bottom ?? 0)),
          `${contextLabel} option ${index} row continuity`,
        ).toBeLessThanOrEqual(1);
      }
    });
  } else {
    expect(
      group.height,
      `${contextLabel} horizontal group height`,
    ).toBeLessThanOrEqual(72);
    options.forEach((option, index) => {
      expect(
        option.label.height,
        `${contextLabel} option ${index} touch height`,
      ).toBeGreaterThanOrEqual(48);
      expect(
        Math.abs(option.label.top - firstOption.label.top),
        `${contextLabel} option ${index} row alignment`,
      ).toBeLessThanOrEqual(1);

      if (index > 0) {
        expect(
          Math.abs(option.label.left - (options[index - 1]?.label.right ?? 0)),
          `${contextLabel} option ${index} column continuity`,
        ).toBeLessThanOrEqual(1);
      }
    });
  }

  expect(
    Math.abs(firstOption.label.left - (group.left + 1)),
    `${contextLabel} group left boundary`,
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs((options.at(-1)?.label.right ?? 0) - (group.right - 1)),
    `${contextLabel} group right boundary`,
  ).toBeLessThanOrEqual(1);

  return expectedMode;
}

async function getTopicSelectionGeometry(topicOptions: Locator) {
  return topicOptions.getByTestId("topic-option").evaluateAll((labels) =>
    labels.map((label) => {
      const text = label.querySelector('[data-testid="topic-option-label"]');

      if (!text) {
        throw new Error("A tarot topic label is missing");
      }

      const labelRect = label.getBoundingClientRect();
      const textRect = text.getBoundingClientRect();

      return {
        label: {
          height: labelRect.height,
          left: labelRect.left,
          top: labelRect.top,
          width: labelRect.width,
        },
        text: {
          height: textRect.height,
          left: textRect.left,
          top: textRect.top,
          width: textRect.width,
        },
      };
    }),
  );
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

test("keeps one canonical shell boundary across public page archetypes", async ({
  page,
}) => {
  const routes = [
    "/",
    "/daily",
    "/relationship-flow",
    "/relationship-tarot-questions",
    "/about",
  ] as const;

  for (const width of [390, 1280] as const) {
    await page.setViewportSize({ height: 844, width });
    let expectedBoundary:
      | {
          footerLeft: number;
          footerRight: number;
          headerLeft: number;
          headerRight: number;
        }
      | undefined;

    for (const route of routes) {
      await page.goto(route);

      const boundary = await page.evaluate(() => {
        const header = document.querySelector('[data-testid="site-header"]');
        const footer = document.querySelector('[data-testid="site-footer"]');

        if (!header || !footer) {
          throw new Error("Shared shell landmarks are missing");
        }

        const headerRect = header.getBoundingClientRect();
        const footerRect = footer.getBoundingClientRect();

        return {
          footerLeft: footerRect.left,
          footerRight: footerRect.right,
          headerLeft: headerRect.left,
          headerRight: headerRect.right,
          viewportWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });

      expect(
        boundary.scrollWidth,
        `${route} at ${width}px`,
      ).toBeLessThanOrEqual(boundary.viewportWidth);
      expect(boundary.headerLeft, route).toBe(boundary.footerLeft);
      expect(boundary.headerRight, route).toBe(boundary.footerRight);

      const comparableBoundary = {
        footerLeft: boundary.footerLeft,
        footerRight: boundary.footerRight,
        headerLeft: boundary.headerLeft,
        headerRight: boundary.headerRight,
      };
      expectedBoundary ??= comparableBoundary;
      expect(comparableBoundary, `${route} at ${width}px`).toEqual(
        expectedBoundary,
      );
    }
  }
});

test("uses state-specific generator layouts and one filled result action", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/");

  const generatorLayout = page.getByTestId("generator-layout");
  const generatorIntro = page.getByTestId("generator-intro");
  const generatorStateLayout = page.getByTestId("generator-state-layout");
  const setupPanel = page.getByTestId("reading-setup-panel");
  const setupWorkspace = page.getByTestId("reading-workspace");
  const dailyQuestionLink = page.getByTestId("daily-question-link");
  const setupActions = page.getByTestId("reading-setup-actions");
  const setupDrawButton = page.getByRole("button", {
    name: "Draw 3 cards",
  });
  const topicOptions = page.getByTestId("topic-options");

  await expect(generatorLayout).toHaveAttribute("data-layout-mode", "setup");
  await expect(setupWorkspace).toBeVisible();
  const generatorIntroBox = await generatorIntro.boundingBox();
  const generatorStateLayoutBox = await generatorStateLayout.boundingBox();
  const setupPanelBox = await setupPanel.boundingBox();
  const setupWorkspaceBox = await setupWorkspace.boundingBox();
  const dailyQuestionLinkBox = await dailyQuestionLink.boundingBox();
  const setupActionsBox = await setupActions.boundingBox();
  const setupDrawButtonBox = await setupDrawButton.boundingBox();
  const topicOptionsBox = await topicOptions.boundingBox();
  expect(generatorIntroBox).not.toBeNull();
  expect(generatorStateLayoutBox).not.toBeNull();
  expect(setupPanelBox).not.toBeNull();
  expect(setupWorkspaceBox).not.toBeNull();
  expect(dailyQuestionLinkBox).not.toBeNull();
  expect(setupActionsBox).not.toBeNull();
  expect(setupDrawButtonBox).not.toBeNull();
  expect(topicOptionsBox).not.toBeNull();
  expect(setupPanelBox?.y ?? 0).toBeGreaterThanOrEqual(
    Math.max(
      (generatorIntroBox?.y ?? 0) + (generatorIntroBox?.height ?? 0),
      (setupWorkspaceBox?.y ?? 0) + (setupWorkspaceBox?.height ?? 0),
    ),
  );
  expect(setupPanelBox?.width ?? 0).toBeLessThanOrEqual(896);
  expect(setupPanelBox).toMatchObject({
    x: dailyQuestionLinkBox?.x,
    width: dailyQuestionLinkBox?.width,
  });
  expect(generatorStateLayoutBox?.width ?? 0).toBeGreaterThan(
    setupPanelBox?.width ?? Number.POSITIVE_INFINITY,
  );
  expect(setupActionsBox).toMatchObject({
    x: topicOptionsBox?.x,
    width: topicOptionsBox?.width,
  });
  expect(setupDrawButtonBox).toMatchObject({
    x: setupActionsBox?.x,
    width: setupActionsBox?.width,
  });

  await setupDrawButton.click();
  await expect(generatorLayout).toHaveAttribute("data-layout-mode", "result");
  const resultWorkspace = page.getByTestId("reading-workspace");
  const resultWorkspaceBox = await resultWorkspace.boundingBox();
  expect(resultWorkspaceBox).not.toBeNull();
  expect(resultWorkspaceBox?.width ?? 0).toBeGreaterThan(
    setupPanelBox?.width ?? Number.POSITIVE_INFINITY,
  );

  const promptCopy = page.getByRole("button", { name: "Copy prompt" });
  await expect(promptCopy).toHaveCSS("background-color", colors.action);
  const resultWorkspaceRect = await getDocumentRect(resultWorkspace);
  const cardOverview = page.getByTestId("card-overview");
  const promptReady = page.getByTestId("prompt-ready");
  const cardOverviewRect = await getDocumentRect(cardOverview);
  const promptReadyRect = await getDocumentRect(promptReady);

  await page.getByRole("button", { name: "Choose your next reading" }).click();
  await expect(generatorLayout).toHaveAttribute(
    "data-layout-mode",
    "edit-next-draw",
  );
  const nextReadingEditor = page.getByRole("region", {
    name: "Choose your next reading",
  });
  await expect(nextReadingEditor).toBeVisible();
  await expect(page.getByTestId("reading-setup-panel")).toHaveCount(0);
  await expect(resultWorkspace).toBeVisible();
  await expect(cardOverview).toBeVisible();
  await expect(promptReady).toBeVisible();
  expect(await getDocumentRect(resultWorkspace)).toMatchObject({
    left: resultWorkspaceRect.left,
    right: resultWorkspaceRect.right,
    top: resultWorkspaceRect.top,
    width: resultWorkspaceRect.width,
  });
  expect(await getDocumentRect(cardOverview)).toEqual(cardOverviewRect);
  expect(await getDocumentRect(promptReady)).toEqual(promptReadyRect);
  expect(
    await page.evaluate(() => {
      const prompt = document.querySelector('[data-testid="prompt-ready"]');
      const editor = document.querySelector(
        '[data-testid="next-reading-editor"]',
      );
      const details = document.querySelector(
        '[data-testid="prompt-content-disclosure"]',
      );

      return Boolean(
        prompt &&
        editor &&
        details &&
        prompt.compareDocumentPosition(editor) &
          Node.DOCUMENT_POSITION_FOLLOWING &&
        editor.compareDocumentPosition(details) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
    }),
  ).toBe(true);
  const editorFilledPrimaryCount = await nextReadingEditor
    .locator("button")
    .evaluateAll(
      (buttons, actionColor) =>
        buttons.filter(
          (button) => getComputedStyle(button).backgroundColor === actionColor,
        ).length,
      colors.action,
    );
  expect(editorFilledPrimaryCount).toBe(1);
  const cancelEditButton = page.getByRole("button", {
    name: "Back to current reading",
  });
  const editDrawButton = page.getByRole("button", { name: "Draw 3 cards" });
  const cancelEditButtonBox = await cancelEditButton.boundingBox();
  const editDrawButtonBox = await editDrawButton.boundingBox();
  expect(cancelEditButtonBox).not.toBeNull();
  expect(editDrawButtonBox).not.toBeNull();
  expect(cancelEditButtonBox?.y).toBe(editDrawButtonBox?.y);
  expect(cancelEditButtonBox?.width).toBe(editDrawButtonBox?.width);

  for (const width of [390, 639, 640] as const) {
    await page.setViewportSize({ height: 844, width });
    const responsiveCancelEditButtonBox = await cancelEditButton.boundingBox();
    const responsiveEditDrawButtonBox = await editDrawButton.boundingBox();
    expect(
      responsiveCancelEditButtonBox,
      `${width}px cancel action`,
    ).not.toBeNull();
    expect(
      responsiveEditDrawButtonBox,
      `${width}px draw action`,
    ).not.toBeNull();

    if (width < 640) {
      expect(
        responsiveEditDrawButtonBox?.y ?? 0,
        `${width}px stacked edit actions`,
      ).toBeGreaterThanOrEqual(
        (responsiveCancelEditButtonBox?.y ?? 0) +
          (responsiveCancelEditButtonBox?.height ?? 0),
      );
    } else {
      expect(
        responsiveCancelEditButtonBox?.y,
        `${width}px paired edit actions`,
      ).toBe(responsiveEditDrawButtonBox?.y);
      expect(
        responsiveCancelEditButtonBox?.width,
        `${width}px equal edit actions`,
      ).toBe(responsiveEditDrawButtonBox?.width);
    }

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `${width}px edit action overflow`,
    ).toBe(true);
  }

  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/ko");
  await page.getByRole("button", { name: "카드 3장 뽑기" }).click();
  const localizedResultWorkspace = page.getByTestId("reading-workspace");
  await expect(page.getByRole("button", { name: "질문 복사하기" })).toHaveCSS(
    "background-color",
    colors.action,
  );
  await page.mouse.move(0, 0);
  await expect(
    page.getByRole("button", { name: "지금 바로 해석하기" }),
  ).toHaveCSS("background-color", colors.surface);
  const filledPrimaryCount = await localizedResultWorkspace
    .locator("button")
    .evaluateAll(
      (buttons, actionColor) =>
        buttons.filter(
          (button) => getComputedStyle(button).backgroundColor === actionColor,
        ).length,
      colors.action,
    );
  expect(filledPrimaryCount).toBe(1);
});

test("keeps the setup hierarchy balanced across responsive boundaries", async ({
  page,
}) => {
  for (const width of [320, 390, 640, 760, 764, 1024, 1280] as const) {
    await page.setViewportSize({ height: 900, width });
    await page.goto("/ko");

    const setupPanelBox = await page
      .getByTestId("reading-setup-panel")
      .boundingBox();
    const dailyQuestionLinkBox = await page
      .getByTestId("daily-question-link")
      .boundingBox();
    const setupActionsBox = await page
      .getByTestId("reading-setup-actions")
      .boundingBox();
    const drawButtonBox = await page
      .getByRole("button", { name: "카드 3장 뽑기" })
      .boundingBox();
    const topicOptions = page.getByTestId("topic-options");
    const topicOptionsBox = await topicOptions.boundingBox();
    const preferencesToggle = page.getByTestId("reading-preferences-toggle");
    const preferencesHeading = preferencesToggle.getByText(
      "카드 수와 답변 분위기",
      { exact: true },
    );
    const preferencesSelection = page.getByTestId(
      "reading-preferences-selection",
    );
    const preferencesHeadingMetrics = await preferencesHeading.evaluate(
      (element) => {
        const box = element.getBoundingClientRect();
        const lineHeight = Number.parseFloat(
          getComputedStyle(element).lineHeight,
        );

        return { height: box.height, lineHeight, top: box.top };
      },
    );
    const preferencesSelectionBox = await preferencesSelection.boundingBox();
    const preferencesHasNoOverflow = await preferencesToggle.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    );
    expect(setupPanelBox, `${width}px setup panel`).not.toBeNull();
    expect(dailyQuestionLinkBox, `${width}px daily link`).not.toBeNull();
    expect(setupActionsBox, `${width}px action group`).not.toBeNull();
    expect(drawButtonBox, `${width}px draw button`).not.toBeNull();
    expect(topicOptionsBox, `${width}px topic options`).not.toBeNull();
    expect(
      preferencesSelectionBox,
      `${width}px preference selection`,
    ).not.toBeNull();
    expect(
      preferencesHeadingMetrics.height,
      `${width}px preference heading line count`,
    ).toBeLessThanOrEqual(preferencesHeadingMetrics.lineHeight + 0.5);
    expect(
      preferencesHasNoOverflow,
      `${width}px preference summary overflow`,
    ).toBe(true);
    expect(setupPanelBox, `${width}px focused-section alignment`).toMatchObject(
      {
        x: dailyQuestionLinkBox?.x,
        width: dailyQuestionLinkBox?.width,
      },
    );
    expect(drawButtonBox, `${width}px full-width primary action`).toMatchObject(
      {
        x: setupActionsBox?.x,
        width: setupActionsBox?.width,
      },
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `${width}px horizontal overflow`,
    ).toBe(true);

    await expectTopicSelectorLayout(topicOptions, `${width}px Korean setup`);

    if (width === 320) {
      expect(
        await page
          .getByRole("button", { name: "카드 3장 뽑기" })
          .evaluate((element) => element.getBoundingClientRect().top + scrollY),
        "320px Korean draw action position",
      ).toBeLessThanOrEqual(1100);
    }

    if (width >= 1024) {
      expect(
        preferencesHeadingMetrics.top,
        `${width}px desktop preference summary row`,
      ).toBe(preferencesSelectionBox?.y);
    }
  }

  for (const width of [320, 640, 760, 764, 1024] as const) {
    await page.setViewportSize({ height: 900, width });
    await page.goto("/");

    const topicOptions = page.getByTestId("topic-options");
    await expectTopicSelectorLayout(topicOptions, `${width}px English setup`);

    if (width === 320 || width === 764) {
      const optionGeometryBeforeSelection =
        await getTopicSelectionGeometry(topicOptions);
      const careerRadio = page.getByRole("radio", {
        name: "Career direction",
      });
      const careerOption = careerRadio.locator("..");
      const relationshipOption = page
        .getByRole("radio", { name: "Relationship flow" })
        .locator("..");

      await careerRadio.check({ force: true });
      await page.mouse.move(0, 0);
      const optionGeometryAfterSelection =
        await getTopicSelectionGeometry(topicOptions);

      expect(
        optionGeometryAfterSelection,
        `${width}px selection geometry`,
      ).toEqual(optionGeometryBeforeSelection);
      await expect(careerOption).toHaveCSS("background-color", colors.blush);
      await expect(careerOption).toHaveCSS("border-color", colors.action);
      await expect(careerOption).toHaveCSS("border-width", "2px");
      await expect(
        careerOption.locator('[data-selected-indicator="career-direction"]'),
      ).toHaveCSS("opacity", "1");
      await expect(relationshipOption.getByTestId("topic-divider")).toHaveCount(
        0,
      );
      await expect(careerOption.getByTestId("topic-divider")).toHaveCount(0);
      await expect(topicOptions).toHaveCSS("overflow", "visible");
    }

    if (width === 320) {
      expect(
        await page
          .getByRole("button", { name: "Draw 3 cards" })
          .evaluate((element) => element.getBoundingClientRect().top + scrollY),
        "320px English draw action position",
      ).toBeLessThanOrEqual(1100);
    }
  }

  await page.setViewportSize({ height: 900, width: 320 });
  await page.goto("/");
  const englishPreferencesToggle = page.getByTestId(
    "reading-preferences-toggle",
  );
  const englishPreferencesHeading = englishPreferencesToggle.getByText(
    "Card count and reading style",
    { exact: true },
  );
  const englishHeadingIsOneLine = await englishPreferencesHeading.evaluate(
    (element) => {
      const box = element.getBoundingClientRect();
      const lineHeight = Number.parseFloat(
        getComputedStyle(element).lineHeight,
      );

      return box.height <= lineHeight + 0.5;
    },
  );
  expect(englishHeadingIsOneLine).toBe(true);
  expect(
    await englishPreferencesToggle.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
});

test("uses the topic container width in the next-reading editor", async ({
  page,
}) => {
  const localeCases = [
    {
      editAction: "Choose your next reading",
      label: "English",
      path: "/?topic=love&cards=the-fool,the-magician,the-high-priestess",
      widths: [390, 640, 764, 1024, 1280],
    },
    {
      editAction: "다음 리딩 선택하기",
      label: "Korean",
      path: "/ko?topic=love&cards=the-fool,the-magician,the-high-priestess",
      widths: [390, 764, 1280],
    },
  ] as const;

  for (const localeCase of localeCases) {
    const observedModes = new Set<string>();

    for (const width of localeCase.widths) {
      await page.setViewportSize({ height: 900, width });
      await page.goto(localeCase.path);
      await page.getByRole("button", { name: localeCase.editAction }).click();

      const topicOptions = page.getByTestId("topic-options");
      observedModes.add(
        await expectTopicSelectorLayout(
          topicOptions,
          `${width}px ${localeCase.label} next-reading editor`,
        ),
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${width}px ${localeCase.label} next-reading editor overflow`,
      ).toBe(true);
    }

    expect(observedModes, `${localeCase.label} editor modes`).toEqual(
      new Set(["list", "row"]),
    );
  }
});

test("keeps the complete question catalog in stable fragment disclosures", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/ko/relationship-tarot-questions#perception");

  const categories = page.getByTestId("question-category");
  const perceptionCategory = page.locator("#perception");

  await expect(categories).toHaveCount(7);
  await expect(
    page.locator('[data-testid="question-category"][open]'),
  ).toHaveCount(1);
  await expect(page.locator('a[href*="question="]')).toHaveCount(28);
  await expect(page).toHaveURL(/#perception$/);
  await expect
    .poll(async () => {
      const box = await perceptionCategory.boundingBox();
      return Boolean(box && box.y >= 0 && box.y < 844);
    })
    .toBe(true);

  await perceptionCategory.locator("summary").click();
  await expect(perceptionCategory).toHaveAttribute("open", "");
  await expect(
    page.getByRole("link", { name: "서로에 대한 기대 보기" }),
  ).toBeVisible();
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
  await expect(page.getByRole("button", { name: "Draw 3 cards" })).toHaveCSS(
    "background-color",
    colors.action,
  );
  await expect(
    page.getByRole("radio", { name: "Love overview" }).locator(".."),
  ).toHaveCSS("background-color", colors.blush);
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
  const loveRadio = page.getByRole("radio", { name: "Love overview" });
  const loveTopic = loveRadio.locator("..");
  const reunionRadio = page.getByRole("radio", { name: "Reunion" });
  const reunionTopic = reunionRadio.locator("..");
  const drawButton = page.getByRole("button", { name: "Draw 3 cards" });

  await expect(loveTopic.getByTestId("topic-divider")).toHaveCount(0);
  await expect(reunionTopic.getByTestId("topic-divider")).toHaveCount(1);

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
  await expect(reunionTopic.getByTestId("topic-divider")).toHaveCSS(
    "display",
    "none",
  );
  expect(
    Number(await computedStyle(reunionTopic, "zIndex")),
  ).toBeGreaterThanOrEqual(10);
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
    await expect(reunionTopic.getByTestId("topic-divider")).toHaveCSS(
      "display",
      "none",
    );
  } finally {
    await page.mouse.up();
  }

  await reunionRadio.check({ force: true });
  await expect(reunionRadio).toBeChecked();
  await expect(
    reunionTopic.locator('[data-selected-indicator="reunion"]'),
  ).toHaveCSS("opacity", "1");
  await expect(reunionTopic).toHaveCSS("border-color", colors.action);
  await expect(loveTopic.getByTestId("topic-divider")).toHaveCount(0);
  await expect(reunionTopic.getByTestId("topic-divider")).toHaveCount(0);

  await page.goto("/");
  await tabTo(page, englishLocale);
  await assertFocusOutline(englishLocale, page);
  await tabTo(page, loveRadio);
  await assertFocusOutline(loveTopic, page, loveRadio);
  expect(
    Number(await computedStyle(loveTopic, "zIndex")),
  ).toBeGreaterThanOrEqual(20);
  await page.keyboard.press("ArrowDown");
  await expect(reunionRadio).toBeChecked();
  await assertFocusOutline(reunionTopic, page, reunionRadio);
  await page.keyboard.press("ArrowUp");
  await expect(loveRadio).toBeChecked();
  await assertFocusOutline(loveTopic, page, loveRadio);
  await tabTo(page, drawButton);
  await assertFocusOutline(drawButton, page);

  await drawButton.click();
  const copyPromptButton = page.getByRole("button", {
    name: "Copy prompt",
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
    .getByRole("radio", { name: "Reunion" })
    .locator("..")
    .evaluate((element) => getComputedStyle(element).transitionDuration);

  expect(maximumCssSeconds(duration)).toBeLessThanOrEqual(0.001);

  await page.getByRole("button", { name: "Draw 3 cards" }).click();

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
  await page.getByRole("button", { name: "Draw 3 cards" }).click();

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

  await page.getByRole("button", { name: "Choose your next reading" }).click();
  await page.getByRole("button", { name: "Draw 3 cards" }).click();
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
  await page.getByRole("button", { name: "Draw 3 cards" }).click();

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
    await expect(page.getByTestId("reading-workspace")).toBeHidden();
    await page.getByRole("button", { name: "카드 3장 뽑기" }).click();
    await expect(page.getByTestId("card-overview")).toBeVisible();
    await expect(page.locator('[data-testid^="reading-card-"]')).toHaveCount(3);
    await expect(
      page.getByRole("button", { name: "질문 복사하기" }),
    ).toBeVisible();

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

test("reflows generated and shared results at the 320px viewport produced by 200 percent zoom", async ({
  page,
}) => {
  const paths = [
    "/?topic=love&cards=the-fool,the-magician,the-high-priestess",
    "/ko?topic=love&spread=deep&cards=the-fool,the-magician,the-high-priestess,the-empress,the-emperor,the-lovers",
    "/share?topic=relationship-flow&cards=the-fool,the-lovers,the-star",
  ];

  await page.setViewportSize({ height: 844, width: 320 });

  for (const path of paths) {
    await page.goto(path);
    await expect(page.getByTestId("card-overview")).toBeVisible();

    const geometry = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      itemBounds: Array.from(
        document.querySelectorAll('[data-testid^="reading-card-"]'),
      ).map((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      }),
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
    }));

    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
    for (const bounds of geometry.itemBounds) {
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    }
  }
});

test("keeps Korean share success feedback inside a 320px viewport", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 320 });
  await page.goto(
    "/ko?topic=love&cards=the-fool,the-magician,the-high-priestess",
  );
  await page.getByTestId("share-options-disclosure").locator("summary").click();
  await page.getByRole("button", { name: "Instagram용 링크 복사" }).click();
  await expect(
    page.getByRole("button", { name: "Instagram용 링크를 복사했어요" }),
  ).toBeVisible();

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("keeps the quick reading result start in view after a pointer draw", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Draw 3 cards" }).click();

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

test("keeps failed-art retry UI inside the enlarged frame", async ({
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
  const retryButton = firstCard.getByRole("button", { name: "Try again" });
  await expect(retryButton).toBeVisible({ timeout: 10_000 });
  await expect(firstCard.locator("[data-card-back]")).toBeVisible();
  await expectCardSpreadLayout(page, 3);

  const geometry = await firstCard.evaluate((card) => {
    const frame = card.querySelector("[data-card-art-frame]");
    const retry = card.querySelector("[data-card-art-retry]");

    if (!frame || !retry) {
      throw new Error("Card frame or retry control is missing");
    }

    const frameRect = frame.getBoundingClientRect();
    const retryRect = retry.getBoundingClientRect();

    return {
      frame: {
        bottom: frameRect.bottom,
        height: frameRect.height,
        left: frameRect.left,
        right: frameRect.right,
        top: frameRect.top,
        width: frameRect.width,
      },
      retry: {
        bottom: retryRect.bottom,
        height: retryRect.height,
        left: retryRect.left,
        right: retryRect.right,
        top: retryRect.top,
        width: retryRect.width,
      },
    };
  });

  expectContained(geometry.frame, geometry.retry, "card art retry control");
  expect(geometry.retry.height).toBeGreaterThanOrEqual(24);
});

for (const width of [320, 390] as const) {
  test(`reserves the hydrated Daily panel height at ${width}px`, async ({
    baseURL,
    browser,
  }) => {
    if (!baseURL) {
      throw new Error("Playwright baseURL is required");
    }
    const contextOptions = {
      baseURL,
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
  });
}

test("maps every restored illustrated card to approved art", async ({
  page,
}) => {
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
      await expect(card.getByText(cardName, { exact: true })).toBeVisible();
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

test("loads final art for localized cards across the full deck", async ({
  page,
}) => {
  await page.goto(
    "/ko?topic=love&spread=deep&cards=wands-queen,swords-3,cups-ace,pentacles-king,the-devil,the-world",
  );

  for (const [cardId, cardName] of [
    ["wands-queen", "완드 퀸"],
    ["swords-3", "소드 3"],
    ["cups-ace", "컵 에이스"],
    ["pentacles-king", "펜타클 킹"],
    ["the-devil", "악마"],
    ["the-world", "세계"],
  ] as const) {
    const card = page.locator(`[data-card-id="${cardId}"]`);
    await expect(card.getByText(cardName, { exact: true })).toBeVisible();
    await expect(card.locator(`[data-art-id="${cardId}"]`)).toHaveAttribute(
      "data-art-ready",
      "true",
    );
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

async function assertFocusOutline(
  locator: Locator,
  page: Page,
  focusedLocator = locator,
) {
  await expect(focusedLocator).toBeFocused();
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
