import { expect, test } from "@playwright/test";
import { rejectOptionalServices } from "./privacy-helpers";

test.beforeEach(async ({ context }) => {
  await rejectOptionalServices(context);
});

test("keeps an English guide campaign through the first completed reading", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/relationship-flow?source=threads&campaign=topic-guide");

  const startLink = page.getByRole("link", {
    name: "Try the free 3-card prompt",
  });

  await expect(startLink).toBeInViewport();
  await startLink.click();
  await expect(page.getByTestId("topic-select")).toHaveValue(
    "relationship-flow",
  );
  await expect(page.getByTestId("reading-preferences-selection")).toContainText(
    "Quick 3-card · Relationship-centered",
  );
  await expect(page).toHaveURL((url) => {
    return (
      url.pathname === "/" &&
      url.searchParams.get("topic") === "relationship-flow" &&
      url.searchParams.get("style") === "relational" &&
      url.searchParams.get("source") === "threads" &&
      url.searchParams.get("campaign") === "topic-guide"
    );
  });

  await page.getByRole("button", { name: "Draw 3 cards" }).click();

  await expect(page.getByTestId("prompt-ready")).toBeVisible();
  await expect(page).toHaveURL((url) => {
    const cards = url.searchParams.get("cards")?.split(",");

    return (
      cards?.length === 3 &&
      url.searchParams.get("source") === "threads" &&
      url.searchParams.get("campaign") === "topic-guide"
    );
  });
});
