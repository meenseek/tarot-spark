import Link from "next/link";
import { secondaryButtonClassName } from "@/components/visual/class-names";
import type { Locale } from "@/i18n/config";
import { getPublicQuestionReadingPath } from "./paths";
import type { PublicQuestionGroup } from "./types";

type PublicQuestionCatalogListProps = {
  readonly groups: readonly PublicQuestionGroup[];
  readonly locale: Locale;
  readonly navigationLabel: string;
  readonly openFirst?: boolean;
};

export function PublicQuestionCatalogList({
  groups,
  locale,
  navigationLabel,
  openFirst = false,
}: PublicQuestionCatalogListProps) {
  return (
    <div
      aria-label={navigationLabel}
      className="grid gap-3"
      data-testid="public-question-catalog-list"
      role="navigation"
    >
      {groups.map((group, groupIndex) => (
        <details
          className="group scroll-mt-6 rounded-ts-panel border border-ts-divider bg-ts-surface"
          data-testid="question-category"
          id={group.id}
          key={group.id}
          open={openFirst && groupIndex === 0}
        >
          <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-4 rounded-ts-panel px-5 py-4 marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action sm:px-6 [&::-webkit-details-marker]:hidden">
            <span className="grid gap-1">
              <span className="font-ts-display text-2xl font-semibold text-ts-ink">
                {group.title}
              </span>
              <span className="max-w-4xl text-sm leading-6 text-ts-muted">
                {group.intro}
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
            {group.questions.map((question) => (
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
                <Link
                  className={`${secondaryButtonClassName} mt-auto w-fit`}
                  href={getPublicQuestionReadingPath(locale, question)}
                >
                  {question.ctaLabel}
                </Link>
              </article>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
