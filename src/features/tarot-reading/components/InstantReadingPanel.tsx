import { InlineMessage } from "@measure-twice/react";
import { type RefObject, useEffect, useRef } from "react";
import type { InstantReading } from "@/domain/tarot";
import type { TarotReadingCopy } from "../i18n";

export type InstantReadingStatus =
  | "idle"
  | "loading"
  | "success"
  | "unavailable";

type InstantReadingPanelProps = {
  readonly actionRef: RefObject<HTMLButtonElement | null>;
  readonly copy: TarotReadingCopy["instantReading"];
  readonly reading: InstantReading | undefined;
  readonly status: InstantReadingStatus;
};

export function InstantReadingPanel({
  actionRef,
  copy,
  reading,
  status,
}: InstantReadingPanelProps) {
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const previousStatusRef = useRef(status);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (status === "success" && previousStatus === "loading") {
      resultHeadingRef.current?.focus();
    }
    if (status === "unavailable" && previousStatus === "loading") {
      actionRef.current?.focus();
    }
  }, [actionRef, status]);

  const loading = status === "loading";
  const unavailable = status === "unavailable";

  return (
    <>
      <div
        aria-live="polite"
        className={loading || unavailable ? undefined : "sr-only"}
        role="status"
      >
        {loading && (
          <p className="text-sm leading-6 text-ts-muted">{copy.loading}</p>
        )}
        {unavailable && (
          <InlineMessage className="ts-feedback" tone="danger">
            {copy.unavailable}
          </InlineMessage>
        )}
      </div>
      {status === "success" && reading && (
        <section
          aria-labelledby="instant-reading-heading"
          className="grid gap-3 rounded-ts-control border border-ts-divider bg-ts-surface p-4 sm:p-5"
          data-testid="instant-reading-primary"
        >
          <h2
            className="font-ts-display text-2xl font-semibold text-ts-ink outline-none [&:lang(ko)]:break-keep"
            id="instant-reading-heading"
            ref={resultHeadingRef}
            tabIndex={-1}
          >
            {copy.resultHeading}
          </h2>
          <p className="text-xs leading-5 text-ts-muted">{copy.disclosure}</p>
          <article
            aria-labelledby="instant-reading-heading"
            data-testid="instant-reading-result"
          >
            <div className="max-w-[40rem] whitespace-pre-wrap text-base leading-8 text-ts-ink sm:text-lg [overflow-wrap:anywhere]">
              {reading.text}
            </div>
          </article>
        </section>
      )}
    </>
  );
}
