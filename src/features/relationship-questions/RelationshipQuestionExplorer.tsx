import Link from "next/link";
import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import { SiteShell } from "@/components/layout/SiteShell";
import { CelestialMark } from "@/components/visual/CelestialMark";
import {
  getPublicPageLinks,
  getPublicPagePath,
  getPublicPageShellCopy,
} from "@/features/public-pages";
import { PublicQuestionCatalogList } from "@/features/reading-questions";
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
import { getRelationshipQuestionPath } from "./paths";

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
      skipToContentLabel={publicShell.skipToContentLabel}
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
          <PublicQuestionCatalogList
            groups={catalog.categories}
            locale={locale}
            navigationLabel={copy.categoryNavigationLabel}
            openFirst
          />
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
