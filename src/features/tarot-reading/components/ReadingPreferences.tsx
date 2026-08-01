import type {
  ReadingStyle,
  ReadingStyleId,
  Spread,
  SpreadId,
} from "@/domain/tarot";
import { maxUserContextLength } from "@/domain/tarot";
import type { TarotReadingCopy } from "../i18n";

type ReadingPreferencesProps = {
  readonly contextCountLabel: string;
  readonly contextPlaceholder: string;
  readonly copy: TarotReadingCopy;
  readonly onContextChange: (value: string) => void;
  readonly onSpreadChange: (spreadId: SpreadId) => void;
  readonly onStyleChange: (styleId: ReadingStyleId) => void;
  readonly readingStyles: readonly ReadingStyle[];
  readonly selectedSpreadId: SpreadId;
  readonly selectedStyleId: ReadingStyleId;
  readonly spreads: readonly Spread[];
  readonly userContext: string;
};

export function ReadingPreferences({
  contextCountLabel,
  contextPlaceholder,
  copy,
  onContextChange,
  onSpreadChange,
  onStyleChange,
  readingStyles,
  selectedSpreadId,
  selectedStyleId,
  spreads,
  userContext,
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

        <div className="grid gap-2">
          <label
            className="text-sm font-semibold text-ts-ink"
            htmlFor="tarot-user-context"
          >
            {copy.contextLabel}{" "}
            <span className="font-normal text-ts-muted">
              ({copy.contextOptional})
            </span>
          </label>
          <textarea
            aria-describedby="tarot-context-help tarot-context-count"
            className="min-h-40 resize-y rounded-ts-control border-2 border-ts-border bg-ts-canvas p-3 text-sm leading-6 text-ts-ink outline-none transition-colors duration-[var(--ts-motion-fast)] placeholder:text-ts-muted focus:border-ts-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action sm:min-h-28"
            id="tarot-user-context"
            maxLength={maxUserContextLength}
            onChange={(event) => onContextChange(event.currentTarget.value)}
            placeholder={contextPlaceholder}
            value={userContext}
          />
          <div className="flex flex-col justify-between gap-1 text-xs leading-5 text-ts-muted sm:flex-row">
            <p id="tarot-context-help">{copy.contextHelp}</p>
            <p className="shrink-0 tabular-nums" id="tarot-context-count">
              {contextCountLabel}
            </p>
          </div>
        </div>
      </div>
    </details>
  );
}
