import { Radio, RadioGroup } from "@measure-twice/react";
import type { ReadingStyle, ReadingStyleId } from "@/domain/tarot";
import type { TarotReadingCopy } from "../i18n";

type CurrentReadingStyleProps = {
  readonly copy: TarotReadingCopy;
  readonly onStyleChange: (styleId: ReadingStyleId) => void;
  readonly readingStyles: readonly ReadingStyle[];
  readonly selectedStyleId: ReadingStyleId;
  readonly instantReadingAvailable: boolean;
};

export function CurrentReadingStyle({
  copy,
  onStyleChange,
  readingStyles,
  selectedStyleId,
  instantReadingAvailable,
}: CurrentReadingStyleProps) {
  return (
    <details
      className="group rounded-ts-control border border-ts-divider bg-ts-surface"
      data-testid="current-reading-style"
    >
      <summary className="flex min-h-12 cursor-pointer items-center px-4 py-3 font-semibold text-ts-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action">
        {copy.customizeReadingStyle}
      </summary>
      <div className="grid gap-3 border-t border-ts-divider p-4">
        <p className="text-sm leading-6 text-ts-muted">
          {copy.customizeReadingStyleIntro}
        </p>
        {instantReadingAvailable && (
          <p className="text-sm leading-6 text-ts-muted">
            {copy.styleResetNotice}
          </p>
        )}
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
      </div>
    </details>
  );
}
