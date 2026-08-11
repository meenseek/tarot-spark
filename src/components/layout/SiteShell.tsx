import type { ReactNode } from "react";
import { SiteFooter, type SiteFooterLink } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

type SiteShellProps = {
  readonly brand: string;
  readonly brandHref: string;
  readonly children: ReactNode;
  readonly footerAriaLabel: string;
  readonly footerLinks: readonly SiteFooterLink[];
  readonly localeControl: ReactNode;
};

export function SiteShell({
  brand,
  brandHref,
  children,
  footerAriaLabel,
  footerLinks,
  localeControl,
}: SiteShellProps) {
  return (
    <div
      className="min-h-screen bg-ts-canvas text-ts-ink"
      data-testid="site-shell"
    >
      <div
        className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:py-10"
        data-testid="site-frame"
      >
        <SiteHeader
          brand={brand}
          brandHref={brandHref}
          localeControl={localeControl}
        />
        <main
          className="flex flex-1 flex-col bg-ts-canvas"
          data-testid="site-main"
        >
          {children}
        </main>
        <SiteFooter ariaLabel={footerAriaLabel} links={footerLinks} />
      </div>
    </div>
  );
}
