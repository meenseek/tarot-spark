import { Radio, RadioGroup, Textarea } from "@measure-twice/react";
import { maxUserContextLength, type ReadingStyle } from "@/domain/tarot";
import type { ReadingStyleId } from "@/domain/tarot";
import type { TarotReadingCopy } from "../i18n";

type CurrentPromptCustomizationProps = {
  readonly contextCountLabel: string;
  readonly contextPlaceholder: string;
  readonly copy: TarotReadingCopy;
  readonly onContextChange: (value: string) => void;
  readonly onStyleChange: (styleId: ReadingStyleId) => void;
  readonly readingStyles: readonly ReadingStyle[];
  readonly selectedStyleId: ReadingStyleId;
  readonly userContext: string;
};

export function CurrentPromptCustomization({
  contextCountLabel,
  contextPlaceholder,
  copy,
  onContextChange,
  onStyleChange,
  readingStyles,
  selectedStyleId,
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

        <RadioGroup
          announceError={false}
          className="ts-choice-group ts-choice-group--two-column"
          legend={copy.readingStyleSelectorLabel}
          name="current-reading-style"
          onValueChange={(value) => onStyleChange(value as ReadingStyleId)}
          value={selectedStyleId}
        >
          {readingStyles.map((style) => (
            <Radio
              appearance="card"
              description={style.description}
              key={style.id}
              label={style.label}
              value={style.id}
              wrapperClassName="ts-choice-card ts-choice-card--compact"
            />
          ))}
        </RadioGroup>

        <Textarea
          announceError={false}
          aria-describedby="current-context-help current-context-count"
          className="ts-textarea-input ts-textarea-input--current"
          label={`${copy.contextInputLabel} (${copy.contextOptional})`}
          maxLength={maxUserContextLength}
          onChange={(event) => onContextChange(event.currentTarget.value)}
          placeholder={contextPlaceholder}
          value={userContext}
          wrapperClassName="ts-field ts-context-field"
        />
        <div className="flex flex-col justify-between gap-1 text-xs leading-5 text-ts-muted sm:flex-row">
          <p id="current-context-help">{copy.contextHelp}</p>
          <p className="shrink-0 tabular-nums" id="current-context-count">
            {contextCountLabel}
          </p>
        </div>
      </div>
    </details>
  );
}
