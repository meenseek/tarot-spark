import Link from "next/link";
import type { ReactNode } from "react";
import { brandLinkClassName } from "@/components/visual/class-names";

type SiteHeaderProps = {
  readonly brand: string;
  readonly brandHref: string;
  readonly localeControl: ReactNode;
};

export function SiteHeader({
  brand,
  brandHref,
  localeControl,
}: SiteHeaderProps) {
  return (
    <header
      className="flex flex-col gap-4 border-b border-ts-divider pb-6 sm:flex-row sm:items-center sm:justify-between"
      data-testid="site-header"
    >
      <Link className={brandLinkClassName} href={brandHref}>
        {brand}
      </Link>
      {localeControl}
    </header>
  );
}
