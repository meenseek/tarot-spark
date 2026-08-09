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
    expect(screen.getByText(/Google AdSense and its partners/i)).toBeVisible();
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

  it("renders a complete English three-card method before its CTA", () => {
    render(<PublicPage locale="en" pageId="three-card-tarot-reading" />);

    expect(
      screen.getByRole("heading", {
        name: /complete three-card tarot reading/i,
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
    expect(screen.getByText(/Observable discriminator:/i)).toBeVisible();
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
      screen.queryByRole("link", { name: "카드 뽑으러 가기" }),
    ).not.toBeInTheDocument();

    cleanup();
    render(<PublicPage locale="ko" pageId="tarot-card-combinations" />);
    expect(
      screen.getByRole("heading", { name: "전체 예시: 컵 5, 완드 2, 은둔자" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/관찰 기준:/i)).toBeVisible();
  });

  it("describes the editorial method without calling the product an MVP", () => {
    render(<PublicPage locale="en" pageId="about" />);

    expect(
      screen.getByRole("heading", { name: "How guide content is made" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/early MVP/i)).not.toBeInTheDocument();
  });

  it("states the Korean privacy boundaries without overstating optional services", () => {
    render(<PublicPage locale="ko" pageId="privacy" />);

    expect(screen.getByText(/계정을 만들 필요가 없습니다/i)).toBeVisible();
    expect(screen.getByText(/같은 탭에서 최대 60초 동안/i)).toBeVisible();
    expect(
      screen.getByText(/클립보드에 복사하는 것만으로는 외부 서비스/i),
    ).toBeVisible();
    expect(
      screen.getByText(/유효한 측정 ID가 설정되어 있고.*허용한 경우에만/i),
    ).toBeVisible();
    expect(
      screen.getByText(/공개 성찰 질문의 미리 작성된 초점 문구/i),
    ).toBeVisible();
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
