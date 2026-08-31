import { readingDomainIds } from "@/domain/tarot";
import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import { SiteShell } from "@/components/layout/SiteShell";
import { CelestialMark } from "@/components/visual/CelestialMark";
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
import { getPublicQuestionExplorerCopy } from "./explorer-i18n";
import { getPublicQuestionCatalog } from "./i18n";
import { getPublicQuestionPath } from "./paths";
import { PublicQuestionCatalogList } from "./PublicQuestionCatalogList";

type PublicQuestionExplorerProps = {
  readonly locale: Locale;
};

export function PublicQuestionExplorer({
  locale,
}: PublicQuestionExplorerProps) {
  const catalog = getPublicQuestionCatalog(locale);
  const copy = getPublicQuestionExplorerCopy(locale);
  const publicShell = getPublicPageShellCopy(locale);

  return (
    <SiteShell
      brand={publicShell.brand}
      brandHref={getLocalePath(locale)}
      footerAriaLabel={publicShell.pageNavigationLabel}
      footerLinks={getPublicPageLinks(locale)}
      localeControl={
        <LocaleSwitch
          activeLocale={locale}
          ariaLabel={publicShell.languageSwitchLabel}
          links={supportedLocales.map((targetLocale) => ({
            href: getPublicQuestionPath(targetLocale),
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
          <p className="max-w-4xl text-sm leading-6 text-ts-ink">
            {copy.resultContext}
          </p>
          <p className="max-w-4xl border-l-2 border-ts-gold pl-4 text-xs leading-5 text-ts-muted">
            {copy.disclaimer}
          </p>
        </section>

        <section className="grid gap-8" data-testid="question-catalog">
          <h2 className="font-ts-display text-3xl font-semibold">
            {copy.browseHeading}
          </h2>
          {readingDomainIds.map((domainId, domainIndex) => {
            const groups = catalog.groups.filter(
              (group) => group.domainId === domainId,
            );

            return (
              <section
                className="grid gap-4"
                data-question-domain={domainId}
                id={`domain-${domainId}`}
                key={domainId}
              >
                <div className="grid gap-1">
                  <h2 className="font-ts-display text-2xl font-semibold text-ts-ink">
                    {copy.domains[domainId].title}
                  </h2>
                  <p className="max-w-4xl text-sm leading-6 text-ts-muted">
                    {copy.domains[domainId].intro}
                  </p>
                </div>
                <PublicQuestionCatalogList
                  groups={groups}
                  locale={locale}
                  navigationLabel={`${copy.categoryNavigationLabel}: ${copy.domains[domainId].title}`}
                  openFirst={domainIndex === 0}
                />
              </section>
            );
          })}
        </section>

        <p className="border-t border-ts-divider pt-5 text-xs leading-5 text-ts-muted">
          {copy.disclaimer}
        </p>
      </article>
    </SiteShell>
  );
}
