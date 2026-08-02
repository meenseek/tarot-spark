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
              "--ts-card-tilt": index % 2 === 0 ? "-1.15deg" : "1.15deg",
            } as CSSProperties)
          : undefined;

        return (
          <article
            className={`grid grid-cols-[6rem_minmax(0,1fr)] grid-rows-[auto_1fr] gap-x-4 rounded-ts-control border border-ts-divider bg-ts-surface p-4 text-left text-ts-ink shadow-ts-card sm:min-h-56 sm:grid-cols-1 sm:grid-rows-[auto_1fr_auto] sm:gap-x-0 sm:p-2 ${
              shouldReveal ? "ts-card-arrive" : ""
            }`}
            data-card-id={displayCard.cardId}
            data-reveal-order={shouldReveal ? index + 1 : undefined}
            data-reveal-sequence={shouldReveal ? revealSequence : undefined}
            data-testid={`reading-card-${index}`}
            key={`${displayCard.positionLabel}:${displayCard.cardId ?? "placeholder"}:${shouldReveal ? revealSequence : "static"}`}
            style={revealStyle}
          >
            <div className="col-start-2 row-start-1 flex min-w-0 items-start justify-between gap-3 text-xs font-semibold text-ts-muted sm:col-start-1">
              <span>{displayCard.positionLabel}</span>
              <span>{String(index + 1).padStart(2, "0")}</span>
            </div>
            <div className="col-start-1 row-span-2 row-start-1 flex items-center justify-center sm:col-start-1 sm:row-span-1 sm:row-start-2">
              <div
                className="relative grid aspect-[5/7] w-24 place-items-center overflow-hidden rounded-ts-control bg-ts-canvas text-ts-action sm:w-22"
                data-card-art-frame=""
              >
                <TarotCardArt
                  cardId={displayCard.cardId}
                  className="object-cover"
                  glyphClassName="h-20 w-20 sm:h-18 sm:w-18"
                  revealSequence={revealSequence}
                  shouldReveal={shouldReveal}
                  sizes="(max-width: 639px) 6rem, 5.5rem"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-10 rounded-ts-control ring-1 ring-inset ring-ts-divider"
                  data-card-art-frame-border=""
                />
                <span className="sr-only">{cardMarkLabel}</span>
              </div>
            </div>
            <div className="col-start-2 row-start-2 min-w-0 self-end sm:col-start-1 sm:row-start-3">
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
