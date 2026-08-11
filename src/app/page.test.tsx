import "@testing-library/jest-dom/vitest";
import { StrictMode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  announceAnalyticsReady,
  clearAnalyticsReady,
} from "@/features/tarot-reading/analytics";
import {
  getReadingStateFromUrl,
  TarotExperience,
} from "@/features/tarot-reading";
import { storePrivateContextHandoff } from "@/features/tarot-reading/reading-state";
import { getTarotData } from "@/i18n/tarot-data";
import Home from "./(root)/page";

const originalExecCommand = document.execCommand;
const originalClipboard = navigator.clipboard;
const originalKakao = window.Kakao;
const originalKakaoAllowedOrigins =
  process.env["NEXT_PUBLIC_KAKAO_ALLOWED_ORIGINS"];
const originalKakaoJavaScriptKey = process.env["NEXT_PUBLIC_KAKAO_JS_KEY"];
const originalSiteUrl = process.env["NEXT_PUBLIC_SITE_URL"];
const originalShareSiteUrl = process.env["NEXT_PUBLIC_SHARE_SITE_URL"];
const originalInstantReadingEnabled =
  process.env["TAROT_INSTANT_READING_ENABLED"];
const originalUrl = window.location.href;
const originalShare = navigator.share;
const kakaoSdkScriptId = "kakao-javascript-sdk";
const kakaoSdkScriptUrl =
  "https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js";
const kakaoSdkIntegrity =
  "sha384-OL+ylM/iuPLtW5U3XcvLSGhE8JzReKDank5InqlHGWPhb4140/yrBw0bg0y7+C9J";
const testIntersectionObservers = new Set<TestIntersectionObserver>();

