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
        className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-ts-panel px-4 py-3 text-left marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action [&::-webkit-details-marker]:hidden"
        data-testid="reading-preferences-toggle"
      >
        <span className="text-base font-semibold text-ts-ink">
          {copy.personalizationHeading}
        </span>
        <span className="flex items-center gap-2 text-right text-xs leading-5 text-ts-muted">
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

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-semibold text-ts-ink">
            {copy.spreadSelectorLabel}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {spreads.map((spread) => (
              <label
                className={`flex min-h-20 cursor-pointer gap-3 rounded-ts-control border-2 p-3 text-sm transition-colors duration-[var(--ts-motion-fast)] ${
                  spread.id === selectedSpreadId
                    ? "border-ts-action bg-ts-blush"
                    : "border-ts-border bg-ts-canvas hover:border-ts-action hover:bg-ts-blush"
                }`}
                key={spread.id}
              >
                <input
                  checked={spread.id === selectedSpreadId}
                  className="mt-1 h-4 w-4 shrink-0 accent-ts-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action"
                  name="tarot-spread"
                  onChange={() => onSpreadChange(spread.id)}
                  type="radio"
                  value={spread.id}
                />
                <span>
                  <span className="block font-semibold text-ts-ink">
                    {spread.label}
                  </span>
                  <span className="mt-1 block leading-5 text-ts-muted">
                    {spread.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-semibold text-ts-ink">
            {copy.readingStyleSelectorLabel}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {readingStyles.map((style) => (
              <label
                className={`flex min-h-24 cursor-pointer gap-3 rounded-ts-control border-2 p-3 text-sm transition-colors duration-[var(--ts-motion-fast)] ${
                  style.id === selectedStyleId
                    ? "border-ts-action bg-ts-blush"
                    : "border-ts-border bg-ts-canvas hover:border-ts-action hover:bg-ts-blush"
                }`}
                key={style.id}
              >
                <input
                  checked={style.id === selectedStyleId}
                  className="mt-1 h-4 w-4 shrink-0 accent-ts-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action"
                  name="reading-style"
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
      </div>
    </details>
  );
}
