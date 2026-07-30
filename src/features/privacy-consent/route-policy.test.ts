import { describe, expect, it } from "vitest";
import { isAdvertisingEligiblePathname } from "./route-policy";

describe("advertising route policy", () => {
  it.each(["/relationship-flow", "/ko/relationship-flow"])(
    "allows reviewed content route %s",
    (pathname) => {
      expect(isAdvertisingEligiblePathname(pathname)).toBe(true);
    },
  );

  it.each([
    "/",
    "/ko",
    "/share",
    "/ko/share",
    "/daily",
    "/ko/daily",
    "/about",
    "/ko/about",
    "/contact",
    "/ko/contact",
    "/disclaimer",
    "/ko/disclaimer",
    "/privacy",
    "/ko/privacy",
    "/ja/relationship-flow",
    "/relationship-flow/extra",
  ])("rejects route %s by default", (pathname) => {
    expect(isAdvertisingEligiblePathname(pathname)).toBe(false);
  });
});