describe("Home", () => {
  beforeEach(() => {
    testIntersectionObservers.clear();
    vi.stubGlobal("IntersectionObserver", TestIntersectionObserver);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    restoreEnv(
      "NEXT_PUBLIC_KAKAO_ALLOWED_ORIGINS",
      originalKakaoAllowedOrigins,
    );
    restoreEnv("NEXT_PUBLIC_KAKAO_JS_KEY", originalKakaoJavaScriptKey);
    restoreEnv("NEXT_PUBLIC_SITE_URL", originalSiteUrl);
    restoreEnv("NEXT_PUBLIC_SHARE_SITE_URL", originalShareSiteUrl);
    restoreEnv("TAROT_INSTANT_READING_ENABLED", originalInstantReadingEnabled);
    document.getElementById(kakaoSdkScriptId)?.remove();
    window.history.replaceState(null, "", originalUrl);
    window.sessionStorage.clear();
    clearAnalyticsReady();
    vi.unstubAllGlobals();

    if (originalExecCommand) {
      document.execCommand = originalExecCommand;
    } else {
      Reflect.deleteProperty(document, "execCommand");
    }

    if (originalClipboard) {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: originalClipboard,
      });
    } else {
      Reflect.deleteProperty(navigator, "clipboard");
    }

    if (originalShare) {
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: originalShare,
      });
    } else {
      Reflect.deleteProperty(navigator, "share");
    }

    if (originalKakao) {
      window.Kakao = originalKakao;
    } else {
      Reflect.deleteProperty(window, "Kakao");
    }
  });

  it("renders the app shell", () => {
    render(<Home />);

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Turn your situation and a tarot spread into a stronger AI prompt.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/complete 78-card deck/i)).toBeInTheDocument();
    expect(
      screen.getByText(/entertainment and self-reflection only/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(
      screen
        .getByTestId("situation-context-toggle")
        .compareDocumentPosition(
          screen.getByRole("button", { name: /Draw \d cards/ }),
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen
        .getByTestId("reading-preferences-toggle")
        .compareDocumentPosition(
          screen.getByRole("button", { name: /Draw \d cards/ }),
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByTestId("reading-preferences")).not.toHaveAttribute(
      "open",
    );
    expect(screen.getByTestId("situation-context")).not.toHaveAttribute("open");
    expect(
      screen
        .getByTestId("reading-workspace")
        .compareDocumentPosition(
          screen.getByRole("link", { name: "Try today's one-card question" }),
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders Korean localized content", () => {
    render(<TarotExperience locale="ko" />);
    openSituationContext();

    expect(
      screen.getByRole("heading", {
        name: "지금 고민을 카드로 펼쳐보고, AI에 물어볼 질문까지 만들어보세요.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /카드 \d장 뽑기/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/78장 전체 덱/)).toBeInTheDocument();
    expect(screen.getByText(/의료·법률·재정/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /복사할 질문에는 포함되며, 다른 AI에 붙여 넣으면 함께 전달됩니다/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "개인정보" })).toHaveAttribute(
      "href",
      "/ko/privacy",
    );
    expect(
      screen.queryByRole("button", { name: "지금 바로 해석하기" }),
    ).not.toBeInTheDocument();
  });

  it("creates an instant Korean reading without sending free-form context", async () => {
    process.env["TAROT_INSTANT_READING_ENABLED"] = "true";
    vi.spyOn(Math, "random").mockReturnValue(0);
    const reading = createValidInstantReading();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json(reading));

    render(<TarotExperience locale="ko" />);
    openSituationContext();

    fireEvent.change(screen.getByRole("textbox", { name: /내 상황 더하기/ }), {
      target: {
        value: "서버로 보내면 안 되는 민감한 개인 상황",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /카드 \d장 뽑기/ }));
    fireEvent.click(screen.getByRole("button", { name: "지금 바로 해석하기" }));

    await waitFor(() => {
      expect(screen.getByTestId("instant-reading-result")).toBeInTheDocument();
    });
    const result = within(screen.getByTestId("instant-reading-result"));
    const resultHeading = result.getByRole("heading", {
      name: "AI 카드 흐름 해석",
    });
    expect(resultHeading).toHaveFocus();
    const readingText = result.getByText(
      (_content, element) => element?.textContent === reading.text,
    );
    expect(readingText).toHaveTextContent("[가능성 A]");
    expect(readingText).toHaveTextContent("[가능성 B]");
    expect(readingText).toHaveTextContent("관찰할 점:");
    expect(readingText).toHaveTextContent("멈추거나 다시 볼 조건:");
    expect(
      screen.getByText("생성형 AI를 활용해 작성한 해석입니다."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("AI에 붙여 넣을 질문")).toBeInTheDocument();

    const [, request] = fetchMock.mock.calls[0] ?? [];
    const body = JSON.parse(String(request?.body)) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(
      ["cards", "spreadId", "styleId", "topicId"].sort(),
    );
    expect(JSON.stringify(body)).not.toContain("민감한 개인 상황");
    expect(JSON.stringify(body)).not.toContain("userContext");
  });

  it("keeps the prompt fallback when an instant reading is unavailable", async () => {
    process.env["TAROT_INSTANT_READING_ENABLED"] = "true";
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ code: "instant-reading-unavailable" }, { status: 503 }),
    );

    render(<TarotExperience locale="ko" />);

    fireEvent.click(screen.getByRole("button", { name: /카드 \d장 뽑기/ }));
    fireEvent.click(screen.getByRole("button", { name: "지금 바로 해석하기" }));

    await waitFor(() => {
      expect(
        screen.getByText(/지금은 바로 해석을 불러오지 못했어요/, {
          selector: "p.text-ts-danger",
        }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "다시 시도하기" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("AI에 붙여 넣을 질문")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "질문 복사하기" }),
    ).toBeInTheDocument();
  });

  it("cancels an unfinished instant reading when the cards change", () => {
    process.env["TAROT_INSTANT_READING_ENABLED"] = "true";
    vi.spyOn(Math, "random").mockReturnValue(0);
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => new Promise<Response>(() => undefined));

    render(<TarotExperience locale="ko" />);

    const drawButton = screen.getByRole("button", {
      name: /카드 \d장 뽑기/,
    });
    fireEvent.click(drawButton);
    fireEvent.click(screen.getByRole("button", { name: "지금 바로 해석하기" }));

    const signal = fetchMock.mock.calls[0]?.[1]?.signal;
    expect(signal?.aborted).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "다음 리딩 선택하기" }));
    fireEvent.click(screen.getByRole("button", { name: /카드 \d장 뽑기/ }));

    expect(signal?.aborted).toBe(true);
    expect(
      screen.getByRole("button", { name: "지금 바로 해석하기" }),
    ).toBeInTheDocument();
  });

  it("uses the same focused control to cancel a reading", () => {
    process.env["TAROT_INSTANT_READING_ENABLED"] = "true";
    vi.spyOn(Math, "random").mockReturnValue(0);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );

    render(<TarotExperience locale="ko" />);
    fireEvent.click(screen.getByRole("button", { name: /카드 \d장 뽑기/ }));
    const action = screen.getByRole("button", { name: "지금 바로 해석하기" });
    action.focus();
    fireEvent.click(action);

    const cancel = screen.getByRole("button", { name: "해석 취소하기" });
    expect(cancel).toBe(action);
    expect(cancel).toHaveFocus();
    fireEvent.click(cancel);

    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(
      screen.getByRole("button", { name: "지금 바로 해석하기" }),
    ).toHaveFocus();
    expect(
      screen.queryByTestId("instant-reading-result"),
    ).not.toBeInTheDocument();
  });

  it("matches the context example to every selected topic", () => {
    render(<Home />);
    openSituationContext();

    const context = screen.getByLabelText(/Add your situation/);
    const topicExamples = [
      [
        "Love overview",
        "Example: I want to move a connection forward, but I am unsure whether expressing my feelings first would be healthy.",
      ],
      [
        "Reunion",
        "Example: I am considering contacting an ex and want to reflect on what must change before old problems repeat.",
      ],
      [
        "Feelings",
        "Example: Their messages have become less frequent. I want to separate observable behavior from my assumptions.",
      ],
      [
        "Relationship flow",
        "Example: Conversations with someone close keep going wrong. I want to notice the pattern and what I can change.",
      ],
      [
        "Career direction",
        "Example: I am torn between staying at my company and preparing for a new opportunity. I want one next step.",
      ],
    ] as const;

    for (const [topicButtonName, placeholder] of topicExamples) {
      fireEvent.click(screen.getByRole("radio", { name: topicButtonName }));
      expect(context).toHaveAttribute("placeholder", placeholder);
    }
  });

  it("keeps optional situation entry discoverable and confirms saved input", () => {
    render(<Home />);

    const situationDisclosure = screen.getByTestId("situation-context");
    expect(situationDisclosure).not.toHaveAttribute("open");
    expect(screen.getByText("Make the prompt more specific")).toBeVisible();

    openSituationContext();
    fireEvent.change(screen.getByLabelText("Add your situation"), {
      target: { value: "I want to understand what I can change." },
    });
    fireEvent.click(screen.getByTestId("situation-context-toggle"));

    expect(situationDisclosure).not.toHaveAttribute("open");
    expect(screen.getByText("Situation added · Edit")).toBeVisible();
    expect(
      screen
        .getByTestId("situation-context-toggle")
        .compareDocumentPosition(
          screen.getByRole("button", { name: /Draw \d cards/ }),
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("labels the Korean Instagram action as a link copy", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    Reflect.deleteProperty(navigator, "clipboard");
    document.execCommand = vi.fn(() => true);

    render(<TarotExperience locale="ko" />);

    fireEvent.click(screen.getByRole("button", { name: /카드 \d장 뽑기/ }));
    openShareOptions();
    fireEvent.click(
      screen.getByRole("button", { name: "Instagram용 링크 복사" }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Instagram용 링크를 복사했어요",
        }),
      ).toBeInTheDocument();
    });
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  it("shows exact card names in order without invented position meanings", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    render(<TarotExperience locale="ko" />);

    fireEvent.click(screen.getByRole("button", { name: /카드 \d장 뽑기/ }));

    const ready = screen.getByTestId("prompt-ready");
    expect(within(ready).getByText("1. 바보")).toBeInTheDocument();
    expect(within(ready).getByText("2. 마법사")).toBeInTheDocument();
    expect(within(ready).getByText("3. 여사제")).toBeInTheDocument();

    openPromptContent();

    const prompt = screen.getByLabelText(
      "AI에 붙여 넣을 질문",
    ) as HTMLTextAreaElement;

    expect(prompt.value).toContain("바보");
    expect(prompt.value).toContain("마법사");
    expect(prompt.value).toContain("여사제");
  });

  it("draws cards and generates a copyable prompt", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    render(<Home />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /Draw \d cards/,
      }),
    );

    expect(
      within(screen.getByTestId("reading-card-0")).getByText("The Fool"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("reading-card-1")).getByText("The Magician"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("reading-card-2")).getByText(
        "The High Priestess",
      ),
    ).toBeInTheDocument();

    expect(screen.getByTestId("prompt-ready")).toBeVisible();
    expect(screen.getByTestId("prompt-content-disclosure")).not.toHaveAttribute(
      "open",
    );
    expect(screen.getByTestId("card-details-disclosure")).not.toHaveAttribute(
      "open",
    );
    expect(screen.getByTestId("share-options-disclosure")).not.toHaveAttribute(
      "open",
    );
    openPromptContent();

    const prompt = screen.getByLabelText(
      "Generated prompt",
    ) as HTMLTextAreaElement;

    expect(prompt.value).toContain("Topic: Love");
    expect(prompt.value).toContain("The Fool");
    expect(prompt.value).toContain("The Magician");
    expect(prompt.value).toContain("The High Priestess");
    expect(
      screen.getByRole("button", {
        name: "Copy prompt",
      }),
    ).toBeInTheDocument();

    openShareOptions();
    expect(
      screen.getByRole("button", {
        name: "Share",
      }),
    ).toBeInTheDocument();
    expect(
      screen
        .getByTestId("prompt-ready")
        .compareDocumentPosition(
          screen.getByTestId("card-details-disclosure"),
        ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: "KakaoTalk",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Copy link for Instagram",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Copy URL",
      }),
    ).toBeInTheDocument();
    expect(window.location.search).toContain("topic=love");
    expect(window.location.search).toContain(
      "cards=the-fool%2Cthe-magician%2Cthe-high-priestess",
    );
  });

  it.each([
    { behavior: "smooth", reducedMotion: false },
    { behavior: "auto", reducedMotion: true },
  ] as const)(
    "scrolls pointer draws to the result with $behavior motion",
    ({ behavior, reducedMotion }) => {
      vi.spyOn(Math, "random").mockReturnValue(0);
      vi.stubGlobal(
        "matchMedia",
        vi.fn(() => ({ matches: reducedMotion })),
      );

      render(<Home />);

      const workspace = screen.getByTestId("reading-workspace");
      const scrollIntoView = vi.fn();
      Object.defineProperty(workspace, "scrollIntoView", {
        configurable: true,
        value: scrollIntoView,
      });

      fireEvent.click(screen.getByRole("button", { name: /Draw \d cards/ }), {
        detail: 1,
      });

      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior,
        block: "start",
      });
    },
  );

  it("restarts the visual reveal and one live status for each user draw", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    render(<Home />);

    const drawStatus = screen.getByRole("status");
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(drawStatus).toBeEmptyDOMElement();

    fireEvent.click(screen.getByRole("button", { name: /Draw \d cards/ }));

    const firstDrawCard = screen.getByTestId("reading-card-0");
    expect(firstDrawCard).toHaveAttribute("data-reveal-order", "1");
    expect(firstDrawCard).toHaveAttribute("data-reveal-sequence", "1");
    expect(firstDrawCard).toHaveClass("ts-card-arrive");
    expect(drawStatus).toHaveAttribute("data-draw-announcement-sequence", "1");
    await waitFor(() => {
      expect(drawStatus).toHaveTextContent("3 cards drawn.");
    });

    fireEvent.click(screen.getByText("Customize current prompt"));
    fireEvent.click(
      screen.getByRole("radio", { name: /Direct, not deterministic/ }),
    );

    expect(screen.getByTestId("reading-card-0")).toBe(firstDrawCard);
    expect(firstDrawCard).toHaveAttribute("data-reveal-sequence", "1");
    expect(drawStatus).toHaveTextContent("3 cards drawn.");
    expect(drawStatus).toHaveAttribute("data-draw-announcement-sequence", "1");

    fireEvent.click(
      screen.getByRole("button", { name: "Choose your next reading" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Draw 3 cards" }));

    const secondDrawCard = screen.getByTestId("reading-card-0");
    expect(secondDrawCard).not.toBe(firstDrawCard);
    expect(secondDrawCard).toHaveAttribute("data-reveal-sequence", "2");
    expect(drawStatus).toBeEmptyDOMElement();
    expect(drawStatus).toHaveAttribute("data-draw-announcement-sequence", "2");
    await waitFor(() => {
      expect(drawStatus).toHaveTextContent("3 cards drawn.");
    });
  });

  it("cancels a stale draw announcement before announcing a new draw", () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);

    render(<Home />);

    const drawButton = screen.getByRole("button", { name: /Draw \d cards/ });
    const drawStatus = screen.getByRole("status");
    const baselineTimerCount = vi.getTimerCount();

    fireEvent.click(drawButton);
    expect(drawStatus).toHaveAttribute("data-draw-announcement-sequence", "1");
    expect(drawStatus).toBeEmptyDOMElement();
    const firstDrawTimerCount = vi.getTimerCount();
    expect(firstDrawTimerCount).toBeGreaterThan(baselineTimerCount);

    fireEvent.click(
      screen.getByRole("button", { name: "Choose your next reading" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Draw 3 cards" }));
    expect(drawStatus).toHaveAttribute("data-draw-announcement-sequence", "2");
    expect(drawStatus).toBeEmptyDOMElement();

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(drawStatus).toHaveTextContent("3 cards drawn.");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the current result stable while editing and cancelling the next draw", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: /Draw \d cards/ }));
    const firstCard = screen.getByTestId("reading-card-0");
    const firstWorkspace = screen.getByTestId("reading-workspace");
    const firstPrompt = screen.getByLabelText("Generated prompt");
    const committedPrompt = (firstPrompt as HTMLTextAreaElement).value;
    const committedUrl = window.location.href;
    expect(screen.queryByText("Redraw with current settings")).toBeNull();
    const editTrigger = screen.getByRole("button", {
      name: "Choose your next reading",
    });

    fireEvent.click(editTrigger);
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Choose your next reading" }),
      ).toHaveFocus();
    });
    const editor = screen.getByRole("region", {
      name: "Choose your next reading",
    });
    const promptReady = screen.getByTestId("prompt-ready");
    const promptDisclosure = screen.getByTestId("prompt-content-disclosure");

    expect(screen.getByTestId("reading-workspace")).toBe(firstWorkspace);
    expect(screen.getByTestId("reading-card-0")).toBe(firstCard);
    expect(screen.getByTestId("prompt-ready")).toBe(promptReady);
    expect(firstPrompt).toHaveValue(committedPrompt);
    expect(
      promptReady.compareDocumentPosition(editor) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      editor.compareDocumentPosition(promptDisclosure) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByTestId("reading-setup-panel")).toBeNull();
    expect(screen.queryByText("Customize current prompt")).toBeNull();
    expect(
      screen.getAllByText(
        "Tarot content is for entertainment and self-reflection only. It is not medical, legal, financial, investment, or mental-health advice.",
      ),
    ).toHaveLength(1);

    fireEvent.click(screen.getByRole("radio", { name: "Reunion" }));

    expect(screen.getByTestId("reading-card-0")).toBe(firstCard);
    expect(firstPrompt).toHaveValue(committedPrompt);
    expect(window.location.href).toBe(committedUrl);

    fireEvent.click(
      screen.getByRole("button", { name: "Back to current reading" }),
    );
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Choose your next reading" }),
      ).toHaveFocus();
    });
    expect(screen.queryByRole("radio", { name: "Reunion" })).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Choose your next reading" }),
    );
    expect(screen.getByRole("radio", { name: "Love overview" })).toBeChecked();
  });

  it("customizes the current prompt without rewriting draw provenance", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    vi.spyOn(Math, "random").mockReturnValue(0);
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: /Draw \d cards/ }));
    const firstCard = screen.getByTestId("reading-card-0");
    openShareOptions();
    fireEvent.click(screen.getByRole("button", { name: "Copy URL" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "URL copied" })).toBeVisible();
    });

    fireEvent.click(screen.getByText("Customize current prompt"));
    fireEvent.click(
      screen.getByRole("radio", { name: /Direct, not deterministic/ }),
    );

    expect(screen.getByTestId("reading-card-0")).toBe(firstCard);
    expect(new URL(window.location.href).searchParams.get("style")).toBe(
      "direct",
    );
    expect(new URL(window.location.href).searchParams.get("drawStyle")).toBe(
      "balanced",
    );
    expect(screen.getByRole("button", { name: "Copy URL" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "URL copied" })).toBeNull();
  });

  it("keeps stale prompt-copy analytics but ignores stale UI completion", async () => {
    let resolveClipboard: (() => void) | undefined;
    const writeText = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveClipboard = resolve;
        }),
    );
    const events: { readonly name: string; readonly payload: unknown }[] = [];
    const listener = (event: Event) => {
      events.push((event as CustomEvent).detail);
    };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    window.addEventListener("tarot_spark_event", listener);

    try {
      announceAnalyticsReady();
      renderDrawnReading();
      fireEvent.click(screen.getByRole("button", { name: "Copy prompt" }));
      fireEvent.click(screen.getByText("Customize current prompt"));
      fireEvent.click(
        screen.getByRole("radio", { name: /Direct, not deterministic/ }),
      );

      await act(async () => {
        resolveClipboard?.();
        await Promise.resolve();
      });

      expect(screen.queryByRole("button", { name: "Copied" })).toBeNull();
      expect(events.filter(({ name }) => name === "prompt_copy")).toHaveLength(
        1,
      );
    } finally {
      window.removeEventListener("tarot_spark_event", listener);
    }
  });

  it("does not activate analytics consent after a copy has already started", async () => {
    let resolveClipboard: (() => void) | undefined;
    const writeText = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveClipboard = resolve;
        }),
    );
    const events: { readonly name: string }[] = [];
    const listener = (event: Event) => {
      events.push((event as CustomEvent).detail);
    };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    window.addEventListener("tarot_spark_event", listener);

    try {
      renderDrawnReading();
      fireEvent.click(screen.getByRole("button", { name: "Copy prompt" }));
      announceAnalyticsReady();

      await act(async () => {
        resolveClipboard?.();
        await Promise.resolve();
      });

      expect(screen.getByRole("button", { name: "Copied" })).toBeVisible();
      expect(events.filter(({ name }) => name === "prompt_copy")).toHaveLength(
        0,
      );
    } finally {
      window.removeEventListener("tarot_spark_event", listener);
    }
  });

  it("restores a shared reading from URL parameters", async () => {
    window.history.replaceState(
      null,
      "",
      "/?topic=reunion&cards=the-fool,the-magician,the-high-priestess",
    );

    render(<Home />);

    await waitFor(() => {
      expect(
        within(screen.getByTestId("reading-card-0")).getByText("The Fool"),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Reunion", { selector: "p" })).toBeInTheDocument();

    openPromptContent();

    const prompt = screen.getByLabelText(
      "Generated prompt",
    ) as HTMLTextAreaElement;
    expect(prompt.value).toContain("Topic: Reunion");
    expect(prompt.value).toContain("The High Priestess");
    expect(prompt.value).toContain("No card images are attached");
    expect(prompt.value).not.toMatch(/Interpretation lens|spark|shadow/i);
    expect(screen.getByTestId("reading-card-0")).not.toHaveClass(
      "ts-card-arrive",
    );
    expect(screen.getByTestId("reading-card-0")).not.toHaveAttribute(
      "data-reveal-order",
    );
    expect(screen.getByTestId("reading-card-0")).not.toHaveAttribute(
      "data-reveal-sequence",
    );
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.getByRole("status")).not.toHaveAttribute(
      "data-draw-announcement-sequence",
    );
  });

  it("preserves a direct safe attribution pair before a reading is selected", async () => {
    window.history.replaceState(
      null,
      "",
      "/?source=naver&campaign=topic-guide",
    );

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "한국어" })).toHaveAttribute(
        "href",
        "/ko?topic=love&source=naver&campaign=topic-guide",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /Draw \d cards/ }));
    expect(window.location.search).toContain("source=naver");
    expect(window.location.search).toContain("campaign=topic-guide");
  });

  it("renders a server-seeded shared result without generator controls or private handoff", async () => {
    const initialReadingState = getReadingStateFromUrl(
      getTarotData("en"),
      "https://tarot-spark.local/share?topic=relationship-flow&style=relational&cards=the-fool,the-lovers,the-star",
    );

    expect(initialReadingState).toBeDefined();
    storePrivateContextHandoff(
      window.sessionStorage,
      "Stale private context that must not enter a shared reading.",
    );

    render(
      <TarotExperience
        initialAttribution={{
          campaignId: "vertical-slice",
          sourceId: "instagram",
        }}
        initialReadingState={initialReadingState}
        locale="en"
        viewMode="shared"
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "A tarot-spark reading was shared with you.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Generated prompt")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Draw \d cards/ })).toBeNull();
    expect(screen.queryByTestId("reading-preferences")).toBeNull();

    const createOwnLink = screen.getByRole("link", {
      name: "Create your own reading",
    });
    expect(createOwnLink).toHaveAttribute(
      "href",
      "/?source=instagram&campaign=vertical-slice",
    );
    expect(
      createOwnLink.compareDocumentPosition(
        screen.getByLabelText("Generated prompt"),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "한국어" })).toHaveAttribute(
      "href",
      "/ko/share?topic=relationship-flow&style=relational&cards=the-fool%2Cthe-lovers%2Cthe-star&source=instagram&campaign=vertical-slice",
    );

    await waitFor(() => {
      expect(window.sessionStorage.length).toBe(0);
    });
  });

  it("preserves share attribution and emits one restored result after analytics is ready", async () => {
    const events: {
      readonly name: string;
      readonly payload: Record<string, unknown>;
    }[] = [];
    const listener = (event: Event) => {
      events.push((event as CustomEvent).detail);
    };
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    window.history.replaceState(
      null,
      "",
      "/share?topic=relationship-flow&style=relational&cards=the-fool,the-lovers,the-star&source=instagram&campaign=vertical-slice",
    );
    window.addEventListener("tarot_spark_event", listener);

    try {
      render(<Home />);

      await waitFor(() => {
        expect(screen.getByTestId("prompt-ready")).toBeVisible();
      });
      await waitFor(() => {
        expect(testIntersectionObservers.size).toBeGreaterThan(0);
      });
      setReadingResultIntersection(true);
      announceAnalyticsReady();
      expect(events.filter(({ name }) => name === "result_view")).toEqual([
        {
          name: "result_view",
          payload: {
            locale: "en",
            topic_id: "relationship-flow",
            card_count: 3,
            draw_style_id: "relational",
            spread_id: "quick",
            style_id: "relational",
            source: "instagram",
            campaign: "vertical-slice",
          },
        },
      ]);

      fireEvent.click(screen.getByRole("button", { name: "Copy prompt" }));
      await waitFor(() => {
        expect(writeText).toHaveBeenCalled();
      });
      expect(events).toContainEqual({
        name: "prompt_copy",
        payload: expect.objectContaining({
          source: "instagram",
          campaign: "vertical-slice",
        }),
      });
      expect(screen.getByRole("link", { name: "한국어" })).toHaveAttribute(
        "href",
        expect.stringContaining("source=instagram"),
      );
    } finally {
      window.removeEventListener("tarot_spark_event", listener);
    }
  });

  it("builds a contextual direct six-card prompt without exposing context", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    render(<Home />);
    openReadingPreferences();
    openSituationContext();

    fireEvent.click(screen.getByRole("radio", { name: /Deep 6-card/ }));
    fireEvent.click(
      screen.getByRole("radio", {
        name: /Direct, not deterministic/,
      }),
    );
    fireEvent.change(
      screen.getByRole("textbox", {
        name: /Add your situation/,
      }),
      {
        target: {
          value:
            "My relationship with my manager is exhausting. Should I stay at this company?",
        },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: /Draw \d cards/ }));
    openPromptContent();

    const prompt = screen.getByLabelText(
      "Generated prompt",
    ) as HTMLTextAreaElement;
    expect(prompt.value).toContain("Drawn cards (6-card reading)");
    expect(prompt.value).toContain("Tone: Direct, not deterministic");
    expect(prompt.value).toContain(
      '"My relationship with my manager is exhausting. Should I stay at this company?"',
    );
    expect(prompt.value).toContain("untrusted quoted data");
    expect(screen.getAllByTestId(/reading-card-/)).toHaveLength(6);

    const url = new URL(window.location.href);
    expect(url.searchParams.get("spread")).toBe("deep");
    expect(url.searchParams.get("style")).toBe("direct");
    expect(url.searchParams.get("cards")?.split(",")).toHaveLength(6);
    expect(url.search).not.toContain("manager");
    expect(url.search).not.toContain("context");
  });

  it("preserves private context once during same-tab locale switching", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    render(<Home />);
    openSituationContext();

    fireEvent.change(
      screen.getByRole("textbox", {
        name: /Add your situation/,
      }),
      {
        target: {
          value: "My manager relationship is difficult.",
        },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: /Draw \d cards/ }));

    const koreanLink = screen.getByRole("link", { name: "한국어" });
    const koreanHref = koreanLink.getAttribute("href");
    expect(koreanHref).toContain("topic=love");
    expect(koreanHref).toContain("cards=");
    expect(koreanHref).not.toContain("manager");
    fireEvent.click(koreanLink);

    expect(window.sessionStorage.length).toBe(1);
    cleanup();
    window.history.replaceState(null, "", koreanHref ?? "/ko");
    render(
      <StrictMode>
        <TarotExperience locale="ko" />
      </StrictMode>,
    );
    fireEvent.click(screen.getByText("현재 질문 수정"));

    await waitFor(() => {
      expect(
        screen.getByRole("textbox", {
          name: /내 상황 더하기/,
        }),
      ).toHaveValue("My manager relationship is difficult.");
    });
    expect(window.sessionStorage.length).toBe(0);
    openPromptContent();
    expect(
      (screen.getByLabelText("AI에 붙여 넣을 질문") as HTMLTextAreaElement)
        .value,
    ).toContain('"My manager relationship is difficult."');
  });

  it("drops unrelated query parameters when creating reading links", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    window.history.replaceState(
      null,
      "",
      "/?utm_source=test&private_note=do-not-share#secret",
    );
    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: /Draw \d cards/ }));

    const url = new URL(window.location.href);
    expect([...url.searchParams.keys()].sort()).toEqual(["cards", "topic"]);
    expect(url.hash).toBe("");
  });

  it("emits behavior analytics with stable ids", async () => {
    const events: {
      readonly name: string;
      readonly payload: Record<string, unknown>;
    }[] = [];
    const listener = (event: Event) => {
      events.push((event as CustomEvent).detail);
    };
    vi.spyOn(Math, "random").mockReturnValue(0);
    window.addEventListener("tarot_spark_event", listener);

    try {
      announceAnalyticsReady();
      render(<Home />);

      fireEvent.click(screen.getByRole("radio", { name: "Reunion" }));
      fireEvent.click(screen.getByRole("button", { name: /Draw \d cards/ }));
      await waitFor(() => {
        expect(testIntersectionObservers.size).toBeGreaterThan(0);
      });
      setReadingResultIntersection(true);

      expect(events).toContainEqual({
        name: "topic_click",
        payload: { locale: "en", topic_id: "reunion" },
      });
      expect(events).toContainEqual({
        name: "draw_start",
        payload: {
          locale: "en",
          topic_id: "reunion",
          draw_style_id: "balanced",
          spread_id: "quick",
          style_id: "balanced",
        },
      });
      expect(events).toContainEqual({
        name: "card_selected",
        payload: {
          locale: "en",
          topic_id: "reunion",
          card_order: 1,
          card_id: "the-fool",
          draw_style_id: "balanced",
          spread_id: "quick",
          style_id: "balanced",
        },
      });
      expect(events).toContainEqual({
        name: "result_view",
        payload: {
          locale: "en",
          topic_id: "reunion",
          card_count: 3,
          draw_style_id: "balanced",
          spread_id: "quick",
          style_id: "balanced",
        },
      });
    } finally {
      window.removeEventListener("tarot_spark_event", listener);
    }
  });

  it("does not backfill a result that left view before analytics became ready", async () => {
    const events: { readonly name: string }[] = [];
    const listener = (event: Event) => {
      events.push((event as CustomEvent).detail);
    };
    window.history.replaceState(
      null,
      "",
      "/?topic=love&cards=the-fool,the-magician,the-high-priestess",
    );
    window.addEventListener("tarot_spark_event", listener);

    try {
      render(<Home />);
      await waitFor(() => {
        expect(screen.getByTestId("prompt-ready")).toBeVisible();
      });
      await waitFor(() => {
        expect(testIntersectionObservers.size).toBeGreaterThan(0);
      });
      const promptReady = screen.getByTestId("prompt-ready");
      expect(
        Array.from(testIntersectionObservers).some((observer) =>
          observer.observes(promptReady),
        ),
      ).toBe(true);

      setReadingResultIntersection(true);
      setReadingResultIntersection(false);
      fireEvent.click(
        screen.getByRole("button", { name: "Choose your next reading" }),
      );
      const nextReadingEditor = screen.getByTestId("next-reading-editor");
      expect(
        Array.from(testIntersectionObservers).some((observer) =>
          observer.observes(nextReadingEditor),
        ),
      ).toBe(false);
      announceAnalyticsReady();

      expect(events.filter(({ name }) => name === "result_view")).toHaveLength(
        0,
      );

      setReadingResultIntersection(true);
      expect(events.filter(({ name }) => name === "result_view")).toHaveLength(
        1,
      );
    } finally {
      window.removeEventListener("tarot_spark_event", listener);
    }
  });

  it("counts identical user draws once per committed draw sequence", () => {
    const events: { readonly name: string }[] = [];
    const listener = (event: Event) => {
      events.push((event as CustomEvent).detail);
    };
    vi.spyOn(Math, "random").mockReturnValue(0);
    window.addEventListener("tarot_spark_event", listener);

    try {
      announceAnalyticsReady();
      render(<Home />);

      fireEvent.click(screen.getByRole("button", { name: /Draw \d cards/ }));
      setReadingResultIntersection(true);
      setReadingResultIntersection(true);

      fireEvent.click(
        screen.getByRole("button", { name: "Choose your next reading" }),
      );
      setReadingResultIntersection(true);
      fireEvent.click(
        screen.getByRole("button", { name: "Back to current reading" }),
      );
      setReadingResultIntersection(true);

      expect(events.filter(({ name }) => name === "result_view")).toHaveLength(
        1,
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Choose your next reading" }),
      );
      fireEvent.click(screen.getByRole("button", { name: "Draw 3 cards" }));
      setReadingResultIntersection(true);

      expect(events.filter(({ name }) => name === "result_view")).toHaveLength(
        2,
      );
    } finally {
      window.removeEventListener("tarot_spark_event", listener);
    }
  });

  it("does not duplicate a restored result across Strict Mode effect remounts", async () => {
    const events: { readonly name: string }[] = [];
    const listener = (event: Event) => {
      events.push((event as CustomEvent).detail);
    };
    window.history.replaceState(
      null,
      "",
      "/?topic=love&cards=the-fool,the-magician,the-high-priestess",
    );
    window.addEventListener("tarot_spark_event", listener);

    try {
      announceAnalyticsReady();
      render(
        <StrictMode>
          <Home />
        </StrictMode>,
      );
      await waitFor(() => {
        expect(screen.getByTestId("prompt-ready")).toBeVisible();
      });

      setReadingResultIntersection(true);
      setReadingResultIntersection(true);

      expect(events.filter(({ name }) => name === "result_view")).toHaveLength(
        1,
      );
    } finally {
      window.removeEventListener("tarot_spark_event", listener);
    }
  });

  it("copies the single deterministic prompt as activation", async () => {
    const events: {
      readonly name: string;
      readonly payload: Record<string, unknown>;
    }[] = [];
    const listener = (event: Event) => {
      events.push((event as CustomEvent).detail);
    };
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    vi.spyOn(Math, "random").mockReturnValue(0);
    window.addEventListener("tarot_spark_event", listener);

    try {
      announceAnalyticsReady();
      render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: /Draw \d cards/ }));
      openPromptContent();

      const prompt = screen.getByLabelText(
        "Generated prompt",
      ) as HTMLTextAreaElement;
      expect(prompt.value).not.toBe("");

      fireEvent.click(screen.getByRole("button", { name: "Copy prompt" }));

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(prompt.value);
      });
      expect(events).toContainEqual({
        name: "prompt_copy",
        payload: {
          locale: "en",
          topic_id: "love",
          card_count: 3,
          draw_style_id: "balanced",
          spread_id: "quick",
          style_id: "balanced",
          surface: "reading_result",
        },
      });
    } finally {
      window.removeEventListener("tarot_spark_event", listener);
    }
  });

  it("shows a cause-neutral failure message when prompt copy is blocked", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    Reflect.deleteProperty(navigator, "clipboard");
    document.execCommand = vi.fn(() => false);

    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: /Draw \d cards/ }));
    fireEvent.click(screen.getByRole("button", { name: "Copy prompt" }));

    await waitFor(() => {
      const failureMessage = screen.getByText(/copying did not work/i);
      expect(failureMessage).toBeInTheDocument();
      expect(failureMessage).not.toHaveTextContent(/permission/i);
    });
    const promptFallback = screen.getByLabelText("Generated prompt");
    expect(screen.getByTestId("prompt-content-disclosure")).toHaveAttribute(
      "open",
    );
    expect(promptFallback).toHaveFocus();
    expect(promptFallback).toHaveAttribute(
      "aria-describedby",
      "prompt-copy-failure",
    );
    expect(
      screen.getByRole("button", { name: "Copy prompt" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Share URL" })).toBeNull();

    const copyButton = screen.getByRole("button", {
      name: "Copy prompt",
    });
    copyButton.focus();
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(document.execCommand).toHaveBeenCalledTimes(2);
      expect(promptFallback).toHaveFocus();
    });
  });

  it("keeps share idle when native share is cancelled", async () => {
    const events: {
      readonly name: string;
      readonly payload: Record<string, unknown>;
    }[] = [];
    const listener = (event: Event) => {
      events.push((event as CustomEvent).detail);
    };
    const share = vi.fn(() =>
      Promise.reject(new DOMException("Share cancelled", "AbortError")),
    );
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });

    announceAnalyticsReady();
    renderDrawnReading();
    window.addEventListener("tarot_spark_event", listener);

    try {
      openShareOptions();
      fireEvent.click(screen.getByRole("button", { name: "Share" }));

      await act(async () => {
        await Promise.resolve();
      });

      expect(share).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByText(/that action could not be completed/i),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
      expect(events.filter(({ name }) => name === "share_click")).toHaveLength(
        1,
      );
      expect(events.filter(({ name }) => name === "share_result")).toEqual([
        {
          name: "share_result",
          payload: {
            locale: "en",
            topic_id: "love",
            card_count: 3,
            draw_style_id: "balanced",
            method: "native",
            outcome: "cancelled",
            spread_id: "quick",
            style_id: "balanced",
          },
        },
      ]);
    } finally {
      window.removeEventListener("tarot_spark_event", listener);
    }
  });

  it("keeps only the latest share feedback when an older action completes later", async () => {
    let resolveNativeShare: (() => void) | undefined;
    const share = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveNativeShare = resolve;
        }),
    );
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    renderDrawnReading();
    openShareOptions();
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy URL" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "URL copied" })).toBeVisible();
    });

    await act(async () => {
      resolveNativeShare?.();
      await Promise.resolve();
    });

    expect(screen.getByRole("button", { name: "URL copied" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Shared" })).toBeNull();
  });

  it("shows a cause-neutral failure message when native share fails", async () => {
    const share = vi.fn(() =>
      Promise.reject(new DOMException("Share failed", "NotAllowedError")),
    );
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn(() => Promise.resolve()) },
    });

    renderDrawnReading();

    openShareOptions();
    fireEvent.click(screen.getByRole("button", { name: "Share" }));

    await waitFor(() => {
      expect(screen.getByText(/sharing did not work/i)).toBeInTheDocument();
    });
    expect(share).toHaveBeenCalledTimes(1);
    const manualUrl = screen.getByRole("textbox", { name: "Share URL" });
    expect(screen.getByTestId("share-options-disclosure")).toHaveAttribute(
      "open",
    );
    expect(manualUrl).toHaveFocus();
    expect(manualUrl).toHaveAttribute("aria-describedby", "share-failure");
    const parsedUrl = new URL((manualUrl as HTMLInputElement).value);
    expect(parsedUrl.searchParams.get("source")).toBe("copy");
    expect(parsedUrl.searchParams.get("campaign")).toBe("vertical-slice");
    expect(parsedUrl.searchParams.has("context")).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Copy URL" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "URL copied" })).toBeVisible();
    });
    expect(screen.queryByRole("textbox", { name: "Share URL" })).toBeNull();
    expect(screen.queryByText(/sharing did not work/i)).toBeNull();
  });

  it("uses cause-neutral Korean failure copy", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    Reflect.deleteProperty(navigator, "clipboard");
    document.execCommand = vi.fn(() => false);

    render(<TarotExperience locale="ko" />);

    fireEvent.click(screen.getByRole("button", { name: /카드 \d장 뽑기/ }));
    fireEvent.click(screen.getByRole("button", { name: "질문 복사하기" }));

    await waitFor(() => {
      const failureMessage = screen.getByText(/질문을 복사하지 못했어요/);
      expect(failureMessage).toBeInTheDocument();
      expect(failureMessage).not.toHaveTextContent(/권한/);
    });
    expect(screen.getByLabelText("AI에 붙여 넣을 질문")).toHaveFocus();
    expect(screen.queryByRole("textbox", { name: "공유 URL" })).toBeNull();
  });

  it("labels fallback share as copied text", async () => {
    Reflect.deleteProperty(navigator, "share");
    document.execCommand = vi.fn(() => true);

    renderDrawnReading();

    openShareOptions();
    fireEvent.click(screen.getByRole("button", { name: "Share" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Copied share text" }),
      ).toBeInTheDocument();
    });
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  it("shares to KakaoTalk when a JavaScript key is configured", async () => {
    const init = vi.fn();
    const sendDefault = vi.fn();
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://tarot-spark.example";
    delete process.env["NEXT_PUBLIC_SHARE_SITE_URL"];
    process.env["NEXT_PUBLIC_KAKAO_ALLOWED_ORIGINS"] =
      "http://localhost:3000,https://tarot-spark.example";
    process.env["NEXT_PUBLIC_KAKAO_JS_KEY"] = "test-kakao-js-key";
    window.Kakao = {
      Share: {
        sendDefault,
      },
      init,
      isInitialized: vi.fn(() => false),
    };

    renderDrawnReading();
    const shareUrl = getExpectedShareUrl("kakao");

    openShareOptions();
    fireEvent.click(await screen.findByRole("button", { name: "KakaoTalk" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "KakaoTalk opened" }),
      ).toBeInTheDocument();
    });
    expect(init).toHaveBeenCalledWith("test-kakao-js-key");
    expect(sendDefault).toHaveBeenCalledWith({
      objectType: "text",
      text: "Love overview tarot prompt: The Fool, The Magician, The High Priestess",
      link: {
        mobileWebUrl: shareUrl,
        webUrl: shareUrl,
      },
    });
  });

  it("does not offer KakaoTalk without allowed Kakao origins", () => {
    const init = vi.fn();
    const sendDefault = vi.fn();
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://tarot-spark.example";
    delete process.env["NEXT_PUBLIC_SHARE_SITE_URL"];
    delete process.env["NEXT_PUBLIC_KAKAO_ALLOWED_ORIGINS"];
    process.env["NEXT_PUBLIC_KAKAO_JS_KEY"] = "test-kakao-js-key";
    window.Kakao = {
      Share: {
        sendDefault,
      },
      init,
      isInitialized: vi.fn(() => false),
    };

    renderDrawnReading();

    openShareOptions();

    expect(
      screen.queryByRole("button", { name: "KakaoTalk" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy URL" }),
    ).toBeInTheDocument();
    expect(init).not.toHaveBeenCalled();
    expect(sendDefault).not.toHaveBeenCalled();
    expect(document.getElementById(kakaoSdkScriptId)).toBeNull();
  });

  it("does not offer KakaoTalk when the current origin is not allowed", () => {
    const init = vi.fn();
    const sendDefault = vi.fn();
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://tarot-spark.example";
    delete process.env["NEXT_PUBLIC_SHARE_SITE_URL"];
    process.env["NEXT_PUBLIC_KAKAO_ALLOWED_ORIGINS"] =
      "https://tarot-spark.example";
    process.env["NEXT_PUBLIC_KAKAO_JS_KEY"] = "test-kakao-js-key";
    window.Kakao = {
      Share: {
        sendDefault,
      },
      init,
      isInitialized: vi.fn(() => false),
    };

    renderDrawnReading();

    openShareOptions();

    expect(
      screen.queryByRole("button", { name: "KakaoTalk" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy URL" }),
    ).toBeInTheDocument();
    expect(init).not.toHaveBeenCalled();
    expect(sendDefault).not.toHaveBeenCalled();
    expect(document.getElementById(kakaoSdkScriptId)).toBeNull();
  });

  it("copies the shareable reading URL", async () => {
    const writeText = vi.fn((text: string) => {
      void text;
      return Promise.resolve();
    });
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://tarot-spark.example";
    delete process.env["NEXT_PUBLIC_SHARE_SITE_URL"];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    renderDrawnReading();

    openShareOptions();
    fireEvent.click(screen.getByRole("button", { name: "Copy URL" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "URL copied" }),
      ).toBeInTheDocument();
    });
    const copiedUrl = writeText.mock.calls[0]?.[0];
    expect(copiedUrl).toBeDefined();

    const url = new URL(String(copiedUrl));
    expect(url.searchParams.get("topic")).toBe("love");
    expect(url.searchParams.get("cards")).toBe(
      "the-fool,the-magician,the-high-priestess",
    );
    expect(url.pathname).toBe("/share");
    expect(url.searchParams.get("source")).toBe("copy");
    expect(url.searchParams.get("campaign")).toBe("vertical-slice");
    expect(url.origin).toBe("https://tarot-spark.example");
  });

  it("copies the Instagram share URL", async () => {
    const writeText = vi.fn((text: string) => {
      void text;
      return Promise.resolve();
    });
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://tarot-spark.example";
    delete process.env["NEXT_PUBLIC_SHARE_SITE_URL"];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    renderDrawnReading();

    openShareOptions();
    fireEvent.click(
      screen.getByRole("button", { name: "Copy link for Instagram" }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Instagram link copied" }),
      ).toBeInTheDocument();
    });
    expect(writeText).toHaveBeenCalledWith(getExpectedShareUrl("instagram"));
  });

  it("loads the Kakao SDK script and allows retry after load failure", async () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://tarot-spark.example";
    delete process.env["NEXT_PUBLIC_SHARE_SITE_URL"];
    process.env["NEXT_PUBLIC_KAKAO_ALLOWED_ORIGINS"] =
      "http://localhost:3000,https://tarot-spark.example";
    process.env["NEXT_PUBLIC_KAKAO_JS_KEY"] = "test-kakao-js-key";

    renderDrawnReading();

    openShareOptions();
    fireEvent.click(await screen.findByRole("button", { name: "KakaoTalk" }));

    const firstScript = document.getElementById(
      kakaoSdkScriptId,
    ) as HTMLScriptElement | null;
    expect(firstScript).not.toBeNull();
    expect(firstScript?.crossOrigin).toBe("anonymous");
    expect(firstScript?.integrity).toBe(kakaoSdkIntegrity);
    expect(firstScript?.src).toBe(kakaoSdkScriptUrl);

    fireEvent.error(firstScript as HTMLScriptElement);

    await waitFor(() => {
      expect(screen.getByText(/sharing did not work/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("textbox", { name: "Share URL" })).toHaveValue(
      getExpectedShareUrl("copy"),
    );
    expect(document.getElementById(kakaoSdkScriptId)).toBeNull();

    const init = vi.fn();
    const sendDefault = vi.fn();
    fireEvent.click(screen.getByRole("button", { name: "KakaoTalk" }));

    const secondScript = document.getElementById(
      kakaoSdkScriptId,
    ) as HTMLScriptElement | null;
    expect(secondScript).not.toBeNull();
    expect(secondScript).not.toBe(firstScript);

    window.Kakao = {
      Share: {
        sendDefault,
      },
      init,
      isInitialized: vi.fn(() => false),
    };
    fireEvent.load(secondScript as HTMLScriptElement);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "KakaoTalk opened" }),
      ).toBeInTheDocument();
    });
    expect(init).toHaveBeenCalledWith("test-kakao-js-key");
    expect(sendDefault).toHaveBeenCalledTimes(1);
  });
});

