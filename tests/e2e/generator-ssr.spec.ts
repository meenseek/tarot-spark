import { expect, test } from "@playwright/test";

test.use({ javaScriptEnabled: false });

test("renders a restored result without JavaScript", async ({ page }) => {
  await page.goto(
    "/?topic=love&style=direct&drawStyle=balanced&cards=the-fool,the-magician,the-high-priestess",
  );

  await expect(page.getByText("The Fool").first()).toBeVisible();
  await expect(page.getByText("The Magician").first()).toBeVisible();
  await expect(page.getByText("The High Priestess").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copy selected prompt" }),
  ).toBeVisible();
});

test("renders a localized cardless preset without JavaScript", async ({
  page,
}) => {
  await page.goto(
    "/ko?topic=career-direction&spread=deep&style=direct&privateContext=ignored",
  );

  await expect(page.locator('input[name="tarot-topic"]:checked')).toHaveValue(
    "career-direction",
  );
  await expect(page.locator('input[name="tarot-spread"]:checked')).toHaveValue(
    "deep",
  );
  await expect(page.locator('input[name="reading-style"]:checked')).toHaveValue(
    "direct",
  );
});
