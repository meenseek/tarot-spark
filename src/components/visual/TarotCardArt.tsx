"use client";

import Image from "next/image";
import { useState } from "react";
import type { TarotCardId } from "@/domain/tarot";
import { TarotCardGlyph } from "./TarotCardGlyph";
import { cardArtSources } from "./tarot-card-art-sources";

type TarotCardArtProps = {
  readonly cardId: TarotCardId | undefined;
  readonly className?: string;
  readonly glyphClassName?: string;
  readonly placeholderIndex?: number;
  readonly shouldReveal?: boolean;
  readonly sizes?: string;
};

export function TarotCardArt({
  cardId,
  className = "object-cover",
  glyphClassName = "h-16 w-16",
  placeholderIndex = 0,
  shouldReveal = false,
  sizes = "5rem",
}: TarotCardArtProps) {
  const artSource = cardId ? cardArtSources[cardId] : undefined;
  const [failedArtSource, setFailedArtSource] = useState<string>();
  const [readyArtSource, setReadyArtSource] = useState<string>();

  if (artSource && failedArtSource !== artSource) {
    const isArtReady = readyArtSource === artSource;
    const revealClassName = shouldReveal
      ? isArtReady
        ? "ts-card-face-reveal"
        : "ts-card-art-pending"
      : "";

    return (
      <>
        <TarotCardGlyph
          cardId={cardId}
          className={glyphClassName}
          placeholderIndex={placeholderIndex}
        />
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

  return (
    <TarotCardGlyph
      cardId={cardId}
      className={glyphClassName}
      placeholderIndex={placeholderIndex}
    />
  );
}
