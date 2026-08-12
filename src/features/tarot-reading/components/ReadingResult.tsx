"use client";

import { Button, InlineMessage } from "@measure-twice/react";
import Image from "next/image";
import { type ReactNode, type Ref, useEffect, useRef } from "react";
import { secondaryButtonClassName } from "@/components/visual/class-names";
import type { DrawnCard, InstantReading } from "@/domain/tarot";
import type { TarotReadingCopy } from "../i18n";
import type { CopyState, ShareFeedback } from "../types";
import {
  InstantReadingPanel,
  type InstantReadingStatus,
} from "./InstantReadingPanel";

type ReadingResultProps = {
  readonly cards: readonly DrawnCard[];
  readonly afterPromptAction?: ReactNode;
  readonly copy: TarotReadingCopy;
  readonly copyState: CopyState;
  readonly currentCustomization?: ReactNode;
  readonly hasKakaoShare: boolean;
  readonly hasUserContext: boolean;
  readonly instantReading: InstantReading | undefined;
  readonly instantReadingEnabled: boolean;
  readonly instantReadingStatus: InstantReadingStatus;
  readonly prompt: string;
  readonly promptReadyRef?: Ref<HTMLElement>;
  readonly resultActions?: ReactNode;
  readonly shareFeedback: ShareFeedback | undefined;
  readonly shareUrl: string;
  readonly onInstagramShare: () => void;
  readonly onCancelInstantReading: () => void;
  readonly onGenerateInstantReading: () => void;
  readonly onKakaoShare: () => void;
  readonly onCopyPrompt: () => void;
  readonly onCopyUrl: () => void;
  readonly onShareReading: () => void;
};

