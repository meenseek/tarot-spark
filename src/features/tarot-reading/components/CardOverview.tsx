import { TarotCardArt } from "@/components/visual/TarotCardArt";
import type { DrawnCard } from "@/domain/tarot";
import type { CSSProperties } from "react";

type CardOverviewProps = {
  readonly ariaLabel: string;
  readonly cards: readonly DrawnCard[];
  readonly retryLabel: string;
  readonly revealSequence: number;
};

export function CardOverview({
  ariaLabel,
  cards,
  retryLabel,
  revealSequence,
}: CardOverviewProps) {
  return (
    <section aria-label={ariaLabel} data-testid="card-overview">
      <ol className="grid grid-cols-3 gap-x-3 gap-y-5 py-2 sm:gap-x-6">
        {cards.map(({ card }, index) => (
          <li
            className={`grid min-w-0 grid-cols-[minmax(0,1fr)] content-start justify-items-center gap-1.5 text-center ${
              revealSequence > 0 ? "ts-card-arrive" : ""
            }`}
            data-card-id={card.id}
            data-overview-item={index}
            data-reveal-order={revealSequence > 0 ? index + 1 : undefined}
            data-reveal-sequence={
              revealSequence > 0 ? revealSequence : undefined
            }
            data-testid={`reading-card-${index}`}
            key={`${card.id}-${revealSequence}`}
            style={
              revealSequence > 0
                ? ({
                    "--ts-card-index": index,
                    "--ts-card-tilt": index % 2 === 0 ? "-1.15deg" : "1.15deg",
                  } as CSSProperties)
                : undefined
            }
          >
            <div
              className="relative aspect-[5/7] w-20 min-w-0 max-w-full overflow-hidden rounded-ts-control bg-ts-surface shadow-ts-card sm:w-28"
              data-card-art-frame=""
            >
              <TarotCardArt
                cardId={card.id}
                className="object-cover"
                retryLabel={retryLabel}
                revealSequence={revealSequence}
                shouldReveal={revealSequence > 0}
                sizes="(min-width: 640px) 112px, 80px"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 rounded-ts-control ring-1 ring-inset ring-ts-divider"
                data-card-art-frame-border=""
              />
            </div>
            <span className="mt-1 text-xs font-semibold leading-4 text-ts-action">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="font-ts-display text-sm font-semibold leading-5 text-ts-ink [overflow-wrap:anywhere] [word-break:keep-all] sm:text-lg sm:leading-6">
              {card.name}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
