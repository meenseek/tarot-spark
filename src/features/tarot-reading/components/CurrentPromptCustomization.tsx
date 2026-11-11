import type { TarotReadingCopy } from "../i18n";
import { SituationContextInput } from "./SituationContextInput";

type CurrentPromptCustomizationProps = {
  readonly contextCountLabel: string;
  readonly contextPlaceholder: string;
  readonly copy: TarotReadingCopy;
  readonly onContextChange: (value: string) => void;
  readonly userContext: string;
};

export function CurrentPromptCustomization({
  contextCountLabel,
  contextPlaceholder,
  copy,
  onContextChange,
  userContext,
}: CurrentPromptCustomizationProps) {
  return (
    <details
      className="group rounded-ts-control border border-ts-divider bg-ts-surface"
      data-testid="current-prompt-customization"
      suppressHydrationWarning
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-ts-control px-4 py-3 marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action [&::-webkit-details-marker]:hidden">
        <span className="font-semibold text-ts-ink">
          {copy.customizeCurrent}
        </span>
        <span
          aria-hidden="true"
          className="text-base text-ts-action transition-transform duration-[var(--ts-motion-fast)] group-open:rotate-180"
        >
          ⌄
        </span>
      </summary>
      <div className="grid gap-5 border-t border-ts-divider p-4">
        <p className="text-sm leading-6 text-ts-muted">
          {copy.customizeCurrentIntro}
        </p>

        <SituationContextInput
          contextCountLabel={contextCountLabel}
          contextPlaceholder={contextPlaceholder}
          copy={copy}
          onContextChange={onContextChange}
          userContext={userContext}
        />
      </div>
    </details>
  );
}
