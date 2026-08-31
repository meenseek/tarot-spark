import { describe, expect, it } from "vitest";
import {
  isLocalizedSecondLevelPathSegment,
  localizedSecondLevelPathSegments,
} from "./routing";

describe("localized route policy", () => {
  it("keeps every supported second-level route in the proxy allowlist", () => {
    expect(localizedSecondLevelPathSegments).toEqual([
      "three-card-tarot-reading",
      "how-to-ask-tarot-questions",
      "tarot-card-combinations",
      "about",
      "privacy",
      "contact",
      "disclaimer",
      "tarot-questions",
      "relationship-tarot-questions",
      "daily",
      "relationship-flow",
      "share",
    ]);

    for (const pathSegment of localizedSecondLevelPathSegments) {
      expect(isLocalizedSecondLevelPathSegment(pathSegment)).toBe(true);
    }
  });

  it("rejects unsupported or nested route segments", () => {
    expect(isLocalizedSecondLevelPathSegment("terms")).toBe(false);
    expect(isLocalizedSecondLevelPathSegment("share/extra")).toBe(false);
  });
});
