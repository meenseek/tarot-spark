import Link from "next/link";
import { footerLinkClassName } from "@/components/visual/class-names";

export type SiteFooterLink = {
  readonly href: string;
  readonly label: string;
};

type SiteFooterProps = {
  readonly ariaLabel: string;
  readonly links: readonly SiteFooterLink[];
};

export function SiteFooter({ ariaLabel, links }: SiteFooterProps) {
  return (
    <footer
      className="border-t border-ts-divider py-6"
      data-testid="site-footer"
    >
      <nav
        aria-label={ariaLabel}
        className="flex flex-wrap gap-x-3 gap-y-2 text-xs"
      >
        {links.map((link) => (
          <Link
            className={footerLinkClassName}
            href={link.href}
            key={link.href}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
