import { Radio, RadioGroup } from "@measure-twice/react";
import type {
  ReadingStyle,
  ReadingStyleId,
  Spread,
  SpreadId,
} from "@/domain/tarot";
import type { TarotReadingCopy } from "../i18n";

type ReadingPreferencesProps = {
  readonly copy: TarotReadingCopy;
  readonly onSpreadChange: (spreadId: SpreadId) => void;
  readonly onStyleChange: (styleId: ReadingStyleId) => void;
  readonly readingStyles: readonly ReadingStyle[];
  readonly selectedSpreadId: SpreadId;
  readonly selectedStyleId: ReadingStyleId;
  readonly spreads: readonly Spread[];
};

export function ReadingPreferences({
  copy,
  onSpreadChange,
  onStyleChange,
  readingStyles,
  selectedSpreadId,
  selectedStyleId,
  spreads,
}: ReadingPreferencesProps) {
  const selectedStyle = readingStyles.find(
    (style) => style.id === selectedStyleId,
  );

  return (
    <details
      aria-label={copy.personalizationHeading}
      className="grid gap-2 border-t border-ts-divider pt-2"
      data-testid="reading-preferences"
    >
      <summary className="cursor-pointer py-3 text-sm font-semibold text-ts-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action">
        {copy.personalizationHeading}
        <span className="ml-2 font-normal text-ts-muted">
          {spreads.find((spread) => spread.id === selectedSpreadId)?.label} ·{" "}
          {selectedStyle?.label}
        </span>
      </summary>
      <div className="ts-reading-preferences grid gap-3">
        <RadioGroup
          announceError={false}
          className="ts-choice-group ts-choice-group--settings"
          legend={copy.spreadSelectorLabel}
          name="tarot-spread"
          onValueChange={(value) => onSpreadChange(value as SpreadId)}
          value={selectedSpreadId}
        >
          {spreads.map((spread) => (
            <Radio
              appearance="card"
              key={spread.id}
              label={spread.label}
              value={spread.id}
              wrapperClassName="ts-choice-card ts-choice-card--setting"
            />
          ))}
        </RadioGroup>

        <RadioGroup
          announceError={false}
          className="ts-choice-group ts-choice-group--settings"
          description={selectedStyle?.description}
          legend={copy.readingStyleSelectorLabel}
          name="reading-style"
          onValueChange={(value) => onStyleChange(value as ReadingStyleId)}
          value={selectedStyleId}
        >
          {readingStyles.map((style) => (
            <Radio
              appearance="card"
              key={style.id}
              label={style.label}
              value={style.id}
              wrapperClassName="ts-choice-card ts-choice-card--setting"
            />
          ))}
        </RadioGroup>
        <p className="text-xs leading-5 text-ts-muted">
          {copy.personalizationIntro}
        </p>
      </div>
    </details>
  );
}