function renderDrawnReading() {
  vi.spyOn(Math, "random").mockReturnValue(0);

  render(<Home />);
  fireEvent.click(screen.getByRole("button", { name: /Draw \d cards/ }));
}

function openReadingPreferences() {
  fireEvent.click(screen.getByTestId("reading-preferences-toggle"));
}

function openSituationContext() {
  fireEvent.click(screen.getByTestId("situation-context-toggle"));
}

function openPromptContent() {
  fireEvent.click(
    within(screen.getByTestId("prompt-content-disclosure")).getByText(
      /View prompt|질문 내용 보기/,
    ),
  );
}

function openShareOptions() {
  fireEvent.click(
    within(screen.getByTestId("share-options-disclosure")).getByText(
      /View sharing options|공유 방법 보기/,
    ),
  );
}

function setReadingResultIntersection(isIntersecting: boolean) {
  act(() => {
    for (const observer of testIntersectionObservers) {
      observer.emit(isIntersecting);
    }
  });
}

class TestIntersectionObserver {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly thresholds = [0.01];
  private readonly targets = new Set<Element>();

  constructor(private readonly callback: IntersectionObserverCallback) {
    testIntersectionObservers.add(this);
  }

  disconnect() {
    this.targets.clear();
    testIntersectionObservers.delete(this);
  }

