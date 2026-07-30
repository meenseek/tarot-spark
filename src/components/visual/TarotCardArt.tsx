"use client";

import Image from "next/image";
import { useState } from "react";
import type { TarotCardId } from "@/domain/tarot";
import { TarotCardGlyph } from "./TarotCardGlyph";
import { pilotArtSources } from "./tarot-card-art-sources";

type TarotCardArtProps = {
  readonly cardId: TarotCardId | undefined;
  readonly className?: string;
  readonly glyphClassName?: string;
  readonly placeholderIndex?: number;
  readonly sizes?: string;
};

export function TarotCardArt({
  cardId,
  className = "object-cover",
  glyphClassName = "h-16 w-16",
  placeholderIndex = 0,
  sizes = "5rem",
}: TarotCardArtProps) {
  const artSource = cardId ? pilotArtSources[cardId] : undefined;
  const [failedArtSource, setFailedArtSource] = useState<string>();

  if (artSource && failedArtSource !== artSource) {
    return (
      <Image
        alt=""
        aria-hidden="true"
        className={className}
        data-art-id={cardId}
        fill
        onError={() => setFailedArtSource(artSource)}
        sizes={sizes}
        src={artSource}
      />
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
