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
  return (
    <section
      aria-labelledby="reading-preferences-heading"
      className="grid gap-5 rounded-ts-panel border border-ts-divider bg-ts-surface p-4 shadow-ts-card"
    >
      <div className="grid gap-1">
        <h2
          className="text-lg font-semibold text-ts-ink"
          id="reading-preferences-heading"
        >
          {copy.personalizationHeading}
        </h2>
        <p className="text-sm leading-6 text-ts-muted">
          {copy.personalizationIntro}
        </p>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold text-ts-ink">
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
        <legend className="text-sm font-semibold text-ts-ink">
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
          className="min-h-28 resize-y rounded-ts-control border-2 border-ts-border bg-ts-canvas p-3 text-sm leading-6 text-ts-ink outline-none transition-colors duration-[var(--ts-motion-fast)] placeholder:text-ts-muted focus:border-ts-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action"
          id="tarot-user-context"
          maxLength={maxUserContextLength}
          onChange={(event) => onContextChange(event.currentTarget.value)}
          placeholder={copy.contextPlaceholder}
          value={userContext}
        />
        <div className="flex flex-col justify-between gap-1 text-xs leading-5 text-ts-muted sm:flex-row">
          <p id="tarot-context-help">{copy.contextHelp}</p>
          <p className="shrink-0 tabular-nums" id="tarot-context-count">
            {contextCountLabel}
          </p>
        </div>
      </div>
    </section>
  );
}
