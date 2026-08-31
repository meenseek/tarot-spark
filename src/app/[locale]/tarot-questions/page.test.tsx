import { describe, expect, it, vi } from "vitest";

const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({ notFound }));

import LocalizedPublicQuestionExplorerPage, {
  generateMetadata,
  generateStaticParams,
} from "./page";

describe("localized tarot question catalog route", () => {
  it("generates only supported prefixed locales", () => {
    expect(generateStaticParams()).toEqual([{ locale: "ko" }]);
  });

  it("returns no metadata and a 404 for an unsupported locale", async () => {
    const params = Promise.resolve({ locale: "ja" });

    await expect(generateMetadata({ params })).resolves.toEqual({});
    await expect(
      LocalizedPublicQuestionExplorerPage({ params }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
  });
});
