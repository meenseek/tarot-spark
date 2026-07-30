"use client";

import Link from "next/link";
import type { Locale } from "@/i18n/config";
import {
  interactiveFocusClassName,
  interactiveMotionClassName,
} from "@/components/visual/class-names";

export type LocaleSwitchLink = {
  readonly href: string;
  readonly label: string;
  readonly locale: Locale;
};

type LocaleSwitchProps = {
  readonly activeLocale: Locale;
  readonly ariaLabel: string;
  readonly links: readonly LocaleSwitchLink[];
  readonly onLocaleChange?: ((locale: Locale) => void) | undefined;
};

export function LocaleSwitch({
  activeLocale,
  ariaLabel,
  links,
  onLocaleChange,
}: LocaleSwitchProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className="inline-flex w-fit rounded-full border-2 border-ts-border bg-ts-surface p-1"
    >
      {links.map((link) => {
        const isActive = link.locale === activeLocale;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`${interactiveFocusClassName} ${interactiveMotionClassName} inline-flex min-h-11 items-center justify-center rounded-full px-3 text-xs text-ts-ink ${
              isActive
                ? "bg-ts-blush font-bold shadow-[inset_0_0_0_2px_var(--ts-color-action)] hover:bg-ts-blush-strong active:bg-ts-blush-strong active:text-ts-action-pressed active:shadow-[inset_0_0_0_2px_var(--ts-color-action-pressed)]"
                : "font-semibold hover:bg-ts-blush active:bg-ts-blush-strong"
            }`}
            href={link.href}
            key={link.locale}
            onClick={(event) => {
              if (isActive) {
                event.preventDefault();
                return;
              }

              if (
                event.button === 0 &&
                !event.altKey &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.shiftKey
              ) {
                onLocaleChange?.(link.locale);
              }
            }}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
