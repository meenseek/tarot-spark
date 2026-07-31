import { describe, expect, it } from "vitest";
import { getPrivacyConsentCopy } from "./i18n";

describe("privacy consent copy", () => {
  it("makes optional services and a usable reject choice clear in Korean", () => {
    const copy = getPrivacyConsentCopy("ko");

    expect(copy.body).toContain("모두 거부해도 카드 리딩");
    expect(copy.analyticsDescription).toContain("허용하면");
    expect(copy.analyticsDescription).toContain("제한적으로 측정");
    expect(copy.advertisingDescription).toContain(
      "허용하고 Google AdSense가 설정된 경우에만",
    );
    expect(copy.advertisingDescription).toContain("관계 흐름 소개 페이지");
    expect(copy.rejectOptional).toBe("모두 거부");
  });
});
