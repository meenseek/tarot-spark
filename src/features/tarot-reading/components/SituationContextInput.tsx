import { Textarea } from "@measure-twice/react";
import { maxUserContextLength } from "@/domain/tarot";
import type { RefObject } from "react";
import type { TarotReadingCopy } from "../i18n";

type SituationContextInputProps = {
  readonly contextCountLabel: string;
  readonly contextPlaceholder: string;
  readonly copy: TarotReadingCopy;
  readonly disclosureRef: RefObject<HTMLDetailsElement | null>;
  readonly onContextChange: (value: string) => void;
  readonly userContext: string;
};

export function SituationContextInput({
  contextCountLabel,
  contextPlaceholder,
  copy,
  disclosureRef,
  onContextChange,
  userContext,
}: SituationContextInputProps) {
  const hasContext = userContext.trim().length > 0;

  return (
    <details
      className="group rounded-ts-panel border border-ts-divider bg-ts-surface shadow-ts-card"
      data-testid="situation-context"
      ref={disclosureRef}
      suppressHydrationWarning
    >
      <summary
        className="flex min-h-12 cursor-pointer list-none flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-ts-panel px-4 py-3 text-left marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action [&::-webkit-details-marker]:hidden"
        data-testid="situation-context-toggle"
      >
        <span className="text-sm font-semibold text-ts-ink">
          {copy.contextLabel}{" "}
          <span className="font-normal text-ts-muted">
            ({copy.contextOptional})
          </span>
        </span>
        <span className="flex items-center gap-2 text-xs leading-5 text-ts-muted">
          <span>
            {hasContext ? copy.contextFilledSummary : copy.contextEmptySummary}
          </span>
          <span
            aria-hidden="true"
            className="text-base text-ts-action transition-transform duration-[var(--ts-motion-fast)] group-open:rotate-180"
          >
            ⌄
          </span>
        </span>
      </summary>

      <div className="grid gap-2 border-t border-ts-divider p-4">
        <Textarea
          announceError={false}
          aria-describedby="tarot-context-help tarot-context-count"
          className="ts-textarea-input ts-textarea-input--context"
          id="tarot-user-context"
          label={copy.contextLabel}
          maxLength={maxUserContextLength}
          onChange={(event) => onContextChange(event.currentTarget.value)}
          placeholder={contextPlaceholder}
          value={userContext}
          wrapperClassName="ts-field"
        />
        <div className="flex flex-col justify-between gap-1 text-xs leading-5 text-ts-muted sm:flex-row">
          <p id="tarot-context-help">{copy.contextHelp}</p>
          <p className="shrink-0 tabular-nums" id="tarot-context-count">
            {contextCountLabel}
          </p>
        </div>
      </div>
    </details>
  );
}
