import { expect, test, type Page } from "@playwright/test";
import enCareerMessages from "../../src/messages/en/career-questions.json";
import enRelationshipMessages from "../../src/messages/en/relationship-questions.json";
import enTarotMessages from "../../src/messages/en/tarot-domain.json";
import koCareerMessages from "../../src/messages/ko/career-questions.json";
import koRelationshipMessages from "../../src/messages/ko/relationship-questions.json";
import koTarotMessages from "../../src/messages/ko/tarot-domain.json";
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

for (const width of [390, 1280]) {
  test(`Korean custom question reading from the result at ${width}px`, async ({
    page,
  }) => {
    test.skip(
      process.env["TAROT_INSTANT_READING_QUESTION_ENABLED"] !== "true",
      "Run with the custom-question flag enabled",
    );
    await page.setViewportSize({ width, height: 900 });
    const requests: { userQuestion?: string; cards?: unknown }[] = [];
    const question = "이 관계에서 제가 먼저 무엇을 살펴보면 좋을까요?";
    const revised = "나는 무엇 때문에 거리를 두고 싶은 걸까요?";
    const answer = "내가 편하게 마음을 표현할 수 있는 순간부터 살펴봐요.";
    const revisedAnswer = "관계에서 내 속도를 되찾고 싶은 마음이 먼저 보여요.";
    await page.route("**/api/reading", async (route) => {
      requests.push(route.request().postDataJSON());
      await route.fulfill(
        requests.length === 1
          ? { json: { code: "instant-reading-unavailable" }, status: 503 }
          : { json: { text: requests.length === 2 ? answer : revisedAnswer } },
      );
    });

    await page.goto("/ko?topic=relationship-flow");
    const contextField = page.getByRole("textbox", {
      name: /상황이나 궁금한 점/,
    });
    await contextField.fill(question);
    await page.getByRole("button", { name: "카드 3장 뽑기" }).click();
    const resultActions = page.getByTestId("prompt-ready");
    const editor = resultActions.getByText("내 질문 쓰기·수정");
    const ask = resultActions.getByRole("button", {
      name: "AI에게 바로 질문하기",
    });
    await expect(editor).toBeVisible();
    await expect(ask).toHaveAccessibleDescription(/OpenAI/);
    expect(requests).toHaveLength(0);
    await ask.click();

    const retry = resultActions.getByRole("button", { name: "다시 시도하기" });
    await expect(retry).toBeFocused();
    await expect(retry).toHaveAccessibleDescription(/OpenAI/);
    await expect(
      resultActions.getByRole("button", { name: "프롬프트 복사하기" }),
    ).toBeEnabled();
    expect(requests[0]?.userQuestion).toBe(question);
    await retry.click();
    await expect(
      page.getByRole("heading", { name: "AI 카드 흐름 해석" }),
    ).toBeFocused();
    await expect(page.getByTestId("instant-reading-result")).toHaveText(answer);
    expect(requests[1]?.userQuestion).toBe(question);

    await editor.click();
    await contextField.fill(revised);
    await expect(page.getByTestId("instant-reading-result")).toHaveCount(0);
    expect(requests).toHaveLength(2);
    await ask.click();
    await expect(page.getByTestId("instant-reading-result")).toHaveText(
      revisedAnswer,
    );
    expect(requests[2]).toMatchObject({
      userQuestion: revised,
      cards: requests[0]?.cards,
    });
    expect(decodeURIComponent(page.url())).not.toContain(revised);
  });
}