export function ReadingResult({
  cards,
  afterPromptAction,
  copy,
  copyState,
  currentCustomization,
  hasKakaoShare,
  hasUserContext,
  instantReading,
  instantReadingEnabled,
  instantReadingStatus,
  prompt,
  promptReadyRef,
  resultActions,
  shareFeedback,
  shareUrl,
  onInstagramShare,
  onCancelInstantReading,
  onGenerateInstantReading,
  onKakaoShare,
  onCopyPrompt,
  onCopyUrl,
  onShareReading,
}: ReadingResultProps) {
  const promptDisclosureRef = useRef<HTMLDetailsElement | null>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const shareDisclosureRef = useRef<HTMLDetailsElement | null>(null);
  const manualShareUrlRef = useRef<HTMLInputElement | null>(null);
  const actionGridClassName =
    "grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]";
  const hasShareFailure = shareFeedback?.status === "failed";

  useEffect(() => {
    if (copyState !== "failed") {
      return;
    }

    if (promptDisclosureRef.current) {
      promptDisclosureRef.current.open = true;
    }
    promptTextareaRef.current?.focus();
    promptTextareaRef.current?.select();
  }, [copyState]);

  useEffect(() => {
    if (!hasShareFailure) {
      return;
    }

    if (shareDisclosureRef.current) {
      shareDisclosureRef.current.open = true;
    }
    manualShareUrlRef.current?.focus();
    manualShareUrlRef.current?.select();
  }, [hasShareFailure]);

  return (
    <div className="grid gap-4">
      {cards.length > 0 ? (
        <>
          <section
            aria-labelledby="prompt-ready-heading"
            className="flex flex-col gap-3 rounded-ts-control border-2 border-ts-action bg-ts-blush p-4 sm:flex-row sm:items-center sm:justify-between"
            data-analytics-result-view-target=""
            data-testid="prompt-ready"
            ref={promptReadyRef}
          >
            <div className="grid gap-1">
              <h2
                className="font-ts-display text-xl font-semibold text-ts-ink"
                id="prompt-ready-heading"
              >
                {copy.promptReady}
              </h2>
              {hasUserContext && (
                <p className="text-xs leading-5 text-ts-muted">
                  {copy.promptContextIncluded}
                </p>
              )}
              <ol className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-ts-action">
                {cards.map(({ card }, index) => (
                  <li key={card.id}>
                    {index + 1}. {card.name}
                  </li>
                ))}
              </ol>
            </div>
            <Button
              className="tarot-mt-button tarot-mt-button--primary shrink-0 whitespace-nowrap"
              onClick={onCopyPrompt}
              type="button"
            >
              {copyState === "copied" ? copy.copied : copy.copyPrompt}
            </Button>
          </section>

          {copyState === "copied" && (
            <div
              aria-live="polite"
              data-testid="prompt-copy-success"
              role="status"
            >
              <InlineMessage className="tarot-mt-feedback" tone="success">
                {copy.promptCopySuccess}
              </InlineMessage>
            </div>
          )}

          {copyState === "failed" && (
            <div aria-live="polite" id="prompt-copy-failure" role="status">
              <InlineMessage className="tarot-mt-feedback" tone="danger">
                {copy.promptCopyBlockedAction}
              </InlineMessage>
            </div>
          )}

          {afterPromptAction}

          {resultActions}

          {instantReadingEnabled && (
            <InstantReadingPanel
              copy={copy.instantReading}
              onCancel={onCancelInstantReading}
              onGenerate={onGenerateInstantReading}
              reading={instantReading}
              status={instantReadingStatus}
            />
          )}

          {currentCustomization}

          <details
            className="group rounded-ts-control border border-ts-divider bg-ts-surface"
            data-testid="prompt-content-disclosure"
            ref={promptDisclosureRef}
            suppressHydrationWarning
          >
            <summary className={disclosureSummaryClassName}>
              <span className="font-semibold text-ts-ink">
                <span className="group-open:hidden">
                  {copy.promptContentDisclosure}
                </span>
                <span className="hidden group-open:inline">
                  {copy.promptContentClose}
                </span>
              </span>
              <DisclosureChevron />
            </summary>
            <div className="border-t border-ts-divider p-4">
              <label className="grid gap-2 text-sm font-semibold text-ts-ink">
                {copy.generatedPromptLabel}
                <textarea
                  aria-describedby={
                    copyState === "failed" ? "prompt-copy-failure" : undefined
                  }
                  aria-label={copy.generatedPromptLabel}
                  className="min-h-56 resize-y rounded-ts-control border-2 border-ts-border bg-ts-surface p-4 font-ts-sans text-sm font-normal leading-6 text-ts-ink outline-none transition-colors duration-[var(--ts-motion-fast)] focus:border-ts-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action"
                  readOnly
                  ref={promptTextareaRef}
                  value={prompt}
                />
              </label>
            </div>
          </details>

          <details
            className="group rounded-ts-control border border-ts-divider bg-ts-surface"
            data-testid="card-details-disclosure"
            suppressHydrationWarning
          >
            <summary className={disclosureSummaryClassName}>
              <span className="font-semibold text-ts-ink">
                {copy.cardDetailsDisclosure}
              </span>
              <span className="flex items-center gap-2 text-xs text-ts-muted">
                <span>{cards.length}</span>
                <DisclosureChevron />
              </span>
            </summary>
            <div
              className="grid gap-3 border-t border-ts-divider p-4"
              data-testid="card-detail-list"
            >
              {cards.map(({ card }, index) => (
                <article
                  className="grid gap-4 rounded-ts-control border border-ts-divider bg-ts-canvas p-4"
                  key={card.id}
                >
                  <div className="grid gap-1 border-b border-ts-divider pb-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ts-action">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="font-ts-display text-xl font-semibold text-ts-ink">
                      {card.name}
                    </h3>
                  </div>

                  <div className="grid gap-3 rounded-ts-inset border border-ts-divider bg-ts-surface p-4">
                    <CardDetail
                      label={copy.cardDetails.meaning}
                      value={card.meaning}
                    />
                    <CardDetail
                      label={copy.cardDetails.reflection}
                      value={card.reflection}
                    />
                  </div>
                </article>
              ))}
            </div>
          </details>

          <details
            className="group rounded-ts-control border border-ts-divider bg-ts-surface"
            data-testid="share-options-disclosure"
            ref={shareDisclosureRef}
            suppressHydrationWarning
          >
            <summary className={disclosureSummaryClassName}>
              <span className="font-semibold text-ts-ink">
                {copy.shareOptionsDisclosure}
              </span>
              <DisclosureChevron />
            </summary>
            <div className="grid gap-3 border-t border-ts-divider p-4">
              <div className={actionGridClassName}>
                {hasKakaoShare && (
                  <button
                    className={`${secondaryButtonClassName} gap-2 px-3`}
                    onClick={onKakaoShare}
                    type="button"
                  >
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#FEE500]">
                      <Image
                        alt=""
                        aria-hidden="true"
                        className="h-4 w-4"
                        height={16}
                        src="/brand/kakaotalk-symbol.svg"
                        width={16}
                      />
                    </span>
                    <span className="min-w-0 break-words leading-5">
                      {shareFeedback?.method === "kakaotalk" &&
                      shareFeedback.status === "opened"
                        ? copy.kakaoShared
                        : copy.kakaoShare}
                    </span>
                  </button>
                )}
                <button
                  className={`${secondaryButtonClassName} gap-2 px-3`}
                  onClick={onInstagramShare}
                  type="button"
                >
                  <Image
                    alt=""
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0"
                    height={20}
                    src="/brand/instagram-glyph-gradient.png"
                    width={20}
                  />
                  <span className="min-w-0 break-words leading-5">
                    {shareFeedback?.method === "instagram_copy_url" &&
                    shareFeedback.status === "copied"
                      ? copy.instagramCopied
                      : copy.instagramShare}
                  </span>
                </button>
                <button
                  className={`${secondaryButtonClassName} gap-2 px-3`}
                  onClick={onShareReading}
                  type="button"
                >
                  <span className="min-w-0 break-words leading-5">
                    {getShareButtonLabel(copy, shareFeedback)}
                  </span>
                </button>
                <button
                  className={`${secondaryButtonClassName} gap-2 px-3`}
                  onClick={onCopyUrl}
                  type="button"
                >
                  <span className="min-w-0 break-words leading-5">
                    {shareFeedback?.method === "copy_url" &&
                    shareFeedback.status === "copied"
                      ? copy.copiedUrl
                      : copy.copyUrl}
                  </span>
                </button>
              </div>
              {hasShareFailure && (
                <div className="grid gap-2" data-testid="manual-share-fallback">
                  <div aria-live="polite" id="share-failure" role="status">
                    <InlineMessage className="tarot-mt-feedback" tone="danger">
                      {copy.shareBlockedAction}
                    </InlineMessage>
                  </div>
                  <label className="grid gap-2 text-sm font-semibold text-ts-ink">
                    {copy.manualShareUrlLabel}
                    <input
                      aria-describedby="share-failure"
                      aria-label={copy.manualShareUrlLabel}
                      className="min-h-11 rounded-ts-control border-2 border-ts-border bg-ts-surface px-3 py-2 font-ts-sans text-sm font-normal text-ts-ink outline-none focus:border-ts-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action"
                      readOnly
                      ref={manualShareUrlRef}
                      value={shareUrl}
                    />
                  </label>
                </div>
              )}
            </div>
          </details>
        </>
      ) : (
        <div className="rounded-ts-control border border-ts-divider bg-ts-canvas p-4">
          <h2 className="text-xl font-semibold text-ts-ink">
            {copy.emptyHeading}
          </h2>
          <p className="mt-2 text-sm leading-6 text-ts-muted">
            {copy.emptyBody}
          </p>
        </div>
      )}
    </div>
  );
}

const disclosureSummaryClassName =
  "flex min-h-12 cursor-pointer list-none flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-ts-control px-4 py-3 text-sm marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action [&::-webkit-details-marker]:hidden";

function DisclosureChevron() {
  return (
    <span
      aria-hidden="true"
      className="text-base text-ts-action transition-transform duration-[var(--ts-motion-fast)] group-open:rotate-180"
    >
      ⌄
    </span>
  );
}

function CardDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid content-start gap-1">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ts-action">
        {label}
      </p>
      <p className="m-0 text-sm leading-6 text-ts-muted">{value}</p>
    </div>
  );
}

function getShareButtonLabel(
  copy: TarotReadingCopy,
  shareFeedback: ShareFeedback | undefined,
) {
  if (shareFeedback?.method === "native" && shareFeedback.status === "shared") {
    return copy.shared;
  }

  if (
    shareFeedback?.method === "clipboard" &&
    shareFeedback.status === "copied"
  ) {
    return copy.copiedShareText;
  }

  return copy.share;
}
