import Link from "next/link";
import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import { CelestialMark } from "@/components/visual/CelestialMark";
import { TarotCardArt } from "@/components/visual/TarotCardArt";
import {
  brandLinkClassName,
  footerLinkClassName,
  primaryButtonClassName,
} from "@/components/visual/class-names";
import {
  getPublicPageLinks,
  getPublicPageShellCopy,
} from "@/features/public-pages";
import {
  getLocalePath,
  localeNames,
  supportedLocales,
  type Locale,
} from "@/i18n/config";
import {
  getRelationshipFlowCopy,
  getRelationshipFlowPath,
  getRelationshipFlowReadingPath,
} from "./i18n";

type RelationshipFlowLandingProps = {
  readonly locale: Locale;
};

export function RelationshipFlowLanding({
  locale,
}: RelationshipFlowLandingProps) {
  const copy = getRelationshipFlowCopy(locale);
  const shellCopy = getPublicPageShellCopy(locale);

  return (
    <main className="min-h-screen bg-ts-canvas text-ts-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:py-10">
        <header className="flex flex-col gap-4 border-b border-ts-divider pb-6 sm:flex-row sm:items-center sm:justify-between">
          <Link className={brandLinkClassName} href={getLocalePath(locale)}>
            {shellCopy.brand}
          </Link>
          <LocaleSwitch
            activeLocale={locale}
            ariaLabel={shellCopy.languageSwitchLabel}
            links={supportedLocales.map((targetLocale) => ({
              href: getRelationshipFlowPath(targetLocale),
              label: localeNames[targetLocale],
              locale: targetLocale,
            }))}
          />
        </header>

        <section className="grid gap-9 border-b border-ts-divider py-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-16">
          <div className="grid content-start gap-5">
            <CelestialMark className="h-8 w-16 text-ts-gold" />
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ts-action">
              {copy.eyebrow}
            </p>
            <h1
              className={`max-w-3xl font-ts-display text-4xl font-semibold leading-[1.1] tracking-[-0.02em] sm:text-5xl lg:text-6xl ${
                locale === "ko"
                  ? "[word-break:keep-all]"
                  : "[text-wrap:balance]"
              }`}
            >
              {copy.heading}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-ts-muted">
              {copy.intro}
            </p>
            <Link
              className={`${primaryButtonClassName} mt-2 w-fit`}
              href={getRelationshipFlowReadingPath(locale)}
            >
              {copy.ctaButton}
            </Link>
            <p className="max-w-xl text-xs leading-5 text-ts-muted">
              {copy.privacyNote}
            </p>
          </div>

          <div className="grid grid-cols-2 items-end gap-4 rounded-ts-panel border border-ts-divider bg-ts-surface p-5 shadow-ts-paper">
            <div className="relative aspect-[5/7] overflow-hidden rounded-ts-control border border-ts-divider bg-ts-canvas">
              <TarotCardArt
                cardId="the-lovers"
                className="object-cover"
                sizes="(min-width: 1024px) 14rem, 42vw"
              />
            </div>
            <div className="relative aspect-[5/7] translate-y-3 overflow-hidden rounded-ts-control border border-ts-divider bg-ts-canvas">
              <TarotCardArt
                cardId="the-star"
                className="object-cover"
                sizes="(min-width: 1024px) 14rem, 42vw"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-6 border-b border-ts-divider py-12">
          <h2 className="font-ts-display text-3xl font-semibold">
            {copy.benefitsHeading}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {copy.benefits.map((benefit) => (
              <article
                className="grid content-start gap-3 rounded-ts-control border border-ts-divider bg-ts-surface p-5 shadow-ts-card"
                key={benefit.title}
              >
                <h3 className="text-lg font-semibold">{benefit.title}</h3>
                <p className="text-sm leading-7 text-ts-muted">
                  {benefit.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 border-b border-ts-divider py-12 lg:grid-cols-[0.75fr_1.25fr]">
          <h2 className="font-ts-display text-3xl font-semibold">
            {copy.stepsHeading}
          </h2>
          <div className="grid gap-4">
            {copy.steps.map((step) => (
              <article
                className="grid gap-2 border-l-2 border-ts-action pl-5"
                key={step.title}
              >
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-sm leading-7 text-ts-muted">{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 border-b border-ts-divider py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ts-action">
            {copy.exampleEyebrow}
          </p>
          <h2 className="max-w-4xl font-ts-display text-3xl font-semibold">
            {copy.exampleHeading}
          </h2>
          <p className="max-w-4xl text-sm leading-7 text-ts-muted">
            {copy.exampleBody}
          </p>
        </section>

        <section className="grid gap-6 border-b border-ts-divider py-12">
          <h2 className="font-ts-display text-3xl font-semibold">
            {copy.faqHeading}
          </h2>
          <div className="grid gap-3">
            {copy.faqs.map((faq) => (
              <details
                className="rounded-ts-control border border-ts-divider bg-ts-surface p-5"
                key={faq.question}
              >
                <summary className="cursor-pointer font-semibold text-ts-ink">
                  {faq.question}
                </summary>
                <p className="mt-3 max-w-4xl text-sm leading-7 text-ts-muted">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="my-12 grid gap-5 rounded-ts-panel border-2 border-ts-action bg-ts-blush p-6 sm:p-8">
          <h2 className="font-ts-display text-3xl font-semibold">
            {copy.ctaHeading}
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-ts-muted">
            {copy.ctaBody}
          </p>
          <Link
            className={`${primaryButtonClassName} w-fit`}
            href={getRelationshipFlowReadingPath(locale)}
          >
            {copy.ctaButton}
          </Link>
          <p className="text-xs leading-5 text-ts-muted">{copy.disclaimer}</p>
        </section>

        <footer className="border-t border-ts-divider py-6">
          <nav
            aria-label={shellCopy.pageNavigationLabel}
            className="flex flex-wrap gap-x-3 text-sm"
          >
            {getPublicPageLinks(locale).map((link) => (
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
