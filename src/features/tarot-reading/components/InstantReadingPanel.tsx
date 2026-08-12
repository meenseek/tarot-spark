import { Button, InlineMessage } from "@measure-twice/react";
import { useEffect, useRef } from "react";
import type { InstantReading } from "@/domain/tarot";
import type { TarotReadingCopy } from "../i18n";

export type InstantReadingStatus =
  | "idle"
  | "loading"
  | "success"
  | "unavailable";

type InstantReadingPanelProps = {
  readonly copy: TarotReadingCopy["instantReading"];
  readonly reading: InstantReading | undefined;
  readonly status: InstantReadingStatus;
  readonly onCancel: () => void;
  readonly onGenerate: () => void;
};

export function InstantReadingPanel({
  copy,
  reading,
  status,
  onCancel,
  onGenerate,
}: InstantReadingPanelProps) {
  const actionRef = useRef<HTMLButtonElement | null>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const previousStatusRef = useRef(status);
  const isLoading = status === "loading";

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (status === "success" && previousStatus === "loading") {
      resultHeadingRef.current?.focus();
    }
    if (status === "unavailable" && previousStatus === "loading") {
      actionRef.current?.focus();
    }
  }, [status]);

  return (
    <section
      aria-labelledby="instant-reading-heading"
      className="grid gap-4 rounded-ts-control border border-ts-divider bg-ts-surface p-4 sm:p-5"
    >
      <div className="grid gap-1">
        <h2
          className="font-ts-display text-2xl font-semibold text-ts-ink"
          id="instant-reading-heading"
        >
          {copy.heading}
        </h2>
        <p className="text-sm leading-6 text-ts-muted">{copy.intro}</p>
        <p className="text-xs leading-5 text-ts-muted">{copy.disclosure}</p>
      </div>

      <p aria-live="polite" className="sr-only" role="status">
        {isLoading
          ? copy.loading
          : status === "unavailable"
            ? copy.unavailable
            : ""}
      </p>

      {status === "success" && reading ? (
        <article className="grid gap-3" data-testid="instant-reading-result">
          <h3
            className="font-ts-display text-xl font-semibold text-ts-ink outline-none"
            ref={resultHeadingRef}
            tabIndex={-1}
          >
            {copy.resultHeading}
          </h3>
          <div className="whitespace-pre-wrap text-sm leading-7 text-ts-ink [overflow-wrap:anywhere]">
            {reading.text}
          </div>
        </article>
      ) : (
        <>
          <Button
            className="ts-secondary-action"
            onClick={isLoading ? onCancel : onGenerate}
            ref={actionRef}
            tone="neutral"
            type="button"
            variant="outline"
          >
            {isLoading
              ? copy.cancel
              : status === "unavailable"
                ? copy.retry
                : copy.generate}
          </Button>
          {status === "unavailable" && (
            <InlineMessage className="ts-feedback" tone="danger">
              {copy.unavailable}
            </InlineMessage>
          )}
        </>
      )}
    </section>
  );
}
