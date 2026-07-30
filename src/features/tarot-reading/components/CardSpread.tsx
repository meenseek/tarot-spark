import { TarotCardArt } from "@/components/visual/TarotCardArt";
import type { DrawnCard, SpreadPosition, TarotCardId } from "@/domain/tarot";
import type { CSSProperties } from "react";

type DisplayCard = {
  readonly positionLabel: string;
  readonly cardName: string;
  readonly cardTone: string;
  readonly cardId?: TarotCardId;
};

type CardSpreadProps = {
  readonly cards: readonly DrawnCard[];
  readonly cardMarkLabel: string;
  readonly placeholderCardName: string;
  readonly placeholderCardTone: string;
  readonly positions: readonly SpreadPosition[];
  readonly revealSequence: number;
};

export function CardSpread({
  cards,
  cardMarkLabel,
  placeholderCardName,
  placeholderCardTone,
  positions,
  revealSequence,
}: CardSpreadProps) {
  const shouldReveal = cards.length > 0 && revealSequence > 0;
  const displayCards: readonly DisplayCard[] =
    cards.length > 0
      ? cards.map(({ position, card }) => ({
          positionLabel: position.label,
          cardName: card.name,
          cardTone: card.tone,
          cardId: card.id,
        }))
      : positions.map((position) => ({
          positionLabel: position.label,
          cardName: placeholderCardName,
          cardTone: placeholderCardTone,
        }));

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {displayCards.map((displayCard, index) => {
        const revealStyle = shouldReveal
          ? ({
              "--ts-card-index": index,
            } as CSSProperties)
          : undefined;

        return (
          <article
            className={`grid min-h-56 grid-rows-[auto_1fr_auto] rounded-ts-control border border-ts-divider bg-ts-surface p-4 text-ts-ink shadow-ts-card ${
              shouldReveal ? "ts-card-arrive" : ""
            }`}
            data-card-id={displayCard.cardId}
            data-reveal-order={shouldReveal ? index + 1 : undefined}
            data-reveal-sequence={shouldReveal ? revealSequence : undefined}
            data-testid={`reading-card-${index}`}
            key={`${displayCard.positionLabel}:${displayCard.cardId ?? "placeholder"}:${shouldReveal ? revealSequence : "static"}`}
            style={revealStyle}
          >
            <div className="flex items-start justify-between gap-3 text-xs font-semibold text-ts-muted">
              <span>{displayCard.positionLabel}</span>
              <span>{String(index + 1).padStart(2, "0")}</span>
            </div>
            <div className="flex items-center justify-center">
              <div
                className={`relative grid h-28 w-20 place-items-center overflow-hidden rounded-ts-control border border-ts-divider bg-ts-canvas text-ts-action ${
                  shouldReveal ? "ts-card-face-reveal" : ""
                }`}
                data-card-art-frame=""
              >
                <TarotCardArt
                  cardId={displayCard.cardId}
                  className="object-cover"
                  glyphClassName="h-16 w-16"
                  placeholderIndex={index}
                  sizes="5rem"
                />
                <span className="sr-only">{cardMarkLabel}</span>
              </div>
            </div>
            <div>
              <h2 className="font-ts-display text-xl font-semibold">
                {displayCard.cardName}
              </h2>
              <p className="mt-1 text-sm text-ts-muted">
                {displayCard.cardTone}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
