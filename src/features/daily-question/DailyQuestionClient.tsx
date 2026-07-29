"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
    <main className="min-h-screen bg-[#10110f] text-stone-50">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 sm:px-8 lg:py-10">
        <header className="flex flex-col gap-4 border-b border-stone-800 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <Link
            className="text-sm font-semibold text-amber-300 transition hover:text-amber-200"
            href={getLocalePath(locale)}
          >
            {copy.brand}
          </Link>
          <nav aria-label={copy.languageSwitchLabel} className="flex gap-2">
            {supportedLocales.map((targetLocale) => {
              const isActive = targetLocale === locale;

              return (
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "border-amber-300 bg-amber-300 text-neutral-950"
                      : "border-stone-700 bg-stone-900 text-stone-100 hover:border-emerald-300 hover:text-emerald-200"
                  }`}
                  href={getDailyQuestionPath(targetLocale)}
                  key={targetLocale}
                >
                  {localeNames[targetLocale]}
                </Link>
              );
            })}
          </nav>
        </header>

        <section className="grid flex-1 gap-10 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="grid content-start gap-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
              {copy.eyebrow}
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-stone-50 sm:text-5xl">
              {copy.heading}
            </h1>
            <p className="max-w-xl text-base leading-7 text-stone-300">
              {copy.intro}
            </p>
            <p className="max-w-xl text-xs leading-5 text-stone-400">
              {copy.deckNote}
            </p>
          </div>

          <section
            aria-live="polite"
            className="min-h-[26rem] rounded-md border border-stone-700 bg-stone-950 p-5 shadow-2xl shadow-black/30 sm:p-7"
          >
            {card && localDateKey ? (
              <article
                className="grid h-full content-center gap-6"
                data-card-id={card.id}
                data-testid="daily-card"
              >
                <div className="grid gap-2 border-b border-stone-800 pb-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                    {copy.todayCardLabel}
                  </p>
                  <h2 className="text-3xl font-semibold text-stone-50">
                    {card.name}
                  </h2>
                  <p className="text-sm text-emerald-200">{card.tone}</p>
                </div>

                <div className="grid gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                    {copy.meaningLabel}
                  </h3>
                  <p className="text-sm leading-7 text-stone-300">
                    {card.upright}
                  </p>
                </div>

                <div className="grid gap-3 rounded-md border border-emerald-900 bg-emerald-950/30 p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
                    {copy.questionLabel}
                  </h3>
                  <p className="text-xl font-medium leading-8 text-stone-50">
                    {card.reflection}
                  </p>
                </div>

                <Link
                  className="w-fit rounded-md border border-stone-600 px-4 py-3 text-sm font-semibold text-stone-100 transition hover:border-emerald-300 hover:text-emerald-200"
                  href={getLocalePath(locale)}
                >
                  {copy.homeLink}
                </Link>
              </article>
            ) : (
              <div
                className="grid h-full min-h-[22rem] place-items-center rounded-md border border-dashed border-stone-700"
                data-testid="daily-placeholder"
              >
                <p className="text-sm text-stone-400">{copy.loadingLabel}</p>
              </div>
            )}
          </section>
        </section>

        <p className="border-t border-stone-800 pt-6 text-xs leading-5 text-stone-400">
          {copy.disclaimer}
        </p>
        <footer className="py-6">
          <nav
            aria-label={publicPageNavigationLabel}
            className="flex flex-wrap gap-3 text-xs text-stone-400"
          >
            {publicPageLinks.map((link) => (
              <Link
                className="transition hover:text-emerald-200"
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
