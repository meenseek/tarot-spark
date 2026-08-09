import { expect, test } from "@playwright/test";

test.use({ javaScriptEnabled: false });

test("renders a restored result without JavaScript", async ({ page }) => {
  await page.goto(
    "/?topic=love&style=direct&drawStyle=balanced&cards=the-fool,the-magician,the-high-priestess",
  );

  await expect(page.getByText("The Fool").first()).toBeVisible();
  await expect(page.getByText("The Magician").first()).toBeVisible();
  await expect(page.getByText("The High Priestess").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy prompt" })).toBeVisible();
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

test("renders the complete localized guide and CTA without JavaScript", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/ko/three-card-tarot-reading");

  await expect(
    page.getByRole("heading", {
      name: "과거·현재·미래를 정하지 않고 3장 타로를 읽는 완결된 방법",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "전체 예시: 연인, 소드 2, 별",
    }),
  ).toBeVisible();
  await expect(page.getByText(/관찰 기준:/).first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "카드 세 장 뽑기" }),
  ).toHaveAttribute("href", "/ko?spread=quick");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("renders all relationship question choices at 320px without JavaScript", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/ko/relationship-tarot-questions");

  await expect(
    page.getByRole("heading", {
      name: "그 사람과 나 사이, 무엇을 물어보면 좋을까요?",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      exact: true,
      name: "그 사람과 나는 서로를 어떻게 보고 있을까?",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "서로에 대한 기대 보기" }),
  ).toHaveAttribute("href", "/ko?topic=feelings&question=mutual-view");
  await expect(page.locator('a[href*="question="]')).toHaveCount(28);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("renders a selected relationship question preset without JavaScript", async ({
  page,
}) => {
  await page.goto("/ko?topic=feelings&question=mutual-view");

  await expect(
    page.getByTestId("selected-relationship-question"),
  ).toContainText("그 사람과 나는 서로를 어떻게 보고 있을까?");
  await expect(page.locator('input[name="tarot-topic"]:checked')).toHaveValue(
    "feelings",
  );
});
