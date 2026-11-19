import { Button, InlineMessage } from "@measure-twice/react";
import { useEffect, useRef } from "react";
import type { InstantReading } from "@/domain/tarot";
import type { TarotReadingCopy } from "../i18n";
import type { CopyState } from "../types";

export type InstantReadingStatus =
  | "idle"
  | "loading"
  | "success"
  | "unavailable";

type InstantReadingPanelProps = {
  readonly secondary?: boolean;
  readonly generateLabel?: string | undefined;
  readonly contextNotice?: string | undefined;
  readonly copy: TarotReadingCopy["instantReading"];
  readonly reading: InstantReading | undefined;
  readonly status: InstantReadingStatus;
  readonly copyState: CopyState;
  readonly onCancel: () => void;
  readonly onCopyPrompt: () => void;
  readonly onGenerate: () => void;
};

export function InstantReadingPanel({
  copy,
  secondary = false,
  generateLabel,
  contextNotice,
  reading,
  status,
  copyState,
  onCancel,
  onCopyPrompt,
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
      <div className="grid gap-2">
        <h2
          className="font-ts-display text-2xl font-semibold text-ts-ink outline-none [&:lang(ko)]:break-keep"
          id="instant-reading-heading"
          ref={resultHeadingRef}
          tabIndex={status === "success" ? -1 : undefined}
        >
          {status === "success" ? copy.resultHeading : copy.heading}
        </h2>
        {status !== "success" && (
          <p className="text-sm leading-6 text-ts-muted">{copy.intro}</p>
        )}
        <p className="text-xs leading-5 text-ts-muted">{copy.disclosure}</p>
        {contextNotice && (
          <p className="text-sm leading-6 text-ts-ink">{contextNotice}</p>
        )}
      </div>

      <p
        aria-live="polite"
        className={isLoading ? "text-sm leading-6 text-ts-muted" : "sr-only"}
        role="status"
      >
        {isLoading
          ? copy.loading
          : status === "unavailable"
            ? copy.unavailable
            : ""}
      </p>

      {status === "success" && reading ? (
        <article
          aria-labelledby="instant-reading-heading"
          data-testid="instant-reading-result"
        >
          <div className="max-w-[40rem] whitespace-pre-wrap text-base leading-8 text-ts-ink sm:text-lg [overflow-wrap:anywhere]">
            {reading.text}
          </div>
        </article>
      ) : (
        <>
          <Button
            className={secondary ? "ts-secondary-action" : "ts-primary-action"}
            {...(secondary
              ? { tone: "neutral" as const, variant: "outline" as const }
              : {})}
            onClick={isLoading ? onCancel : onGenerate}
            ref={actionRef}
            type="button"
          >
            {isLoading
              ? copy.cancel
              : status === "unavailable"
                ? copy.retry
                : (generateLabel ?? copy.generate)}
          </Button>
          {status === "unavailable" && (
            <div className="grid gap-3">
              <InlineMessage className="ts-feedback" tone="danger">
                {copy.unavailable}
              </InlineMessage>
              <Button
                className="ts-secondary-action"
                onClick={onCopyPrompt}
                tone="neutral"
                type="button"
                variant="outline"
              >
                {copyState === "copied"
                  ? copy.recoveryCopied
                  : copy.recoveryCopy}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
