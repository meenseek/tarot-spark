import Image from "next/image";
import {
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/visual/class-names";
import type { DrawnCard, ReadingLens, Topic } from "@/domain/tarot";
import type { TarotReadingCopy } from "../i18n";
import type { CopyState, KakaoShareState, ShareState } from "../types";

type ReadingResultProps = {
  readonly cards: readonly DrawnCard[];
  readonly copy: TarotReadingCopy;
  readonly copyState: CopyState;
  readonly hasKakaoShare: boolean;
  readonly instagramCopyState: CopyState;
  readonly kakaoShareState: KakaoShareState;
  readonly prompt: string;
  readonly readingLens: ReadingLens | undefined;
  readonly selectedTopic: Topic;
  readonly shareState: ShareState;
  readonly urlCopyState: CopyState;
  readonly onInstagramShare: () => void;
  readonly onKakaoShare: () => void;
  readonly onCopyPrompt: () => void;
  readonly onCopyUrl: () => void;
  readonly onShareReading: () => void;
};

export function ReadingResult({
  cards,
  copy,
  copyState,
  hasKakaoShare,
  instagramCopyState,
  kakaoShareState,
  prompt,
  readingLens,
  selectedTopic,
  shareState,
  urlCopyState,
  onInstagramShare,
  onKakaoShare,
  onCopyPrompt,
  onCopyUrl,
  onShareReading,
}: ReadingResultProps) {
  const actionGridClassName =
    "grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]";

  return (
    <div className="grid gap-4">
      {cards.length > 0 ? (
        <>
          <div className="grid gap-3">
            <p className="text-sm font-semibold text-ts-action">
              {selectedTopic.label}
            </p>
            <p className="text-base leading-7 text-ts-ink">
              {selectedTopic.resultFrame}
            </p>
          </div>

          <div className="grid gap-3">
            {cards.map(({ position, card }) => (
              <article
                className="rounded-ts-control border border-ts-divider bg-ts-canvas p-4"
                key={`${position.id}-${card.id}`}
              >
                <h3 className="font-ts-display text-base font-semibold text-ts-ink">
                  {position.label}: {card.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ts-muted">
                  {card.reflection}
                </p>
              </article>
            ))}
          </div>

          {readingLens && (
            <p className="text-sm font-semibold text-ts-action">
              {copy.interpretationLensLabel}: {readingLens.label}
            </p>
          )}

          <label className="grid gap-2 text-sm font-semibold text-ts-ink">
            {copy.generatedPromptLabel}
            <textarea
              className="min-h-56 resize-y rounded-ts-control border-2 border-ts-border bg-ts-surface p-4 font-ts-sans text-sm font-normal leading-6 text-ts-ink outline-none transition-colors duration-[var(--ts-motion-fast)] focus:border-ts-action focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action"
              readOnly
              value={prompt}
            />
          </label>

          <div className={actionGridClassName}>
            <button
              className={`${primaryButtonClassName} min-h-11 gap-2 px-3 py-2 leading-5`}
              onClick={onCopyPrompt}
              type="button"
            >
              <span className="whitespace-nowrap">
                {copyState === "copied" ? copy.copied : copy.copyPrompt}
              </span>
            </button>
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
                <span className="whitespace-nowrap">
                  {kakaoShareState === "opened"
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
              <span className="whitespace-nowrap">
                {instagramCopyState === "copied"
                  ? copy.instagramCopied
                  : copy.instagramShare}
              </span>
            </button>
            <button
              className={`${secondaryButtonClassName} gap-2 px-3`}
              onClick={onShareReading}
              type="button"
            >
              <span className="whitespace-nowrap">
                {getShareButtonLabel(copy, shareState)}
              </span>
            </button>
            <button
              className={`${secondaryButtonClassName} gap-2 px-3`}
              onClick={onCopyUrl}
              type="button"
            >
              <span className="whitespace-nowrap">
                {urlCopyState === "copied" ? copy.copiedUrl : copy.copyUrl}
              </span>
            </button>
          </div>
          {(copyState === "failed" ||
            instagramCopyState === "failed" ||
            kakaoShareState === "failed" ||
            shareState === "failed" ||
            urlCopyState === "failed") && (
            <p
              aria-live="polite"
              className="text-sm font-medium text-ts-danger"
              role="status"
            >
              {copy.blockedAction}
            </p>
          )}
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

function getShareButtonLabel(copy: TarotReadingCopy, shareState: ShareState) {
  if (shareState === "shared") {
    return copy.shared;
  }

  if (shareState === "copied") {
    return copy.copiedShareText;
  }

  return copy.share;
}
