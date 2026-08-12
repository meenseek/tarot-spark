import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Link from "next/link";
import { afterEach, describe, expect, it } from "vitest";
import { SiteShell } from "./SiteShell";

describe("SiteShell", () => {
  afterEach(cleanup);

  it("owns the canonical public frame and accessible site landmarks", () => {
    render(
      <SiteShell
        brand="tarot-spark"
        brandHref="/"
        footerAriaLabel="Page navigation"
        footerLinks={[
          { href: "/about", label: "About" },
          { href: "/privacy", label: "Privacy" },
        ]}
        localeControl={<Link href="/ko">한국어</Link>}
        skipToContentLabel="Skip to main content"
      >
        <article>Page content</article>
      </SiteShell>,
    );

    expect(screen.getByTestId("site-shell")).toHaveClass(
      "min-h-screen",
      "bg-ts-canvas",
    );
    const main = screen.getByRole("main");
    const skipLink = screen.getByRole("link", {
      name: "Skip to main content",
    });

    expect(screen.getAllByRole("link")[0]).toBe(skipLink);
    expect(skipLink).toHaveAttribute("href", "#site-main-content");
    expect(skipLink).toHaveClass("ts-skip-link");
    expect(main).toHaveAttribute("id", "site-main-content");
    expect(main).toHaveAttribute("tabindex", "-1");
    expect(main).toHaveAttribute("data-testid", "site-main");
    expect(screen.getByRole("banner")).toHaveAttribute(
      "data-testid",
      "site-header",
    );
    expect(screen.getByRole("contentinfo")).toHaveAttribute(
      "data-testid",
      "site-footer",
    );
    expect(screen.getByRole("link", { name: "tarot-spark" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "한국어" })).toHaveAttribute(
      "href",
      "/ko",
    );
    expect(
      screen.getByRole("navigation", { name: "Page navigation" }),
    ).toContainElement(screen.getByRole("link", { name: "Privacy" }));
    expect(screen.getByTestId("site-frame")).toHaveClass(
      "max-w-6xl",
      "px-5",
      "sm:px-8",
    );
    expect(screen.getByTestId("site-footer")).toHaveClass(
      "border-t",
      "border-ts-divider",
    );
  });
});
