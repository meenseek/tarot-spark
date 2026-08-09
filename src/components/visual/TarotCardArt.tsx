"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type AnimationEvent } from "react";
import type { TarotCardId } from "@/domain/tarot";
import { TarotCardBack } from "./TarotCardBack";
import { cardArtSources } from "./tarot-card-art-sources";

type TarotCardArtProps = {
  readonly cardId: TarotCardId | undefined;
  readonly className?: string;
  readonly retryLabel: string;
  readonly revealSequence?: number;
  readonly shouldReveal?: boolean;
  readonly sizes?: string;
};

export function TarotCardArt({
  cardId,
  className = "object-cover",
  retryLabel,
  revealSequence = 0,
  shouldReveal = false,
  sizes = "5rem",
}: TarotCardArtProps) {
  const artSource = cardId ? cardArtSources[cardId] : undefined;
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [failedRequestKey, setFailedRequestKey] = useState<string>();
  const [readyRequestKey, setReadyRequestKey] = useState<string>();
  const [completedRevealKey, setCompletedRevealKey] = useState<string>();
  const artImageRef = useRef<HTMLImageElement>(null);
  const requestKey = `${artSource ?? "prepared"}:${retryAttempt}`;
  const cardBack = <TarotCardBack className="absolute inset-0 h-full w-full" />;

  useEffect(() => {
    const image = artImageRef.current;

    if (!artSource || !image?.complete) {
      return;
    }

    if (image.naturalWidth > 0) {
      setReadyRequestKey(requestKey);
    } else {
      setFailedRequestKey(requestKey);
    }
  }, [artSource, requestKey]);

  if (!cardId || !artSource) {
    return (
      <span className="absolute inset-0" data-card-visual-state="prepared">
        {cardBack}
      </span>
    );
  }

  const hasArtFailed = failedRequestKey === requestKey;
  const isArtReady = readyRequestKey === requestKey;
  const revealKey = `${cardId}:${requestKey}:${revealSequence}`;
  const isRevealComplete = !shouldReveal || completedRevealKey === revealKey;
  const shouldAnimate = isArtReady && shouldReveal && !isRevealComplete;
  const planeClassName = shouldAnimate
    ? "ts-card-plane ts-card-plane-flip"
    : isArtReady
      ? "ts-card-plane ts-card-plane-complete"
      : "ts-card-plane";
  const visualState = hasArtFailed
    ? "error"
    : !isArtReady
      ? "pending"
      : shouldAnimate
        ? "flipping"
        : "front";

  function finishReveal(event: AnimationEvent<HTMLSpanElement>) {
    if (
      event.target !== event.currentTarget ||
      event.currentTarget.dataset["revealSequence"] !== String(revealSequence)
    ) {
      return;
    }

    setCompletedRevealKey(revealKey);
  }

  return (
    <span
      className="ts-card-visual absolute inset-0"
      data-card-visual-state={visualState}
    >
      <span
        className={planeClassName}
        data-card-plane=""
        data-reveal-sequence={shouldReveal ? revealSequence : undefined}
        onAnimationEnd={finishReveal}
      >
        <span className="ts-card-face ts-card-face-back" data-card-face="back">
          {cardBack}
        </span>
        <span
          className="ts-card-face ts-card-face-front bg-ts-canvas text-ts-action"
          data-card-face="front"
        >
          <Image
            alt=""
            aria-hidden="true"
            className={`${className} ${isArtReady ? "" : "ts-card-art-pending"}`}
            data-art-id={cardId}
            data-art-ready={isArtReady}
            fill
            key={requestKey}
            loading="eager"
            onError={() => setFailedRequestKey(requestKey)}
            onLoad={() => setReadyRequestKey(requestKey)}
            ref={artImageRef}
            sizes={sizes}
            src={artSource}
          />
        </span>
      </span>
      {hasArtFailed ? (
        <button
          className="absolute inset-x-1 bottom-1 z-20 min-h-6 rounded-ts-inset border border-ts-divider bg-ts-surface/95 px-1 py-1 text-[0.5rem] font-semibold leading-tight text-ts-action shadow-ts-card sm:text-[0.6rem]"
          data-card-art-retry=""
          onClick={() => setRetryAttempt((attempt) => attempt + 1)}
          type="button"
        >
          {retryLabel}
        </button>
      ) : null}
    </span>
  );
}
