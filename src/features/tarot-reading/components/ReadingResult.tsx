import Image from "next/image";
import {
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/visual/class-names";
import {
  promptSlotIds,
  type DrawnCard,
  type PromptSlotId,
  type ReadingLens,
  type Topic,
} from "@/domain/tarot";
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
  readonly selectedPromptSlotId: PromptSlotId;
  readonly selectedTopic: Topic;
  readonly shareState: ShareState;
  readonly urlCopyState: CopyState;
  readonly onInstagramShare: () => void;
  readonly onKakaoShare: () => void;
  readonly onCopyPrompt: () => void;
  readonly onPromptSlotChange: (promptSlotId: PromptSlotId) => void;
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
  selectedPromptSlotId,
  selectedTopic,
  shareState,
  urlCopyState,
  onInstagramShare,
  onKakaoShare,
  onCopyPrompt,
  onPromptSlotChange,
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
                className="grid gap-4 rounded-ts-control border border-ts-divider bg-ts-canvas p-4"
                key={`${position.id}-${card.id}`}
              >
                <div className="grid gap-1 border-b border-ts-divider pb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ts-action">
                    {position.label}
                  </p>
                  <h3 className="font-ts-display text-xl font-semibold text-ts-ink">
                    {card.name}
                  </h3>
                  <p className="text-sm text-ts-muted">
                    {copy.cardDetails.archetype}: {card.archetype}
                  </p>
                </div>

                <div className="grid gap-4 text-sm sm:grid-cols-2">
                  <CardDetail
                    label={copy.cardDetails.keywords}
                    value={card.keywords.join(" · ")}
                  />
                  <CardDetail
                    label={copy.cardDetails.symbols}
                    value={card.symbols.join(" · ")}
                  />
                  <CardDetail
                    label={copy.cardDetails.light}
                    value={card.light}
                  />
                  <CardDetail
                    label={copy.cardDetails.shadow}
                    value={card.shadow}
                  />
                </div>

                <div className="grid gap-3 rounded-ts-inset border border-ts-divider bg-ts-surface p-4">
                  <CardDetail
                    label={copy.cardDetails.agency}
                    value={card.agency}
                  />
                  <CardDetail
                    label={copy.cardDetails.caution}
                    value={card.caution}
                  />
                  <CardDetail
                    label={copy.cardDetails.reflection}
                    value={card.reflection}
                  />
                </div>
              </article>
            ))}
          </div>

          {readingLens && (
            <p className="text-sm font-semibold text-ts-action">
              {copy.interpretationLensLabel}: {readingLens.label}
            </p>
          )}

          <section className="grid gap-3" aria-labelledby="prompt-pack-heading">
            <div className="grid gap-1">
              <h2
                className="font-ts-display text-2xl font-semibold text-ts-ink"
                id="prompt-pack-heading"
              >
                {copy.promptPack.heading}
              </h2>
              <p className="text-sm leading-6 text-ts-muted">
                {copy.promptPack.intro}
              </p>
            </div>
            <div
              aria-label={copy.promptPack.selectorLabel}
              className="grid gap-2 sm:grid-cols-2"
              role="group"
            >
              {promptSlotIds.map((promptSlotId) => {
                const slot = copy.promptPack.slots[promptSlotId];
                const isSelected = promptSlotId === selectedPromptSlotId;

                return (
                  <button
                    aria-pressed={isSelected}
                    className={`min-h-24 rounded-ts-control border-2 p-3 text-left transition-colors duration-[var(--ts-motion-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action ${
                      isSelected
                        ? "border-ts-action bg-ts-blush"
                        : "border-ts-border bg-ts-surface hover:border-ts-action hover:bg-ts-blush"
                    }`}
                    key={promptSlotId}
                    onClick={() => onPromptSlotChange(promptSlotId)}
                    type="button"
                  >
                    <span className="block text-sm font-semibold text-ts-ink">
                      {slot.label}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-ts-muted">
                      {slot.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <label className="grid gap-2 text-sm font-semibold text-ts-ink">
            {copy.generatedPromptLabel}:{" "}
            {copy.promptPack.slots[selectedPromptSlotId].label}
            <textarea
              aria-label={copy.generatedPromptLabel}
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

function getShareButtonLabel(copy: TarotReadingCopy, shareState: ShareState) {
  if (shareState === "shared") {
    return copy.shared;
  }

  if (shareState === "copied") {
    return copy.copiedShareText;
  }

  return copy.share;
}
