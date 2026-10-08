import { expect, test, type Page } from "@playwright/test";
import { rejectOptionalServices } from "./privacy-helpers";

async function stubClipboard(page: Page, fail = false) {
  await page.addInitScript((shouldFail) => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          if (shouldFail) throw new Error("Copy blocked");
          (window as Window & { copiedText?: string }).copiedText = text;
        },
      },
    });
    document.execCommand = () => false;
  }, fail);
}

async function readClipboard(page: Page) {
  return page.evaluate(
    () => (window as Window & { copiedText?: string }).copiedText ?? "",
  );
}

test.beforeEach(async ({ context }) => rejectOptionalServices(context));

for (const locale of ["ko", "en"] as const) {
  for (const width of [390, 1280]) {
    for (const count of [3, 6]) {
      test(`${locale} ${count}-card copy handoff and enlarged details at ${width}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await stubClipboard(page);
        const largeRequests: string[] = [];
        page.on("request", (request) => {
          const url = new URL(request.url());
          if (
            url.pathname === "/_next/image" &&
            url.searchParams.get("url")?.startsWith("/cards/") &&
            Number(url.searchParams.get("w")) > 128
          )
            largeRequests.push(url.toString());
        });
        const ko = locale === "ko";
        await page.goto(ko ? "/ko" : "/");
        if (count === 6)
          await page
            .getByRole("radio", { name: ko ? /심화 6장/ : /Deep 6-card/ })
            .check();
        await page
          .getByRole("button", {
            name: ko ? `카드 ${count}장 뽑기` : `Draw ${count} cards`,
          })
          .click();
        await expect(page.getByTestId("prompt-ready")).toBeVisible();
        await expect(page.getByTestId("ai-handoff")).toHaveCount(0);
        await expect(
          page.getByTestId("card-detail-art").locator("img"),
        ).toHaveCount(0);
        expect(largeRequests).toHaveLength(0);
        await page
          .getByRole("button", { name: ko ? "질문 복사하기" : "Copy prompt" })
          .click();
        expect(await readClipboard(page)).not.toBe("");
        const handoff = page.getByTestId("ai-handoff");
        await expect(handoff).toBeVisible();
        await expect(handoff).toContainText(
          ko ? "복사한 질문을 붙여넣어" : "paste the question you copied",
        );
        for (const href of [
          "https://chatgpt.com/",
          "https://claude.ai/",
          "https://gemini.google.com/",
        ]) {
          const link = handoff.locator(`a[href="${href}"]`);
          await expect(link).toHaveAttribute("target", "_blank");
          await expect(link).toHaveAttribute("rel", "noopener noreferrer");
        }
        const details = page.getByTestId("card-details-disclosure");
        await details.locator("summary").focus();
        await details.locator("summary").press("Enter");
        const art = page.getByTestId("card-detail-art");
        await expect(art.locator("img")).toHaveCount(count);
        await expect(art.first().locator("img")).toHaveAttribute(
          "loading",
          "lazy",
        );
        await art.first().scrollIntoViewIfNeeded();
        await expect(art.first().locator("[data-art-id]")).toHaveAttribute(
          "data-art-ready",
          "true",
        );
        expect(largeRequests.length).toBeGreaterThan(0);
        await expect(art.first()).toHaveCSS(
          "width",
          width === 390 ? "140px" : "180px",
        );
        await expect(art.locator("[data-reveal-sequence]")).toHaveCount(0);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width);
        await details.locator("summary").click();
        await expect(art.locator("img")).toHaveCount(0);
        await page
          .getByTestId("current-prompt-customization")
          .locator("summary")
          .click();
        await page
          .getByRole("radio", { name: ko ? /솔직하고 분명하게/ : /Direct/ })
          .check();
        await expect(handoff).toHaveCount(0);
      });
    }
  }
}

test("manual copy recovery offers AI links and hides them when the prompt changes", async ({
  page,
}) => {
  await stubClipboard(page, true);
  await page.goto("/?cards=the-fool,the-magician,the-high-priestess");
  await page.getByRole("button", { name: "Copy prompt" }).click();
  await expect(page.getByLabel("Generated prompt")).toBeFocused();
  await expect(page.getByTestId("ai-handoff")).toContainText(
    "Copy the question manually",
  );
  await page
    .getByTestId("current-prompt-customization")
    .locator("summary")
    .click();
  await page.getByRole("radio", { name: /Direct/ }).check();
  await expect(page.getByTestId("ai-handoff")).toHaveCount(0);
});

test("restored-open card details mount large art without replaying the reveal", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const details = document.querySelector<HTMLDetailsElement>(
        '[data-testid="card-details-disclosure"]',
      );
      if (details) {
        details.open = true;
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.goto("/?cards=the-fool,the-magician,the-high-priestess");
  await expect(page.getByTestId("card-details-disclosure")).toHaveAttribute(
    "open",
    "",
  );
  await expect(page.getByTestId("card-detail-art").locator("img")).toHaveCount(
    3,
  );
  await expect(
    page.getByTestId("card-detail-art").locator("[data-reveal-sequence]"),
  ).toHaveCount(0);
});

test("opens each AI homepage only after an explicit click without sending the question", async ({
  page,
  context,
}) => {
  await stubClipboard(page);
  const destinations = [
    "https://chatgpt.com/",
    "https://claude.ai/",
    "https://gemini.google.com/",
  ];
  for (const href of destinations) {
    await context.route(href, (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<title>AI entry fixture</title>Ready",
      }),
    );
  }
  await page.goto("/?cards=the-fool,the-magician,the-high-priestess");
  await page.getByRole("button", { name: "Copy prompt" }).click();
  expect(context.pages()).toHaveLength(1);
  for (const href of destinations) {
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      page.getByTestId("ai-handoff").locator(`a[href="${href}"]`).click(),
    ]);
    await expect(popup).toHaveURL(href);
    await expect(popup).toHaveTitle("AI entry fixture");
    expect(await popup.evaluate(() => document.referrer)).toBe("");
    expect(await popup.evaluate(() => window.opener === null)).toBe(true);
    await popup.close();
  }
  expect(context.pages()).toHaveLength(1);
});

test("retries a failed enlarged image without replaying the reveal", async ({
  page,
}) => {
  let failLargeImage = true;
  await page.route("**/_next/image**", async (route) => {
    const url = new URL(route.request().url());
    if (
      Number(url.searchParams.get("w")) > 128 &&
      url.searchParams.get("url") === "/cards/the-fool.jpg" &&
      failLargeImage
    ) {
      await route.fulfill({
        status: 500,
        contentType: "text/plain",
        body: "Image unavailable",
      });
    } else {
      await route.fulfill({
        contentType: "image/jpeg",
        path: "public/cards/the-fool.jpg",
      });
    }
  });
  await page.goto("/?cards=the-fool,the-magician,the-high-priestess");
  await page.getByTestId("card-details-disclosure").locator("summary").click();
  const art = page.getByTestId("card-detail-art").first();
  await art.scrollIntoViewIfNeeded();
  await expect(art.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(art.locator("[data-card-back]")).toBeVisible();
  failLargeImage = false;
  await art.getByRole("button", { name: "Try again" }).click();
  await expect(art.locator("[data-art-id]")).toHaveAttribute(
    "data-art-ready",
    "true",
  );
  await expect(art.locator("[data-card-plane]")).toHaveClass(
    /ts-card-plane-complete/,
  );
  await expect(art.getByRole("button")).toHaveCount(0);
});