for (const locale of ["ko", "en"] as const) {
  for (const width of [390, 1280]) {
    for (const scenario of [
      {
        topicId: "feelings",
        questionId: "unspoken-expectations",
        profileId: "expectations",
        unrelatedProfileId: "perception",
      },
      {
        topicId: "career-direction",
        questionId: "career-growth-experience",
        profileId: "career-growth",
        unrelatedProfileId: "career-choice",
      },
    ] as const) {
      test(`${locale} copies the selected ${scenario.profileId} example at ${width}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await stubClipboard(page);
        const query = new URLSearchParams({
          topic: scenario.topicId,
          question: scenario.questionId,
          cards: "the-fool,the-magician,the-high-priestess",
        });
        await page.goto(`${locale === "ko" ? "/ko" : "/"}?${query}`);
        await expect(page.getByTestId("prompt-ready")).toBeVisible();
        await page
          .getByRole("button", {
            name: locale === "ko" ? "프롬프트 복사하기" : "Copy prompt",
          })
          .click();
        const copied = await readClipboard(page);
        const profiles = (locale === "ko" ? koTarotMessages : enTarotMessages)
          .promptTemplate.writingProfiles;
        const questions =
          locale === "ko"
            ? {
                ...koRelationshipMessages.questions,
                ...koCareerMessages.questions,
              }
            : {
                ...enRelationshipMessages.questions,
                ...enCareerMessages.questions,
              };
        expect(copied).toContain(questions[scenario.questionId].focus);
        expect(copied).toContain(profiles[scenario.profileId].example);
        expect(copied).not.toContain(
          profiles[scenario.unrelatedProfileId].example,
        );
      });
    }
  }
}

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
        if (count === 6) {
          await page
            .getByTestId("reading-preferences")
            .locator(":scope > summary")
            .click();
          await page
            .getByRole("radio", { name: ko ? /심화 6장/ : /Deep 6-card/ })
            .check();
        }
        await page
          .getByRole("button", {
            name: ko ? `카드 ${count}장 뽑기` : `Draw ${count} cards`,
          })
          .click();
        await expect(page.getByTestId("prompt-ready")).toBeVisible();
        const overviewArt = page
          .getByTestId("card-overview")
          .locator("[data-card-art-frame]");
        await expect(overviewArt).toHaveCount(count);
        for (const frame of await overviewArt.all()) {
          await expect(frame).toHaveCSS(
            "width",
            width === 390 ? "80px" : "112px",
          );
        }
        await expect(page.getByTestId("ai-handoff")).toHaveCount(0);
        await expect(
          page.getByTestId("card-detail-art").locator("img"),
        ).toHaveCount(0);
        expect(largeRequests).toHaveLength(0);
        await page
          .getByRole("button", {
            name: ko ? "프롬프트 복사하기" : "Copy prompt",
          })
          .click();
        expect(await readClipboard(page)).not.toBe("");
        const feedback = page.getByTestId("prompt-copy-success");
        await expect(feedback).toHaveText(ko ? "복사했어요" : "Copied");
        await expect(page.getByTestId("ai-handoff")).toHaveCount(0);
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
          .getByTestId("current-reading-style")
          .locator("summary")
          .click();
        await page
          .getByRole("radio", { name: ko ? /솔직하고 분명하게/ : /Direct/ })
          .check();
        await expect(feedback).toHaveCount(0);
      });
    }
  }
}

test("manual copy recovery selects the prompt and clears feedback when it changes", async ({
  page,
}) => {
  await stubClipboard(page, true);
  await page.goto("/?cards=the-fool,the-magician,the-high-priestess");
  await page.getByRole("button", { name: "Copy prompt" }).click();
  await expect(page.getByLabel("Generated prompt")).toBeFocused();
  const status = page.locator("#prompt-copy-failure");
  await expect(status).toBeVisible();
  const prompt = page.getByLabel("Generated prompt");
  await expect(prompt).toHaveAttribute(
    "aria-describedby",
    /prompt-copy-failure/,
  );
  expect(
    await prompt.evaluate((el) => {
      const field = el as HTMLTextAreaElement;
      return field.selectionEnd - field.selectionStart === field.value.length;
    }),
  ).toBe(true);
  await page.getByTestId("current-reading-style").locator("summary").click();
  await page.getByRole("radio", { name: /Direct/ }).check();
  await expect(status).toHaveCount(0);
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

test("copies without opening or contacting an external AI provider", async ({
  page,
  context,
}) => {
  await stubClipboard(page);
  const requests: string[] = [];
  await context.route(
    /https:\/\/(chatgpt\.com|claude\.ai|gemini\.google\.com)\//,
    (route) => {
      requests.push(route.request().url());
      return route.abort();
    },
  );
  await page.goto("/?cards=the-fool,the-magician,the-high-priestess");
  await page.getByRole("button", { name: "Copy prompt" }).click();
  await expect(page.getByTestId("prompt-copy-success")).toHaveText("Copied");
  expect(await readClipboard(page)).not.toBe("");
  expect(context.pages()).toHaveLength(1);
  expect(requests).toHaveLength(0);
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
