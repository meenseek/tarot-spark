import { TarotCardGlyph } from "@/components/visual/TarotCardGlyph";
import type { DrawnCard, TarotCardId } from "@/domain/tarot";
import type { TarotReadingCopy } from "../i18n";

type DisplayCard = {
  readonly positionLabel: string;
  readonly cardName: string;
  readonly cardTone: string;
  readonly cardId?: TarotCardId;
};

type CardSpreadProps = {
  readonly cards: readonly DrawnCard[];
  readonly placeholders: TarotReadingCopy["placeholders"];
  readonly cardMarkLabel: string;
};

export function CardSpread({
  cards,
  placeholders,
  cardMarkLabel,
}: CardSpreadProps) {
  const displayCards: readonly DisplayCard[] =
    cards.length > 0
      ? cards.map(({ position, card }) => ({
          positionLabel: position.label,
          cardName: card.name,
          cardTone: card.tone,
          cardId: card.id,
        }))
      : placeholders;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {displayCards.map((displayCard, index) => (
        <article
          className="grid min-h-56 grid-rows-[auto_1fr_auto] rounded-ts-control border border-ts-divider bg-ts-surface p-4 text-ts-ink shadow-ts-card"
          data-card-id={displayCard.cardId}
          key={displayCard.positionLabel}
        >
          <div className="flex items-start justify-between gap-3 text-xs font-semibold text-ts-muted">
            <span>{displayCard.positionLabel}</span>
            <span>{String(index + 1).padStart(2, "0")}</span>
          </div>
          <div className="flex items-center justify-center">
            <div className="grid h-28 w-20 place-items-center rounded-ts-control border border-ts-divider bg-ts-canvas text-ts-action">
              <TarotCardGlyph
                cardId={displayCard.cardId}
                className="h-16 w-16"
                placeholderIndex={index}
              />
              <span className="sr-only">{cardMarkLabel}</span>
            </div>
          </div>
          <div>
            <h2 className="font-ts-display text-xl font-semibold">
              {displayCard.cardName}
            </h2>
            <p className="mt-1 text-sm text-ts-muted">{displayCard.cardTone}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
