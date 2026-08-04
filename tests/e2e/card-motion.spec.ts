import { expect, test, type Page, type Route } from "@playwright/test";
import { rejectOptionalServices } from "./privacy-helpers";

async function fulfillCardArt(route: Route, delayMs = 0) {
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  await route.fulfill({
    contentType: "image/jpeg",
    path: "public/cards/the-fool.jpg",
    status: 200,
  });
}

async function useDeterministicDraw(page: Page) {
  await page.evaluate(() => {
    Math.random = () => 0;
  });
}

test.beforeEach(async ({ context }) => {
  await rejectOptionalServices(context);
});

test("uses one true two-sided flip without making cards interactive", async ({
  page,
}) => {
  await page.route("**/_next/image**", (route) => fulfillCardArt(route));
  await page.goto("/");
  await useDeterministicDraw(page);

  const firstPreparedCard = page.getByTestId("reading-card-0");
  await expect(firstPreparedCard).toHaveCSS("cursor", "auto");
  await expect(firstPreparedCard.locator("button")).toHaveCount(0);

  const drawButton = page.getByRole("button", { name: "Draw 3 cards" });
  await drawButton.focus();
  await drawButton.press("Enter");

  const firstCard = page.getByTestId("reading-card-0");
  const firstPlane = firstCard.locator("[data-card-plane]");
  await expect(firstCard.locator("[data-art-id]")).toHaveAttribute(
    "data-art-ready",
    "true",
  );
  await expect(firstPlane).toHaveClass(/ts-card-plane-(?:flip|complete)/);
  await firstPlane.evaluate((element) => {
    element.getAnimations().forEach((animation) => animation.pause());
  });

  await expect(firstPlane).toHaveCSS("animation-name", "ts-card-plane-flip");
  await expect(firstPlane).toHaveCSS("animation-duration", "0.48s");
  await expect(firstPlane).toHaveCSS("animation-delay", "0.12s");
  await expect(firstCard.locator('[data-card-face="back"]')).toHaveCSS(
    "backface-visibility",
    "hidden",
  );
  await expect(firstCard.locator('[data-card-face="front"]')).toHaveCSS(
    "backface-visibility",
    "hidden",
  );

  const keyframeTransforms = await firstPlane.evaluate((element) => {
    const [animation] = element.getAnimations();
    const effect = animation?.effect as KeyframeEffect | null;

    return effect?.getKeyframes().map(({ transform }) => transform) ?? [];
  });
  expect(keyframeTransforms).toEqual(["rotateY(0deg)", "rotateY(180deg)"]);
  const resultHeading = page.getByRole("heading", {
    name: "Your cards and AI prompt",
  });
  await expect(resultHeading).toBeFocused();
  await expect(resultHeading).toBeInViewport();
});

test("keeps the back pending and independently reveals delayed art", async ({
  page,
}) => {
  await page.route("**/_next/image**", (route) => {
    const optimizedUrl = new URL(route.request().url()).searchParams.get("url");

    return fulfillCardArt(
      route,
      optimizedUrl === "/cards/the-fool.jpg" ? 350 : 0,
    );
  });
  await page.goto("/");
  await useDeterministicDraw(page);
  await page.getByRole("button", { name: "Draw 3 cards" }).click();

  const firstCard = page.getByTestId("reading-card-0");
  const secondCard = page.getByTestId("reading-card-1");
  const firstVisual = firstCard.locator("[data-card-visual-state]");
  const firstPlane = firstCard.locator("[data-card-plane]");
  await expect(firstVisual).toHaveAttribute(
    "data-card-visual-state",
    "pending",
  );
  await expect(firstCard.locator("[data-card-back]")).toBeVisible();
  await expect(firstPlane).toHaveCSS("animation-name", "none");
  await expect(secondCard.locator("[data-art-id]")).toHaveAttribute(
    "data-art-ready",
    "true",
  );
  await expect(secondCard.locator("[data-card-visual-state]")).toHaveAttribute(
    "data-card-visual-state",
    /^(?:flipping|front)$/,
  );

  await expect(firstCard.locator("[data-art-id]")).toHaveAttribute(
    "data-art-ready",
    "true",
    { timeout: 10_000 },
  );
  await expect(firstPlane).toHaveClass(/ts-card-plane-flip/);
});

