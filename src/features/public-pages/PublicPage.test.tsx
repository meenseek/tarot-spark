import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PublicPage, getPublicPageMetadata, getPublicPagePath } from ".";

const originalSiteUrl = process.env["NEXT_PUBLIC_SITE_URL"];
const testSiteOrigin = "https://tarot-spark.example";

describe("PublicPage", () => {
  afterEach(() => {
    cleanup();
    restoreEnv("NEXT_PUBLIC_SITE_URL", originalSiteUrl);
  });

  it("renders English privacy content and public navigation", () => {
    render(<PublicPage locale="en" pageId="privacy" />);

    expect(
      screen.getByRole("heading", {
        name: "Privacy Policy",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/does not require an account/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/for up to 60 seconds/i)).toBeVisible();
    expect(screen.getByText(/Google AdSense and its partners/i)).toBeVisible();
    expect(screen.getByText(/sent.*to Cloudflare Workers AI/i)).toBeVisible();
    expect(screen.queryByText(/Google Gemini API/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "href",
      "/about",
    );
    expect(screen.getByRole("link", { name: "한국어" })).toHaveAttribute(
      "href",
      "/ko/privacy",
    );
  });

  it("renders Korean disclaimer content", () => {
    render(<PublicPage locale="ko" pageId="disclaimer" />);

    expect(
      screen.getByRole("heading", {
        name: "면책 고지",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/전문가의 판단이 필요한 일/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute(
      "href",
      "/disclaimer",
    );
  });

  it("renders the English three-card method before its CTA", () => {
    render(<PublicPage locale="en" pageId="three-card-tarot-reading" />);

    expect(
      screen.getByRole("heading", {
        name: /how to read three tarot cards/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Worked example: The Lovers, Two of Swords, The Star",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Alternative A: trust is rebuilding/i),
    ).toBeVisible();
    expect(screen.getByText(/What to check:/i)).toBeVisible();
    expect(
      screen.getByText(/Tarot interpretations are not evidence of facts/i),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Draw three cards" }),
    ).toHaveAttribute("href", "/?spread=quick");
    expect(
      screen.getByRole("link", { name: "Read card combinations" }),
    ).toHaveAttribute("href", "/tarot-card-combinations");
  });

  it("keeps the Korean question and combination guides equivalent", () => {
    render(<PublicPage locale="ko" pageId="how-to-ask-tarot-questions" />);

    expect(
      screen.getByRole("heading", { name: "전체 예시: 탑, 펜타클 8, 절제" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/서로 다른 필요를/i)).toBeVisible();
    expect(
      screen.getByText(/카드들이 가장 강하게 시사하는 답은 무엇이고/i),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "카드 뽑으러 가기" }),
    ).not.toBeInTheDocument();

    cleanup();
    render(<PublicPage locale="ko" pageId="tarot-card-combinations" />);
    expect(
      screen.getByRole("heading", { name: "전체 예시: 컵 5, 완드 2, 은둔자" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /6장 전체 예시: 달, 소드 에이스, 펜타클 3/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/가장 강한 상징적 답이 현실 확인보다 먼저/i),
    ).toBeVisible();
    expect(
      screen.getByText(/두 해석을 버리고 질문을 다시 엽니다/i),
    ).toBeVisible();
  });

  it.each([
    {
      locale: "en" as const,
      answer:
        /^What the cards suggest: rather than predicting a ruined future/i,
      material: /^Interpretation material: The Tower means disruption/i,
      formula: /what the cards suggest first.*two different ways to read them/i,
      feedbackCheck: /^What to check: ask for one round of feedback/i,
      feedbackRevision:
        /^When to reconsider: if the feedback identifies a preparation gap.*role requirement that conflicts with your needs/i,
    },
    {
      locale: "ko" as const,
      answer: /^카드가 시사하는 답: 이번 실패가 미래를 정한다기보다/i,
      material: /^해석 재료: 탑은 재난의 예고가 아니라/i,
      formula: /카드가 시사하는 답을 먼저 묻고.*해석 두 가지/u,
      feedbackCheck:
        /^직접 확인할 일: 지원서나 작업물에 대한 피드백을 한 번 받고/u,
      feedbackRevision:
        /^해석을 다시 볼 때: 피드백에서 준비의 빈틈이 보이면.*내 필요와 맞지 않는 역할 조건이 드러나면/u,
    },
  ])(
    "answers the $locale question-guide example before explaining card meanings",
    ({
      locale,
      answer,
      material,
      formula,
      feedbackCheck,
      feedbackRevision,
    }) => {
      render(
        <PublicPage locale={locale} pageId="how-to-ask-tarot-questions" />,
      );

      const answerParagraph = screen.getByText(answer);
      const materialParagraph = screen.getByText(material);
      expect(screen.getByText(formula)).toBeVisible();
      expect(screen.getByText(feedbackCheck)).toBeVisible();
      expect(screen.getByText(feedbackRevision)).toBeVisible();
      expect(answerParagraph).toBeVisible();
      expect(
        answerParagraph.compareDocumentPosition(materialParagraph) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    },
  );

  it("describes the editorial method in plain public language", () => {
    render(<PublicPage locale="en" pageId="about" />);

    expect(
      screen.getByRole("heading", { name: "Standards behind the guides" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/may both fit—or neither may.*checked in real life/i),
    ).toBeVisible();
    expect(screen.getByText(/reversible step.*stop or review/i)).toBeVisible();
    expect(
      screen.queryByText(/non-exclusive|non-exhaustive|content editions/i),
    ).not.toBeInTheDocument();

    cleanup();
    render(<PublicPage locale="ko" pageId="about" />);
    expect(
      screen.getByRole("heading", { name: "가이드가 지키는 기준" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/함께 맞을 수도 있고 둘 다 아닐 수도 있는.*현실/),
    ).toBeVisible();
    expect(
      screen.queryByText(/비배타적|비완전|독립적인 중단 조건|콘텐츠 판/),
    ).not.toBeInTheDocument();
  });

  it("states the Korean privacy boundaries without overstating optional services", () => {
    render(<PublicPage locale="ko" pageId="privacy" />);

    expect(screen.getByText(/계정을 만들 필요가 없습니다/i)).toBeVisible();
    expect(screen.getByText(/같은 탭.*최대 60초 동안/i)).toBeVisible();
    expect(
      screen.getByText(/설명 복원을 완료하면 삭제되고.*60초 안에 만료/i),
    ).toBeVisible();
    expect(
      screen.getByText(/클립보드에 복사하는 것만으로는 외부 서비스/i),
    ).toBeVisible();
    expect(
      screen.getByText(/유효한 Google Analytics 측정 ID.*기본으로 켜집니다/i),
    ).toBeVisible();
    expect(
      screen.getByText(/EEA·영국·스위스.*Google 인증 지역 CMP/i),
    ).toBeVisible();
    expect(
      screen.getByText(/공개 성찰 질문의 미리 작성된 초점 문구/i),
    ).toBeVisible();
    expect(screen.getByText(/Cloudflare Workers AI에 보내/i)).toBeVisible();
    expect(screen.queryByText(/Google Gemini API/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /사용자가 직접 작성한 자유 형식 질문은 보내지 않습니다/i,
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        /기능 사용 이벤트와 함께 보내는 값은.*자유 형식 질문이나 상황 설명.*포함하지 않습니다/i,
      ),
    ).toBeVisible();
    expect(screen.getByText(/공개 질문 프리셋의 고정 ID/i)).toBeVisible();
    expect(screen.getByText(/Vercel에서 호스팅될 수 있습니다/i)).toBeVisible();
    expect(screen.getByText(/별도의 광고 스크립트 설정/i)).toBeVisible();
    expect(
      screen.getByText(/\/relationship-flow, \/ko\/relationship-flow/i),
    ).toBeVisible();
    expect(
      screen.getByText(/브라우저가 로컬 저장소를 지원하면/i),
    ).toBeVisible();
  });

  it("keeps metadata and paths localized", () => {
    process.env["NEXT_PUBLIC_SITE_URL"] = testSiteOrigin;

    expect(getPublicPageMetadata("en", "contact")).toMatchObject({
      title: "Contact tarot-spark",
      alternates: {
        canonical: testSiteUrl("/contact"),
        languages: {
          en: testSiteUrl("/contact"),
          ko: testSiteUrl("/ko/contact"),
          "x-default": testSiteUrl("/contact"),
        },
      },
    });
    expect(getPublicPageMetadata("ko", "contact")).toMatchObject({
      title: "tarot-spark 문의",
      alternates: {
        canonical: testSiteUrl("/ko/contact"),
        languages: {
          en: testSiteUrl("/contact"),
          ko: testSiteUrl("/ko/contact"),
          "x-default": testSiteUrl("/contact"),
        },
      },
    });
    expect(getPublicPagePath("en", "contact")).toBe("/contact");
    expect(getPublicPagePath("ko", "contact")).toBe("/ko/contact");
    expect(getPublicPagePath("en", "tarot-card-combinations")).toBe(
      "/tarot-card-combinations",
    );
    expect(getPublicPagePath("ko", "tarot-card-combinations")).toBe(
      "/ko/tarot-card-combinations",
    );
  });
});

function testSiteUrl(pathname = "/") {
  return new URL(pathname, testSiteOrigin).toString();
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
