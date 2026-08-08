"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type AnimationEvent } from "react";
import { getTarotCardDefinition, type TarotCardId } from "@/domain/tarot";
import { TarotCardBack } from "./TarotCardBack";
import { cardArtSources } from "./tarot-card-art-sources";

type TarotCardArtProps = {
  readonly cardId: TarotCardId | undefined;
  readonly cardName: string;
  readonly className?: string;
  readonly glyphClassName?: string;
  readonly revealSequence?: number;
  readonly shouldReveal?: boolean;
  readonly sizes?: string;
};

export function TarotCardArt({
  cardId,
  cardName,
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

  if (!cardId) {
    return (
      <span className="absolute inset-0" data-card-visual-state="prepared">
        {cardBack}
      </span>
    );
  }

  const hasNoApprovedArt = !artSource;
  const hasArtFailed = Boolean(artSource && failedArtSource === artSource);
  const isArtReady = readyArtSource === artSource;
  const isTextFallback = hasNoApprovedArt || hasArtFailed;
  const isFaceReady = isTextFallback || isArtReady;
  const revealKey = `${cardId}:${artSource ?? "text"}:${revealSequence}`;
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
      ? isTextFallback
        ? "flipping-fallback"
        : "flipping"
      : isTextFallback
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
          {isTextFallback ? (
            <TarotCardTextFace
              cardId={cardId}
              cardName={cardName}
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

function TarotCardTextFace({
  cardId,
  cardName,
  className,
}: {
  readonly cardId: TarotCardId;
  readonly cardName: string;
  readonly className: string;
}) {
  const definition = getTarotCardDefinition(cardId);
  const mark =
    definition.arcana === "major"
      ? definition.number === 0
        ? "0"
        : toRomanNumeral(definition.number)
      : `${definition.suit.slice(0, 1).toUpperCase()} · ${definition.rank.toUpperCase()}`;

  return (
    <span
      className={`${className} grid h-auto w-[82%] place-items-center gap-1 text-center`}
      data-card-text-face={cardId}
    >
      <span className="text-[0.55rem] font-semibold tracking-[0.16em] opacity-70">
        {mark}
      </span>
      <span className="break-words font-ts-display text-[0.7rem] font-semibold leading-tight">
        {cardName}
      </span>
    </span>
  );
}

function toRomanNumeral(value: number) {
  const numerals = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ] as const;
  let remaining = value;
  let result = "";

  for (const [amount, numeral] of numerals) {
    while (remaining >= amount) {
      result += numeral;
      remaining -= amount;
    }
  }

  return result;
}