test("keeps the deep six-card reveal within the locked stagger", async ({
  page,
}) => {
  await page.route("**/_next/image**", (route) => fulfillCardArt(route));
  await page.goto("/");
  await useDeterministicDraw(page);
  await page.getByTestId("reading-preferences-toggle").click();
  await page.getByRole("radio", { name: /Deep 6-card/ }).check();
  await page.getByRole("button", { name: "Draw 6 cards" }).click();

  const cards = page.locator('[data-testid^="reading-card-"]');
  const lastCard = page.getByTestId("reading-card-5");
  const lastPlane = lastCard.locator("[data-card-plane]");
  await expect(cards).toHaveCount(6);
  await expect(lastCard.locator("[data-art-id]")).toHaveAttribute(
    "data-art-ready",
    "true",
  );
  await expect(lastPlane).toHaveClass(/ts-card-plane-flip/);
  await lastPlane.evaluate((element) => {
    element.getAnimations().forEach((animation) => animation.pause());
  });
  await expect(lastPlane).toHaveCSS("animation-duration", "0.48s");
  await expect(lastPlane).toHaveCSS("animation-delay", "0.52s");
});

test("uses the matching glyph face when one approved image fails", async ({
  page,
}) => {
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

    await fulfillCardArt(route);
  });
  await page.goto("/");
  await useDeterministicDraw(page);
  await page.getByRole("button", { name: "Draw 3 cards" }).click();

  const firstCard = page.getByTestId("reading-card-0");
  await expect(firstCard.locator('[data-glyph-id="the-fool"]')).toBeVisible({
    timeout: 10_000,
  });
  await expect(firstCard.locator("[data-card-visual-state]")).toHaveAttribute(
    "data-card-visual-state",
    /^(?:flipping-fallback|fallback)$/,
  );
  await expect(
    page.getByTestId("reading-card-1").locator("[data-art-id]"),
  ).toHaveAttribute("data-art-ready", "true");
});

test("keeps restored and reduced-motion faces static", async ({ page }) => {
  await page.route("**/_next/image**", (route) => fulfillCardArt(route));
  await page.goto(
    "/?topic=love&cards=the-fool,the-magician,the-high-priestess",
  );

  const restoredPlane = page
    .getByTestId("reading-card-0")
    .locator("[data-card-plane]");
  await expect(
    page.getByTestId("reading-card-0").locator("[data-art-id]"),
  ).toHaveAttribute("data-art-ready", "true");
  await expect(restoredPlane).toHaveClass(/ts-card-plane-complete/);
  await expect(restoredPlane).toHaveCSS("animation-name", "none");
  await expect(page.getByRole("status")).toBeEmpty();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await useDeterministicDraw(page);
  const drawButton = page.getByRole("button", { name: "Draw 3 cards" });
  await drawButton.focus();
  await drawButton.press("Enter");

  const reducedVisual = page
    .getByTestId("reading-card-0")
    .locator("[data-card-visual-state]");
  await expect(reducedVisual).toHaveAttribute(
    "data-card-visual-state",
    "front",
  );
  const resultHeading = page.getByRole("heading", {
    name: "Your cards and AI prompt",
  });
  await expect(resultHeading).toBeFocused();
  await expect(resultHeading).toBeInViewport();
});

test("drops stale motion and announcements on a rapid redraw", async ({
  page,
}) => {
  await page.route("**/_next/image**", (route) => fulfillCardArt(route, 150));
  await page.goto("/");
  await useDeterministicDraw(page);

  const drawButton = page.getByRole("button", { name: "Draw 3 cards" });
  await drawButton.click();
  await page
    .getByRole("button", { name: "Redraw with current settings" })
    .click();

  await expect(page.getByTestId("reading-card-0")).toHaveAttribute(
    "data-reveal-sequence",
    "2",
  );
  await expect(
    page.locator('[data-card-plane][data-reveal-sequence="1"]'),
  ).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveAttribute(
    "data-draw-announcement-sequence",
    "2",
  );
  await expect(page.getByRole("status")).toHaveText("3 cards drawn.");
});
