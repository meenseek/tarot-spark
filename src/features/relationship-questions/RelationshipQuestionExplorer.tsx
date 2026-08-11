import Link from "next/link";
import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import { SiteShell } from "@/components/layout/SiteShell";
import { CelestialMark } from "@/components/visual/CelestialMark";
import { secondaryButtonClassName } from "@/components/visual/class-names";
import {
  getPublicPageLinks,
  getPublicPagePath,
  getPublicPageShellCopy,
} from "@/features/public-pages";
import {
  getLocalePath,
  localeNames,
  supportedLocales,
  type Locale,
} from "@/i18n/config";
import {
  getRelationshipQuestionCatalog,
  getRelationshipQuestionExplorerShellCopy,
} from "./i18n";
import {
  getRelationshipQuestionPath,
  getRelationshipQuestionReadingPath,
} from "./paths";

type RelationshipQuestionExplorerProps = {
  readonly locale: Locale;
};

export function RelationshipQuestionExplorer({
  locale,
}: RelationshipQuestionExplorerProps) {
  const catalog = getRelationshipQuestionCatalog(locale);
  const copy = getRelationshipQuestionExplorerShellCopy(locale);
  const publicShell = getPublicPageShellCopy(locale);
  const publicPageLinks = getPublicPageLinks(locale);

  return (
    <SiteShell
      brand={publicShell.brand}
      brandHref={getLocalePath(locale)}
      footerAriaLabel={publicShell.pageNavigationLabel}
      footerLinks={publicPageLinks}
      localeControl={
        <LocaleSwitch
          activeLocale={locale}
          ariaLabel={publicShell.languageSwitchLabel}
          links={supportedLocales.map((targetLocale) => ({
            href: getRelationshipQuestionPath(targetLocale),
            label: localeNames[targetLocale],
            locale: targetLocale,
          }))}
        />
      }
    >
      <article className="my-8 grid flex-1 gap-10">
        <section className="grid gap-5 rounded-ts-panel border border-ts-divider bg-ts-surface p-6 shadow-ts-paper sm:p-8">
          <CelestialMark className="h-8 w-16 text-ts-gold" />
          <p className="text-sm font-semibold text-ts-action">{copy.eyebrow}</p>
          <h1
            className={`max-w-4xl font-ts-display text-4xl font-semibold leading-[1.12] tracking-[-0.02em] sm:text-5xl ${
              locale === "ko" ? "[word-break:keep-all]" : "[text-wrap:balance]"
            }`}
          >
            {copy.title}
          </h1>
          <p className="max-w-4xl text-base leading-7 text-ts-muted">
            {copy.intro}
          </p>
        </section>

        <section className="grid gap-6" data-testid="question-catalog">
          <h2 className="font-ts-display text-3xl font-semibold">
            {copy.browseHeading}
          </h2>
          <div
            aria-label={copy.categoryNavigationLabel}
            className="grid gap-3"
            role="navigation"
          >
            {catalog.categories.map((category, categoryIndex) => (
              <details
                className="group scroll-mt-6 rounded-ts-panel border border-ts-divider bg-ts-surface"
                data-testid="question-category"
                id={category.id}
                key={category.id}
                open={categoryIndex === 0}
              >
                <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-4 rounded-ts-panel px-5 py-4 marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action sm:px-6 [&::-webkit-details-marker]:hidden">
                  <span className="grid gap-1">
                    <span className="font-ts-display text-2xl font-semibold text-ts-ink">
                      {category.title}
                    </span>
                    <span className="max-w-4xl text-sm leading-6 text-ts-muted">
                      {category.intro}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-lg text-ts-action transition-transform duration-[var(--ts-motion-fast)] group-open:rotate-180"
                  >
                    ⌄
                  </span>
                </summary>
                <div className="grid gap-4 border-t border-ts-divider p-5 md:grid-cols-2 sm:p-6">
                  {category.questions.map((question) => (
                    <article
                      className="grid content-start gap-3 rounded-ts-control border border-ts-divider bg-ts-canvas p-5"
                      key={question.id}
                    >
                      <h3 className="text-xl font-semibold text-ts-ink">
                        {question.title}
                      </h3>
                      <p className="text-sm leading-7 text-ts-muted">
                        {question.summary}
                      </p>
                      <div className="grid gap-1 border-l-2 border-ts-gold pl-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ts-action">
                          {copy.focusLabel}
                        </p>
                        <p className="text-sm leading-7 text-ts-ink">
                          {question.focus}
                        </p>
                      </div>
                      <Link
                        className={`${secondaryButtonClassName} mt-auto w-fit`}
                        href={getRelationshipQuestionReadingPath(
                          locale,
                          question,
                        )}
                      >
                        {question.ctaLabel}
                      </Link>
                    </article>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="grid gap-4 rounded-ts-panel border border-ts-divider bg-ts-surface p-6 shadow-ts-paper sm:p-8">
          <h2 className="font-ts-display text-3xl font-semibold">
            {copy.methodHeading}
          </h2>
          <p className="max-w-4xl text-sm leading-7 text-ts-muted">
            {copy.methodIntro}
          </p>
          <Link
            className="w-fit text-sm font-semibold text-ts-action underline decoration-ts-gold underline-offset-4"
            href={getPublicPagePath(locale, "three-card-tarot-reading")}
          >
            {copy.methodGuideLinkLabel}
          </Link>
          <ol className="grid list-decimal gap-2 pl-5 text-sm leading-7 text-ts-muted md:grid-cols-2 md:gap-x-10">
            {copy.methodSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="grid gap-5 rounded-ts-panel border border-ts-divider bg-ts-surface p-6 shadow-ts-paper sm:p-8">
          <h2 className="font-ts-display text-3xl font-semibold">
            {copy.comparisonHeading}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="grid content-start gap-2 rounded-ts-control border border-ts-divider bg-ts-canvas p-5">
              <h3 className="font-semibold text-ts-muted">
                {copy.weakQuestionLabel}
              </h3>
              <p className="text-sm leading-7 text-ts-muted">
                {copy.weakQuestion}
              </p>
            </article>
            <article className="grid content-start gap-2 rounded-ts-control border-2 border-ts-action bg-ts-blush p-5">
              <h3 className="font-semibold text-ts-action">
                {copy.strongQuestionLabel}
              </h3>
              <p className="text-sm leading-7 text-ts-ink">
                {copy.strongQuestion}
              </p>
            </article>
          </div>
        </section>

        <section className="grid gap-4 rounded-ts-panel border border-ts-divider bg-ts-surface p-6 shadow-ts-paper sm:p-8">
          <h2 className="font-ts-display text-3xl font-semibold">
            {copy.workedExampleHeading}
          </h2>
          <p className="max-w-4xl text-sm leading-7 text-ts-muted">
            {copy.workedExampleBody}
          </p>
          <ul className="grid list-disc gap-2 pl-5 text-sm leading-7 text-ts-muted">
            {copy.workedExampleItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <p className="border-t border-ts-divider pt-5 text-xs leading-5 text-ts-muted">
          {copy.disclaimer}
        </p>
      </article>
    </SiteShell>
  );
}
