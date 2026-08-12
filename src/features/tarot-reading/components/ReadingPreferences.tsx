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
  const selectedSpread = spreads.find(
    (spread) => spread.id === selectedSpreadId,
  );
  const selectedStyle = readingStyles.find(
    (style) => style.id === selectedStyleId,
  );

  return (
    <details
      className="group rounded-ts-panel border border-ts-divider bg-ts-surface shadow-ts-card"
      data-testid="reading-preferences"
      suppressHydrationWarning
    >
      <summary
        className="flex min-h-12 cursor-pointer list-none flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-ts-panel px-4 py-3 text-left marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action [&::-webkit-details-marker]:hidden"
        data-testid="reading-preferences-toggle"
      >
        <span className="shrink-0 whitespace-nowrap text-base font-semibold text-ts-ink">
          {copy.personalizationHeading}
        </span>
        <span
          className="ml-auto flex min-w-0 items-center gap-2 text-right text-xs leading-5 text-ts-muted"
          data-testid="reading-preferences-selection"
        >
          <span>
            {[selectedSpread?.label, selectedStyle?.label]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <span
            aria-hidden="true"
            className="text-base text-ts-action transition-transform duration-[var(--ts-motion-fast)] group-open:rotate-180"
          >
            ⌄
          </span>
        </span>
      </summary>

      <div className="grid gap-5 border-t border-ts-divider p-4">
        <p className="text-sm leading-6 text-ts-muted">
          {copy.personalizationIntro}
        </p>

        <RadioGroup
          announceError={false}
          className="tarot-mt-radio-group tarot-mt-radio-group--two-column"
          legend={copy.spreadSelectorLabel}
          name="tarot-spread"
          onValueChange={(value) => onSpreadChange(value as SpreadId)}
          value={selectedSpreadId}
        >
          {spreads.map((spread) => (
            <Radio
              description={spread.description}
              key={spread.id}
              label={spread.label}
              value={spread.id}
              wrapperClassName="tarot-mt-radio-card tarot-mt-radio-card--spread"
            />
          ))}
        </RadioGroup>

        <RadioGroup
          announceError={false}
          className="tarot-mt-radio-group tarot-mt-radio-group--two-column"
          legend={copy.readingStyleSelectorLabel}
          name="reading-style"
          onValueChange={(value) => onStyleChange(value as ReadingStyleId)}
          value={selectedStyleId}
        >
          {readingStyles.map((style) => (
            <Radio
              description={style.description}
              key={style.id}
              label={style.label}
              value={style.id}
              wrapperClassName="tarot-mt-radio-card tarot-mt-radio-card--style"
            />
          ))}
        </RadioGroup>
      </div>
    </details>
  );
}
