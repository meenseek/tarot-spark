"use client";

import Image from "next/image";
import { useState } from "react";
import type { TarotCardId } from "@/domain/tarot";
import { TarotCardBack } from "./TarotCardBack";
import { TarotCardGlyph } from "./TarotCardGlyph";
import { cardArtSources } from "./tarot-card-art-sources";

type TarotCardArtProps = {
  readonly cardId: TarotCardId | undefined;
  readonly className?: string;
  readonly glyphClassName?: string;
  readonly shouldReveal?: boolean;
  readonly sizes?: string;
};

export function TarotCardArt({
  cardId,
  className = "object-cover",
  glyphClassName = "h-16 w-16",
  shouldReveal = false,
  sizes = "5rem",
}: TarotCardArtProps) {
  const artSource = cardId ? cardArtSources[cardId] : undefined;
  const [failedArtSource, setFailedArtSource] = useState<string>();
  const [readyArtSource, setReadyArtSource] = useState<string>();
  const centeredGlyphClassName = `absolute inset-0 m-auto ${glyphClassName}`;
  const cardBack = <TarotCardBack className="absolute inset-0 h-full w-full" />;

  if (!cardId || !artSource) {
    return cardBack;
  }

  if (failedArtSource !== artSource) {
    const isArtReady = readyArtSource === artSource;
    const revealClassName = !isArtReady
      ? "ts-card-art-pending"
      : shouldReveal
        ? "ts-card-face-reveal"
        : "";

    return (
      <>
        {cardBack}
        <Image
          alt=""
          aria-hidden="true"
          className={`${className} ${revealClassName}`}
          data-art-id={cardId}
          data-art-ready={isArtReady}
          fill
          onError={() => setFailedArtSource(artSource)}
          onLoad={() => setReadyArtSource(artSource)}
          sizes={sizes}
          src={artSource}
        />
      </>
    );
  }

  return <TarotCardGlyph cardId={cardId} className={centeredGlyphClassName} />;
}
