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
      <ol className="grid grid-cols-3 gap-2 sm:gap-3">
        {cards.map(({ card }, index) => (
          <li
            className={`grid min-w-0 content-start justify-items-center gap-1 rounded-ts-control border border-ts-divider bg-ts-canvas px-1.5 py-2 text-center sm:px-2 ${
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
              className="relative aspect-[5/7] w-12 overflow-hidden rounded-ts-inset bg-ts-surface sm:w-14"
              data-card-art-frame=""
            >
              <TarotCardArt
                cardId={card.id}
                className="object-cover"
                retryLabel={retryLabel}
                revealSequence={revealSequence}
                shouldReveal={revealSequence > 0}
                sizes="3.5rem"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 rounded-ts-inset ring-1 ring-inset ring-ts-divider"
                data-card-art-frame-border=""
              />
            </div>
            <span className="text-[0.6875rem] font-semibold leading-4 text-ts-action sm:text-xs">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-xs font-semibold leading-4 text-ts-ink sm:text-sm sm:leading-5">
              {card.name}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
