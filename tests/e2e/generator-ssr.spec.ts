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

  await expect(page.locator('select[name="tarot-topic"]')).toHaveValue(
    "career-direction",
  );
  await expect(page.locator('input[name="tarot-spread"]:checked')).toHaveValue(
    "deep",
  );
  await expect(page.locator('input[name="reading-style"]:checked')).toHaveValue(
    "direct",
  );
});

test("renders a selected career question without JavaScript", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(
    "/ko?topic=career-direction&question=career-underused-strength",
  );

  await expect(page.getByTestId("selected-public-question")).toContainText(
    "내가 놓치고 있는 강점은?",
  );
  await expect(page.getByTestId("public-question-option")).toHaveCount(14);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
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
  await expect(page.getByText(/현실 관찰:/).first()).toBeVisible();
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
  await page.locator("#perception > summary").click();
  await expect(
    page.getByRole("heading", {
      exact: true,
      name: "우리는 서로를 어떻게 보고 있을까?",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "서로의 기대 보기" }),
  ).toHaveAttribute("href", "/ko?topic=feelings&question=mutual-view");
  await expect(page.locator('a[href*="question="]')).toHaveCount(30);
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

  await expect(page.getByTestId("selected-public-question")).toContainText(
    "우리는 서로를 어떻게 보고 있을까?",
  );
  await expect(page.locator('select[name="tarot-topic"]')).toHaveValue(
    "feelings",
  );
});
