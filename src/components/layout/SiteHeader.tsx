import Link from "next/link";
import type { ReactNode } from "react";
import { brandLinkClassName } from "@/components/visual/class-names";

type SiteHeaderProps = {
  readonly brand: string;
  readonly brandHref: string;
  readonly brandNavigation?: "client" | "document";
  readonly localeControl: ReactNode;
};

export function SiteHeader({
  brand,
  brandHref,
  brandNavigation = "client",
  localeControl,
}: SiteHeaderProps) {
  const BrandLink = brandNavigation === "document" ? "a" : Link;

  return (
    <header
      className="flex flex-col gap-4 border-b border-ts-divider pb-6 sm:flex-row sm:items-center sm:justify-between"
      data-testid="site-header"
    >
      <BrandLink className={brandLinkClassName} href={brandHref}>
        {brand}
      </BrandLink>
      {localeControl}
    </header>
  );
}
