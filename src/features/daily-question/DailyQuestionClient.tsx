"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import { CelestialMark } from "@/components/visual/CelestialMark";
import { TarotCardArt } from "@/components/visual/TarotCardArt";
import {
  brandLinkClassName,
  footerLinkClassName,
  secondaryButtonClassName,
} from "@/components/visual/class-names";
import {
  getDailyTarotCard,
  getLocalDateKey,
  type LocaleTarotData,
} from "@/domain/tarot";
import {
  getLocalePath,
  localeNames,
  supportedLocales,
  type Locale,
} from "@/i18n/config";
import type { PublicPageLink } from "@/features/public-pages";
import type { DailyQuestionCopy } from "./i18n";
import { getDailyQuestionPath } from "./paths";

type DailyQuestionClientProps = {
  readonly copy: DailyQuestionCopy;
  readonly locale: Locale;
  readonly publicPageLinks: readonly PublicPageLink[];
  readonly publicPageNavigationLabel: string;
  readonly tarotData: LocaleTarotData;
};

export function DailyQuestionClient({
  copy,
  locale,
  publicPageLinks,
  publicPageNavigationLabel,
  tarotData,
}: DailyQuestionClientProps) {
  const localDateKey = useBrowserLocalDateKey();
  const card = localDateKey
    ? getDailyTarotCard(tarotData.cards, localDateKey)
    : undefined;

  return (
    <main className="min-h-screen bg-ts-canvas text-ts-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 sm:px-8 lg:py-10">
        <header className="flex flex-col gap-4 border-b border-ts-divider pb-6 sm:flex-row sm:items-center sm:justify-between">
          <Link className={brandLinkClassName} href={getLocalePath(locale)}>
            {copy.brand}
          </Link>
          <LocaleSwitch
            activeLocale={locale}
            ariaLabel={copy.languageSwitchLabel}
            links={supportedLocales.map((targetLocale) => ({
              href: getDailyQuestionPath(targetLocale),
              label: localeNames[targetLocale],
              locale: targetLocale,
            }))}
          />
        </header>

        <section className="grid flex-1 gap-10 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="grid content-start gap-5">
            <CelestialMark className="h-8 w-16 text-ts-gold" />
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ts-action">
              {copy.eyebrow}
            </p>
            <h1
              className={`max-w-2xl font-ts-display text-4xl font-semibold leading-[1.12] tracking-[-0.02em] text-ts-ink sm:text-[2.75rem] lg:text-5xl ${
                locale === "ko"
                  ? "[word-break:keep-all]"
                  : "[text-wrap:balance]"
              }`}
            >
              {copy.heading}
            </h1>
            <p className="max-w-xl text-base leading-7 text-ts-muted">
              {copy.intro}
            </p>
            <p className="max-w-xl text-xs leading-5 text-ts-muted">
              {copy.deckNote}
            </p>
          </div>

          <section
            aria-live="polite"
            className="min-h-[42rem] rounded-ts-panel border border-ts-divider bg-ts-surface p-5 shadow-ts-paper sm:min-h-[36rem] sm:p-7"
            data-testid="daily-panel"
          >
            {card && localDateKey ? (
              <article
                className="grid min-h-[37rem] content-center gap-6 sm:min-h-[31rem]"
                data-card-id={card.id}
                data-testid="daily-card"
              >
                <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-ts-divider pb-5">
                  <div className="grid content-start gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ts-action">
                      {copy.todayCardLabel}
                    </p>
                    <h2 className="font-ts-display text-3xl font-semibold text-ts-ink">
                      {card.name}
                    </h2>
                    <p className="text-sm text-ts-action">{card.tone}</p>
                  </div>
                  <div className="relative grid h-28 w-20 place-items-center overflow-hidden rounded-ts-control border border-ts-divider bg-ts-canvas text-ts-action">
                    <TarotCardArt
                      cardId={card.id}
                      className="object-cover"
                      glyphClassName="h-12 w-12"
                      sizes="5rem"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-ts-muted">
                    {copy.meaningLabel}
                  </h3>
                  <p className="text-sm leading-7 text-ts-muted">
                    {card.upright}
                  </p>
                </div>

                <div
                  className="grid gap-3 rounded-ts-inset border-2 border-ts-action bg-ts-blush p-5"
                  data-testid="daily-question-block"
                >
                  <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-ts-action">
                    {copy.questionLabel}
                  </h3>
                  <p
                    className={`font-ts-display text-2xl font-semibold leading-8 text-ts-ink ${
                      locale === "ko"
                        ? "[word-break:keep-all]"
                        : "[text-wrap:balance]"
                    }`}
                  >
                    {card.reflection}
                  </p>
                </div>

                <Link
                  className={`${secondaryButtonClassName} w-fit`}
                  href={getLocalePath(locale)}
                >
                  {copy.homeLink}
                </Link>
              </article>
            ) : (
              <div
                className="grid min-h-[37rem] content-center gap-6 rounded-ts-control border border-dashed border-ts-divider bg-ts-canvas p-5 sm:min-h-[31rem]"
                data-testid="daily-placeholder"
              >
                <p className="text-sm font-medium text-ts-muted">
                  {copy.loadingLabel}
                </p>
                <div aria-hidden="true" className="grid gap-6">
                  <div className="grid gap-3 border-b border-ts-divider pb-5">
                    <div className="h-3 w-24 rounded-full bg-ts-divider" />
                    <div className="h-9 w-40 rounded-ts-control bg-ts-divider" />
                    <div className="h-3 w-20 rounded-full bg-ts-divider" />
                  </div>
                  <div className="grid gap-3">
                    <div className="h-3 w-28 rounded-full bg-ts-divider" />
                    <div className="h-3 w-full rounded-full bg-ts-divider" />
                    <div className="h-3 w-4/5 rounded-full bg-ts-divider" />
                  </div>
                  <div className="grid gap-3 rounded-ts-inset border border-ts-divider p-5">
                    <div className="h-3 w-24 rounded-full bg-ts-divider" />
                    <div className="h-5 w-full rounded-full bg-ts-divider" />
                    <div className="h-5 w-3/4 rounded-full bg-ts-divider" />
                  </div>
                </div>
              </div>
            )}
          </section>
        </section>

        <p className="border-t border-ts-divider pt-6 text-xs leading-5 text-ts-muted">
          {copy.disclaimer}
        </p>
        <footer className="py-6">
          <nav
            aria-label={publicPageNavigationLabel}
            className="flex flex-wrap gap-x-3 text-xs"
          >
            {publicPageLinks.map((link) => (
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
      </div>
    </main>
  );
}

function useBrowserLocalDateKey() {
  const [localDateKey, setLocalDateKey] = useState<string>();

  useEffect(() => {
    let midnightTimer: number | undefined;

    function updateLocalDate() {
      const now = new Date();
      setLocalDateKey(getLocalDateKey(now));
      window.clearTimeout(midnightTimer);
      midnightTimer = window.setTimeout(
        updateLocalDate,
        getMillisecondsUntilNextLocalDate(now),
      );
    }

    function updateWhenVisible() {
      if (document.visibilityState === "visible") {
        updateLocalDate();
      }
    }

    updateLocalDate();
    window.addEventListener("focus", updateLocalDate);
    document.addEventListener("visibilitychange", updateWhenVisible);

    return () => {
      window.clearTimeout(midnightTimer);
      window.removeEventListener("focus", updateLocalDate);
      document.removeEventListener("visibilitychange", updateWhenVisible);
    };
  }, []);

  return localDateKey;
}

function getMillisecondsUntilNextLocalDate(now: Date) {
  const nextLocalDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );

  return Math.max(1_000, nextLocalDate.getTime() - now.getTime() + 100);
}
