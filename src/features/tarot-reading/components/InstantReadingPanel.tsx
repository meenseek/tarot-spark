import {
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/visual/class-names";
import type { DrawnCard, InstantReadingV1, TarotCardId } from "@/domain/tarot";
import type { TarotReadingCopy } from "../i18n";

export type InstantReadingStatus =
  | "idle"
  | "loading"
  | "success"
  | "unavailable";

type InstantReadingPanelProps = {
  readonly cards: readonly DrawnCard[];
  readonly copy: TarotReadingCopy["instantReading"];
  readonly reading: InstantReadingV1 | undefined;
  readonly status: InstantReadingStatus;
  readonly onGenerate: () => void;
};

export function InstantReadingPanel({
  cards,
  copy,
  reading,
  status,
  onGenerate,
}: InstantReadingPanelProps) {
  const isLoading = status === "loading";

  return (
    <section
      aria-labelledby="instant-reading-heading"
      className="grid gap-4 rounded-ts-control border-2 border-ts-border bg-ts-blush p-4 sm:p-5"
    >
      <div className="grid gap-1">
        <h2
          className="font-ts-display text-2xl font-semibold text-ts-ink"
          id="instant-reading-heading"
        >
          {copy.heading}
        </h2>
        <p className="text-sm leading-6 text-ts-muted">{copy.intro}</p>
        <p className="text-xs leading-5 text-ts-muted">{copy.eligibility}</p>
        <p className="text-xs leading-5 text-ts-muted">{copy.disclosure}</p>
      </div>
      <p aria-live="polite" className="sr-only" role="status">
        {getStatusAnnouncement(copy, reading, status)}
      </p>

      {status === "success" && reading ? (
        <InstantReadingResult cards={cards} copy={copy} reading={reading} />
      ) : (
        <>
          <button
            aria-busy={isLoading}
            className={
              status === "unavailable"
                ? secondaryButtonClassName
                : primaryButtonClassName
            }
            disabled={isLoading}
            onClick={onGenerate}
            type="button"
          >
            {isLoading
              ? copy.loading
              : status === "unavailable"
                ? copy.retry
                : copy.generate}
          </button>
          {status === "unavailable" && (
            <p className="text-sm leading-6 text-ts-danger">
              {copy.unavailable}
            </p>
          )}
        </>
      )}
    </section>
  );
}

function getStatusAnnouncement(
  copy: TarotReadingCopy["instantReading"],
  reading: InstantReadingV1 | undefined,
  status: InstantReadingStatus,
) {
  if (status === "loading") {
    return copy.loading;
  }

  if (status === "unavailable") {
    return copy.unavailable;
  }

  return status === "success" ? reading?.headline : "";
}

function InstantReadingResult({
  cards,
  copy,
  reading,
}: {
  readonly cards: readonly DrawnCard[];
  readonly copy: TarotReadingCopy["instantReading"];
  readonly reading: InstantReadingV1;
}) {
  return (
    <article className="grid gap-5" data-testid="instant-reading-result">
      <div className="grid gap-2">
        <h3 className="font-ts-display text-2xl font-semibold leading-8 text-ts-ink">
          {reading.headline}
        </h3>
        <p className="text-base leading-7 text-ts-ink">{reading.synthesis}</p>
      </div>

      <div className="grid gap-3">
        {reading.positionReadings.map((positionReading) => {
          const drawnCard = cards.find(
            ({ card, position }) =>
              card.id === positionReading.cardId &&
              position.id === positionReading.positionId,
          );

          if (!drawnCard) {
            return null;
          }

          return (
            <section
              className="grid gap-1 border-l-2 border-ts-gold pl-3"
              key={`${positionReading.positionId}-${positionReading.cardId}`}
            >
              <p className="text-xs font-semibold text-ts-action">
                {drawnCard.position.label} · {drawnCard.card.name}
              </p>
              <p className="text-sm leading-6 text-ts-ink">
                {positionReading.interpretation}
              </p>
            </section>
          );
        })}
      </div>

      <ReadingDetail
        label={copy.strongestConnection}
        value={`${getCardNames(
          reading.strongestConnection.cardIds,
          cards,
        )} · ${copy.relationLabels[reading.strongestConnection.relationType]}\n${
          reading.strongestConnection.explanation
        }`}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <ReadingDetail label={copy.uncertainty} value={reading.uncertainty} />
        <ReadingDetail label={copy.nextStep} value={reading.nextStep} />
      </div>
      <ReadingDetail label={copy.reflection} value={reading.reflection} />
    </article>
  );
}

function ReadingDetail({ label, value }: { label: string; value: string }) {
  return (
    <section className="grid gap-1 rounded-ts-control border border-ts-divider bg-ts-surface p-3">
      <h4 className="text-xs font-semibold text-ts-action">{label}</h4>
      <p className="whitespace-pre-line text-sm leading-6 text-ts-ink">
        {value}
      </p>
    </section>
  );
}

function getCardNames(
  cardIds: readonly TarotCardId[],
  cards: readonly DrawnCard[],
) {
  return cardIds
    .map((cardId) => cards.find(({ card }) => card.id === cardId)?.card.name)
    .filter((name): name is string => Boolean(name))
    .join(" · ");
}
