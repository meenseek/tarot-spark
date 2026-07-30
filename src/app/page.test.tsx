import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TarotExperience } from "@/features/tarot-reading";
import Home from "./(root)/page";

const originalExecCommand = document.execCommand;
const originalClipboard = navigator.clipboard;
const originalKakao = window.Kakao;
const originalKakaoAllowedOrigins =
  process.env["NEXT_PUBLIC_KAKAO_ALLOWED_ORIGINS"];
const originalKakaoJavaScriptKey = process.env["NEXT_PUBLIC_KAKAO_JS_KEY"];
const originalSiteUrl = process.env["NEXT_PUBLIC_SITE_URL"];
const originalShareSiteUrl = process.env["NEXT_PUBLIC_SHARE_SITE_URL"];
const originalUrl = window.location.href;
const originalShare = navigator.share;
const kakaoSdkScriptId = "kakao-javascript-sdk";
const kakaoSdkScriptUrl =
  "https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js";
const kakaoSdkIntegrity =
  "sha384-OL+ylM/iuPLtW5U3XcvLSGhE8JzReKDank5InqlHGWPhb4140/yrBw0bg0y7+C9J";

describe("Home", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    restoreEnv(
      "NEXT_PUBLIC_KAKAO_ALLOWED_ORIGINS",
      originalKakaoAllowedOrigins,
    );
    restoreEnv("NEXT_PUBLIC_KAKAO_JS_KEY", originalKakaoJavaScriptKey);
    restoreEnv("NEXT_PUBLIC_SITE_URL", originalSiteUrl);
    restoreEnv("NEXT_PUBLIC_SHARE_SITE_URL", originalShareSiteUrl);
    document.getElementById(kakaoSdkScriptId)?.remove();
    window.history.replaceState(null, "", originalUrl);
    window.sessionStorage.clear();

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
    expect(
      screen.getByText(/current deck: 12-card Major Arcana preview/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/entertainment and self-reflection only/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
  });

  it("renders Korean localized content", () => {
    render(<TarotExperience locale="ko" />);

    expect(
      screen.getByRole("heading", {
        name: "나의 상황과 타로 스프레드를 더 선명한 AI 프롬프트로 만드세요.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "카드 뽑기",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/현재 덱: 메이저 아르카나 미리보기 12장/),
    ).toBeInTheDocument();
    expect(screen.getByText(/의료, 법률, 재정/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "개인정보" })).toHaveAttribute(
      "href",
      "/ko/privacy",
    );
  });

  it("labels the Korean Instagram action as a link copy", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    Reflect.deleteProperty(navigator, "clipboard");
    document.execCommand = vi.fn(() => true);

    render(<TarotExperience locale="ko" />);

    fireEvent.click(screen.getByRole("button", { name: "카드 뽑기" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Instagram용 링크 복사" }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Instagram용 링크 복사됨" }),
      ).toBeInTheDocument();
    });
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  it("shows the localized deterministic interpretation lens in Korean", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    render(<TarotExperience locale="ko" />);

    fireEvent.click(screen.getByRole("button", { name: "카드 뽑기" }));

    expect(
      screen.getByText("해석 관점: 선택과 주도성", { selector: "p" }),
    ).toBeInTheDocument();

    const prompt = screen.getByLabelText(
      "생성된 프롬프트",
    ) as HTMLTextAreaElement;

    expect(prompt.value).toContain("해석 관점: 선택과 주도성");
    expect(prompt.value).toContain("카드별 해석 각도:");
    expect(prompt.value).toContain("하나의 연결된 패턴");
  });

  it("draws cards and generates a copyable prompt", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    render(<Home />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Draw cards",
      }),
    );

    expect(screen.getByText("Spark: The Fool")).toBeInTheDocument();
    expect(screen.getByText("Shadow: The Magician")).toBeInTheDocument();
    expect(
      screen.getByText("Next step: The High Priestess"),
    ).toBeInTheDocument();

    const prompt = screen.getByLabelText(
      "Generated prompt",
    ) as HTMLTextAreaElement;

    expect(prompt.value).toContain("Topic: Love");
    expect(prompt.value).toContain("Act as a reflective tarot writing partner");
    expect(prompt.value).toContain("Card-specific angle:");
    expect(prompt.value).toContain("Interpretation lens:");
    expect(prompt.value).toContain("one connected pattern");
    expect(
      screen.getByText("Interpretation lens: Choice and agency", {
        selector: "p",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Copy prompt",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Share",
      }),
    ).toBeInTheDocument();
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

  it("restores a shared reading from URL parameters", async () => {
    window.history.replaceState(
      null,
      "",
      "/?topic=reunion&cards=the-fool,the-magician,the-high-priestess",
    );

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText("Spark: The Fool")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Reunion 3 cards" }),
    ).toHaveAttribute("aria-pressed", "true");

    const prompt = screen.getByLabelText(
      "Generated prompt",
    ) as HTMLTextAreaElement;
    expect(prompt.value).toContain("Topic: Reunion");
    expect(prompt.value).toContain("The High Priestess");
    const interpretationLens = prompt.value.match(
      /Interpretation lens: (.+)/,
    )?.[1];
    expect(interpretationLens).toBeTruthy();
    expect(
      screen.getByText(`Interpretation lens: ${interpretationLens}`),
    ).toBeInTheDocument();
  });

  it("builds a contextual direct six-card prompt without exposing context", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    render(<Home />);

    fireEvent.click(screen.getByRole("radio", { name: /Deep 6-card/ }));
    fireEvent.click(
      screen.getByRole("radio", {
        name: /Direct, not deterministic/,
      }),
    );
    fireEvent.change(
      screen.getByRole("textbox", {
        name: /Situation or relationship context/,
      }),
      {
        target: {
          value:
            "My relationship with my manager is exhausting. Should I stay at this company?",
        },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Draw cards" }));

    const prompt = screen.getByLabelText(
      "Generated prompt",
    ) as HTMLTextAreaElement;
    expect(prompt.value).toContain("Deep six-card spread");
    expect(prompt.value).toContain("Reading style: Direct, not deterministic");
    expect(prompt.value).toContain(
      '"My relationship with my manager is exhausting. Should I stay at this company?"',
    );
    expect(prompt.value).toContain("untrusted reference data");
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

    fireEvent.change(
      screen.getByRole("textbox", {
        name: /Situation or relationship context/,
      }),
      {
        target: {
          value: "My manager relationship is difficult.",
        },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Draw cards" }));

    const koreanLink = screen.getByRole("link", { name: "한국어" });
    const koreanHref = koreanLink.getAttribute("href");
    expect(koreanHref).toContain("topic=love");
    expect(koreanHref).toContain("cards=");
    expect(koreanHref).not.toContain("manager");
    fireEvent.click(koreanLink);

    expect(window.sessionStorage.length).toBe(1);
    cleanup();
    window.history.replaceState(null, "", koreanHref ?? "/ko");
    render(<TarotExperience locale="ko" />);

    await waitFor(() => {
      expect(
        screen.getByRole("textbox", {
          name: /상황 또는 관계 맥락/,
        }),
      ).toHaveValue("My manager relationship is difficult.");
    });
    expect(window.sessionStorage.length).toBe(0);
    expect(
      (screen.getByLabelText("생성된 프롬프트") as HTMLTextAreaElement).value,
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

    fireEvent.click(screen.getByRole("button", { name: "Draw cards" }));

    const url = new URL(window.location.href);
    expect([...url.searchParams.keys()].sort()).toEqual(["cards", "topic"]);
    expect(url.hash).toBe("");
  });

  it("emits behavior analytics with stable ids", () => {
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
      render(<Home />);

      fireEvent.click(screen.getByRole("button", { name: "Reunion 3 cards" }));
      fireEvent.click(screen.getByRole("button", { name: "Draw cards" }));

      expect(events).toContainEqual({
        name: "topic_click",
        payload: { locale: "en", topic_id: "reunion" },
      });
      expect(events).toContainEqual({
        name: "draw_start",
        payload: {
          locale: "en",
          topic_id: "reunion",
          spread_id: "quick",
          style_id: "balanced",
        },
      });
      expect(events).toContainEqual({
        name: "card_selected",
        payload: {
          locale: "en",
          topic_id: "reunion",
          position_id: "spark",
          card_id: "the-fool",
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
          spread_id: "quick",
          style_id: "balanced",
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

    fireEvent.click(screen.getByRole("button", { name: "Draw cards" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy prompt" }));

    await waitFor(() => {
      const failureMessage = screen.getByText(
        /that action could not be completed/i,
      );
      expect(failureMessage).toBeInTheDocument();
      expect(failureMessage).not.toHaveTextContent(/permission/i);
    });
    expect(
      screen.getByRole("button", { name: "Copy prompt" }),
    ).toBeInTheDocument();
  });

  it("keeps share idle when native share is cancelled", async () => {
    const share = vi.fn(() =>
      Promise.reject(new DOMException("Share cancelled", "AbortError")),
    );
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });

    renderDrawnReading();

    fireEvent.click(screen.getByRole("button", { name: "Share" }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(share).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText(/that action could not be completed/i),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
  });

  it("shows a cause-neutral failure message when native share fails", async () => {
    const share = vi.fn(() =>
      Promise.reject(new DOMException("Share failed", "NotAllowedError")),
    );
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share,
    });

    renderDrawnReading();

    fireEvent.click(screen.getByRole("button", { name: "Share" }));

    await waitFor(() => {
      expect(
        screen.getByText(/that action could not be completed/i),
      ).toBeInTheDocument();
    });
    expect(share).toHaveBeenCalledTimes(1);
  });

  it("uses cause-neutral Korean failure copy", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    Reflect.deleteProperty(navigator, "clipboard");
    document.execCommand = vi.fn(() => false);

    render(<TarotExperience locale="ko" />);

    fireEvent.click(screen.getByRole("button", { name: "카드 뽑기" }));
    fireEvent.click(screen.getByRole("button", { name: "프롬프트 복사" }));

    await waitFor(() => {
      const failureMessage = screen.getByText(/작업을 완료하지 못했습니다/);
      expect(failureMessage).toBeInTheDocument();
      expect(failureMessage).not.toHaveTextContent(/권한/);
    });
  });

  it("labels fallback share as copied text", async () => {
    Reflect.deleteProperty(navigator, "share");
    document.execCommand = vi.fn(() => true);

    renderDrawnReading();

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
    const shareUrl = getExpectedShareUrl();

    fireEvent.click(await screen.findByRole("button", { name: "KakaoTalk" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "KakaoTalk opened" }),
      ).toBeInTheDocument();
    });
    expect(init).toHaveBeenCalledWith("test-kakao-js-key");
    expect(sendDefault).toHaveBeenCalledWith({
      objectType: "text",
      text: "Love tarot prompt: The Fool, The Magician, The High Priestess",
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

    fireEvent.click(
      screen.getByRole("button", { name: "Copy link for Instagram" }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Instagram link copied" }),
      ).toBeInTheDocument();
    });
    expect(writeText).toHaveBeenCalledWith(getExpectedShareUrl());
  });

  it("loads the Kakao SDK script and allows retry after load failure", async () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = "https://tarot-spark.example";
    delete process.env["NEXT_PUBLIC_SHARE_SITE_URL"];
    process.env["NEXT_PUBLIC_KAKAO_ALLOWED_ORIGINS"] =
      "http://localhost:3000,https://tarot-spark.example";
    process.env["NEXT_PUBLIC_KAKAO_JS_KEY"] = "test-kakao-js-key";

    renderDrawnReading();

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
      expect(
        screen.getByText(/that action could not be completed/i),
      ).toBeInTheDocument();
    });
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
  fireEvent.click(screen.getByRole("button", { name: "Draw cards" }));
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

function getExpectedShareUrl(origin = "https://tarot-spark.example") {
  return `${origin}/?topic=love&cards=the-fool%2Cthe-magician%2Cthe-high-priestess`;
}
