import { Textarea } from "@measure-twice/react";
import { maxUserContextLength } from "@/domain/tarot";
import type { TarotReadingCopy } from "../i18n";

type SituationContextInputProps = {
  readonly contextCountLabel: string;
  readonly contextPlaceholder: string;
  readonly copy: TarotReadingCopy;
  readonly onContextChange: (value: string) => void;
  readonly userContext: string;
};

export function SituationContextInput({
  contextCountLabel,
  contextPlaceholder,
  copy,
  onContextChange,
  userContext,
}: SituationContextInputProps) {
  return (
    <section
      aria-label={copy.contextLabel}
      className="grid gap-2"
      data-testid="situation-context"
    >
      <Textarea
        announceError={false}
        aria-describedby="tarot-context-help tarot-context-count"
        className="ts-textarea-input ts-textarea-input--context"
        id="tarot-user-context"
        label={`${copy.contextInputLabel} (${copy.contextOptional})`}
        maxLength={maxUserContextLength}
        onChange={(event) => onContextChange(event.currentTarget.value)}
        placeholder={contextPlaceholder}
        rows={2}
        value={userContext}
        wrapperClassName="ts-field ts-context-field"
      />
      <div className="grid gap-1 text-xs leading-5 text-ts-muted">
        <p id="tarot-context-help">{copy.contextHelp}</p>
        <p className="text-right tabular-nums" id="tarot-context-count">
          {contextCountLabel}
        </p>
      </div>
    </section>
  );
}
