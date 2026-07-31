"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type AnimationEvent } from "react";
import type { TarotCardId } from "@/domain/tarot";
import { TarotCardBack } from "./TarotCardBack";
import { TarotCardGlyph } from "./TarotCardGlyph";
import { cardArtSources } from "./tarot-card-art-sources";

type TarotCardArtProps = {
  readonly cardId: TarotCardId | undefined;
  readonly className?: string;
  readonly glyphClassName?: string;
  readonly revealSequence?: number;
  readonly shouldReveal?: boolean;
  readonly sizes?: string;
};

export function TarotCardArt({
  cardId,
  className = "object-cover",
  glyphClassName = "h-16 w-16",
  revealSequence = 0,
  shouldReveal = false,
  sizes = "5rem",
}: TarotCardArtProps) {
  const artSource = cardId ? cardArtSources[cardId] : undefined;
  const [failedArtSource, setFailedArtSource] = useState<string>();
  const [readyArtSource, setReadyArtSource] = useState<string>();
  const [completedRevealKey, setCompletedRevealKey] = useState<string>();
  const artImageRef = useRef<HTMLImageElement>(null);
  const centeredGlyphClassName = `absolute inset-0 m-auto ${glyphClassName}`;
  const cardBack = <TarotCardBack className="absolute inset-0 h-full w-full" />;

  useEffect(() => {
    const image = artImageRef.current;

    if (!artSource || !image?.complete) {
      return;
    }

    if (image.naturalWidth > 0) {
      setReadyArtSource(artSource);
    } else {
      setFailedArtSource(artSource);
    }
  }, [artSource]);

  if (!cardId || !artSource) {
    return (
      <span className="absolute inset-0" data-card-visual-state="prepared">
        {cardBack}
      </span>
    );
  }

  const hasArtFailed = failedArtSource === artSource;
  const isArtReady = readyArtSource === artSource;
  const isFaceReady = hasArtFailed || isArtReady;
  const revealKey = `${artSource}:${revealSequence}`;
  const isRevealComplete = !shouldReveal || completedRevealKey === revealKey;
  const shouldAnimate = isFaceReady && shouldReveal && !isRevealComplete;
  const planeClassName = shouldAnimate
    ? "ts-card-plane ts-card-plane-flip"
    : isFaceReady
      ? "ts-card-plane ts-card-plane-complete"
      : "ts-card-plane";
  const visualState = !isFaceReady
    ? "pending"
    : shouldAnimate
      ? hasArtFailed
        ? "flipping-fallback"
        : "flipping"
      : hasArtFailed
        ? "fallback"
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
          {hasArtFailed ? (
            <TarotCardGlyph
              cardId={cardId}
              className={centeredGlyphClassName}
            />
          ) : (
            <Image
              alt=""
              aria-hidden="true"
              className={`${className} ${isArtReady ? "" : "ts-card-art-pending"}`}
              data-art-id={cardId}
              data-art-ready={isArtReady}
              fill
              loading="eager"
              onError={() => setFailedArtSource(artSource)}
              onLoad={() => setReadyArtSource(artSource)}
              ref={artImageRef}
              sizes={sizes}
              src={artSource}
            />
          )}
        </span>
      </span>
    </span>
  );
}
