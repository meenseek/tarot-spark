import Link from "next/link";
import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import { SiteShell } from "@/components/layout/SiteShell";
import { CelestialMark } from "@/components/visual/CelestialMark";
import {
  footerLinkClassName,
  primaryButtonClassName,
} from "@/components/visual/class-names";
import {
  getLocalePath,
  localeNames,
  supportedLocales,
  type Locale,
} from "@/i18n/config";
import type { PublicPageId } from "./ids";
import {
  getPublicPageContent,
  getPublicPageLinks,
  getPublicPagePath,
  getPublicPageShellCopy,
} from "./i18n";

type PublicPageProps = {
  readonly locale: Locale;
  readonly pageId: PublicPageId;
};

export function PublicPage({ locale, pageId }: PublicPageProps) {
  const content = getPublicPageContent(locale, pageId);
  const shellCopy = getPublicPageShellCopy(locale);
  const publicPageLinks = getPublicPageLinks(locale);

  return (
    <SiteShell
      brand={shellCopy.brand}
      brandHref={getLocalePath(locale)}
      footerAriaLabel={shellCopy.pageNavigationLabel}
      footerLinks={publicPageLinks}
      localeControl={
        <LocaleSwitch
          activeLocale={locale}
          ariaLabel={shellCopy.languageSwitchLabel}
          links={supportedLocales.map((targetLocale) => ({
            href: getPublicPagePath(targetLocale, pageId),
            label: localeNames[targetLocale],
            locale: targetLocale,
          }))}
        />
      }
      skipToContentLabel={shellCopy.skipToContentLabel}
    >
      <article className="mx-auto my-8 grid w-full max-w-4xl flex-1 gap-8 rounded-ts-panel border border-ts-divider bg-ts-surface p-6 shadow-ts-paper sm:p-8">
        <div className="grid gap-4">
          <CelestialMark className="h-8 w-16 text-ts-gold" />
          <p className="text-sm font-semibold text-ts-action">
            {shellCopy.homeLabel}
          </p>
          <h1
            className={`max-w-3xl font-ts-display text-4xl font-semibold leading-[1.12] tracking-[-0.02em] text-ts-ink sm:text-5xl ${
              locale === "ko" ? "[word-break:keep-all]" : "[text-wrap:balance]"
            }`}
          >
            {content.title}
          </h1>
          <p className="max-w-3xl text-base leading-7 text-ts-muted">
            {content.intro}
          </p>
        </div>

        <div className="grid gap-7">
          {content.sections.map((section) => (
            <section className="grid gap-3" key={section.heading}>
              <h2 className="text-2xl font-semibold text-ts-ink">
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p className="text-sm leading-7 text-ts-muted" key={paragraph}>
                  {paragraph}
                </p>
              ))}
              {section.items &&
                (section.ordered ? (
                  <ol className="grid list-decimal gap-2 pl-5 text-sm leading-7 text-ts-muted">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                ) : (
                  <ul className="grid list-disc gap-2 pl-5 text-sm leading-7 text-ts-muted">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ))}
            </section>
          ))}
        </div>

        {content.disclaimer && (
          <p className="border-t border-ts-divider pt-5 text-xs leading-5 text-ts-muted">
            {content.disclaimer}
          </p>
        )}

        {content.related && (
          <nav
            aria-label={content.related.heading}
            className="grid gap-3 border-t border-ts-divider pt-7"
          >
            <h2 className="text-xl font-semibold text-ts-ink">
              {content.related.heading}
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {content.related.links.map((link) => (
                <Link
                  className={footerLinkClassName}
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        )}

        {content.cta && (
          <section className="grid gap-4 rounded-ts-control border-2 border-ts-action bg-ts-blush p-5 sm:p-6">
            <h2 className="text-2xl font-semibold text-ts-ink">
              {content.cta.heading}
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-ts-muted">
              {content.cta.body}
            </p>
            <Link
              className={`${primaryButtonClassName} w-fit`}
              href={content.cta.href}
            >
              {content.cta.label}
            </Link>
          </section>
        )}
      </article>
    </SiteShell>
  );
}
