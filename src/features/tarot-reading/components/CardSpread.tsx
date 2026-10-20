import { TarotCardArt } from "@/components/visual/TarotCardArt";
import type { DrawnCard, TarotCardId } from "@/domain/tarot";
import type { CSSProperties } from "react";

type DisplayCard = {
  readonly cardName: string;
  readonly cardId?: TarotCardId;
};

type CardSpreadProps = {
  readonly cards: readonly DrawnCard[];
  readonly cardCount: number;
  readonly cardMarkLabel: string;
  readonly placeholderCardName: string;
  readonly retryLabel: string;
  readonly revealSequence: number;
};

export function CardSpread({
  cards,
  cardCount,
  cardMarkLabel,
  placeholderCardName,
  retryLabel,
  revealSequence,
}: CardSpreadProps) {
  const shouldReveal = cards.length > 0 && revealSequence > 0;
  const displayCards: readonly DisplayCard[] =
    cards.length > 0
      ? cards.map(({ card }) => ({
          cardName: card.name,
          cardId: card.id,
        }))
      : Array.from({ length: cardCount }, () => ({
          cardName: placeholderCardName,
        }));

  return (
    <div className="grid grid-cols-3 gap-4">
      {displayCards.map((displayCard, index) => {
        const revealStyle = shouldReveal
          ? ({
              "--ts-card-index": index,
              "--ts-card-tilt": index % 2 === 0 ? "-1.15deg" : "1.15deg",
            } as CSSProperties)
          : undefined;

        return (
          <article
            className={`grid min-w-0 justify-items-center gap-2 text-center text-ts-ink ${
              shouldReveal ? "ts-card-arrive" : ""
            }`}
            data-card-id={displayCard.cardId}
            data-reveal-order={shouldReveal ? index + 1 : undefined}
            data-reveal-sequence={shouldReveal ? revealSequence : undefined}
            data-testid={`reading-card-${index}`}
            key={`${index}:${displayCard.cardId ?? "placeholder"}:${shouldReveal ? revealSequence : "static"}`}
            style={revealStyle}
          >
            <div
              className={
                displayCard.cardId
                  ? "text-xs font-semibold text-ts-muted"
                  : "sr-only"
              }
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
            </div>
            <div className="flex items-center justify-center">
              <div
                className="relative grid aspect-[5/7] w-20 max-w-full place-items-center overflow-hidden rounded-ts-control bg-ts-canvas text-ts-action shadow-ts-card sm:w-24"
                data-card-art-frame=""
              >
                <TarotCardArt
                  cardId={displayCard.cardId}
                  className="object-cover"
                  retryLabel={retryLabel}
                  revealSequence={revealSequence}
                  shouldReveal={shouldReveal}
                  sizes="(min-width: 640px) 96px, 80px"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-10 rounded-ts-control ring-1 ring-inset ring-ts-divider"
                  data-card-art-frame-border=""
                />
                <span className="sr-only">{cardMarkLabel}</span>
              </div>
            </div>
            <div className={displayCard.cardId ? "min-w-0" : "sr-only"}>
              <h2 className="font-ts-display text-xl font-semibold">
                {displayCard.cardName}
              </h2>
            </div>
          </article>
        );
      })}
    </div>
  );
}
