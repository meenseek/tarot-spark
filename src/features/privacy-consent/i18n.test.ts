import { describe, expect, it } from "vitest";
import { getPrivacyConsentCopy } from "./i18n";

describe("privacy consent copy", () => {
  it("makes optional services and a usable reject choice clear in Korean", () => {
    const copy = getPrivacyConsentCopy("ko");

    expect(copy.body).toContain("모두 거부해도 카드 리딩");
    expect(copy.body).toContain("EEA·영국·스위스");
    expect(copy.analyticsDescription).toContain("제한적인");
    expect(copy.analyticsDescription).toContain("지역 동의 설정");
    expect(copy.advertisingDescription).toContain(
      "Google AdSense가 설정된 경우",
    );
    expect(copy.advertisingDescription).toContain("검토된 관계 콘텐츠 페이지");
    expect(copy.rejectOptional).toBe("필수만 사용");
  });
});