  observe(target: Element) {
    this.targets.add(target);
  }

  observes(target: Element) {
    return this.targets.has(target);
  }

  takeRecords() {
    return [];
  }

  unobserve(target: Element) {
    this.targets.delete(target);
  }

  emit(isIntersecting: boolean) {
    const entries = [...this.targets].map((target) => ({
      intersectionRatio: isIntersecting ? 1 : 0,
      isIntersecting,
      target,
    })) as IntersectionObserverEntry[];

    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

function getExpectedShareUrl(
  source: "copy" | "instagram" | "kakao",
  origin = "https://tarot-spark.example",
) {
  return `${origin}/share?topic=love&cards=the-fool%2Cthe-magician%2Cthe-high-priestess&source=${source}&campaign=vertical-slice`;
}

function createValidInstantReading() {
  return {
    text: `[전체 흐름]
새로운 가능성과 분명한 표현이 함께 필요하지만 확인하지 않은 부분은 현실의 대화로 살펴야 기대와 관찰을 구분할 수 있습니다.
[카드별 흐름]
1. 새로운 시도를 열어 두되 아직 확인하지 않은 기대를 사실처럼 단정하지 않는 태도를 살펴봅니다.
2. 표현할 수 있는 선택과 자원을 구체적으로 사용하면 원하는 경계를 더 분명히 전할 수 있습니다.
3. 아픈 감정을 서둘러 지우기보다 실제로 확인한 행동과 해석을 나누어 바라볼 필요가 있습니다.
[가장 강한 연결]
열린 가능성과 능동적인 표현이 서로 힘을 보태지만 감정을 건너뛰면 속도가 현실보다 앞설 수 있다는 긴장이 두드러집니다.
[가능성 A]
서로 표현하는 속도가 달라서 같은 행동을 다르게 받아들이며 불확실성이 커졌을 수 있습니다.
[가능성 B]
기대가 실제로 확인한 신호보다 앞서서 관계의 빈칸을 스스로 채우고 있을 수 있습니다.
[현실 확인]
아직 모르는 점: 현재 정보만으로는 서로 같은 기대와 관계의 속도를 원하는지 알 수 없습니다.
관찰할 점: 다음 대화에서 질문에 대한 답과 이후 행동이 일정하게 이어지는지 살펴보세요.
다시 볼 조건: 말과 행동이 계속 어긋나면 두 가능성을 모두 내려놓고 다시 살펴보세요.
[다음 행동]
작은 행동: 부담이 적은 질문 하나를 골라 서로 확인할 수 있는 범위에서 짧게 대화해 보세요.
멈추거나 다시 볼 조건: 대화가 반복해서 경계를 넘거나 일상에 큰 비용을 만들면 이 행동을 멈추고 다시 판단하세요.
[성찰 질문]
지금 내가 기대와 실제 관찰을 구분하기 위해 가장 먼저 확인할 수 있는 것은 무엇인가요?`,
  };
}
