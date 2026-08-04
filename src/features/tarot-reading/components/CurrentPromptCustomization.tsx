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

        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-semibold text-ts-ink">
            {copy.readingStyleSelectorLabel}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {readingStyles.map((style) => (
              <label
                className={`flex min-h-16 cursor-pointer gap-3 rounded-ts-control border-2 p-3 text-sm transition-colors duration-[var(--ts-motion-fast)] ${
                  style.id === selectedStyleId
                    ? "border-ts-action bg-ts-blush"
                    : "border-ts-border bg-ts-canvas hover:border-ts-action hover:bg-ts-blush"
                }`}
                key={style.id}
              >
                <input
                  checked={style.id === selectedStyleId}
                  className="mt-1 h-4 w-4 shrink-0 accent-ts-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action"
                  name="current-reading-style"
                  onChange={() => onStyleChange(style.id)}
                  type="radio"
                  value={style.id}
                />
                <span>
                  <span className="block font-semibold text-ts-ink">
                    {style.label}
                  </span>
                  <span className="mt-1 block leading-5 text-ts-muted">
                    {style.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="grid gap-2 text-sm font-semibold text-ts-ink">
          {copy.contextLabel}{" "}
          <span className="font-normal text-ts-muted">
            ({copy.contextOptional})
          </span>
          <textarea
            className="min-h-28 resize-y rounded-ts-control border-2 border-ts-border bg-ts-canvas p-3 text-sm font-normal leading-6 text-ts-ink outline-none transition-colors duration-[var(--ts-motion-fast)] placeholder:text-ts-muted focus:border-ts-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action"
            maxLength={maxUserContextLength}
            onChange={(event) => onContextChange(event.currentTarget.value)}
            placeholder={contextPlaceholder}
            value={userContext}
          />
        </label>
        <p className="text-xs leading-5 text-ts-muted">{copy.contextHelp}</p>
        <p className="text-right text-xs tabular-nums text-ts-muted">
          {contextCountLabel}
        </p>
      </div>
    </details>
  );
}
