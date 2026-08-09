import type { ReactNode } from "react";
import {
  primaryButtonClassName,
  secondaryButtonClassName,
} from "@/components/visual/class-names";
import type { DrawnCard, InstantReading, TarotCardId } from "@/domain/tarot";
import type { TarotReadingCopy } from "../i18n";

export type InstantReadingStatus =
  | "idle"
  | "loading"
  | "success"
  | "unavailable";

type InstantReadingPanelProps = {
  readonly cards: readonly DrawnCard[];
  readonly copy: TarotReadingCopy["instantReading"];
  readonly reading: InstantReading | undefined;
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
  reading: InstantReading | undefined,
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
  readonly reading: InstantReading;
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
        {reading.cardReadings.map((cardReading, index) => {
          const drawnCard = cards.find(
            ({ card }) => card.id === cardReading.cardId,
          );

          if (!drawnCard) {
            return null;
          }

          return (
            <section
              className="grid gap-1 border-l-2 border-ts-gold pl-3"
              key={cardReading.cardId}
            >
              <p className="text-xs font-semibold text-ts-action">
                {index + 1}. {drawnCard.card.name}
              </p>
              <p className="text-sm leading-6 text-ts-ink">
                {cardReading.interpretation}
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

      <ReadingGroup heading={copy.alternatives}>
        <p className="text-xs leading-5 text-ts-muted">
          {copy.alternativesNote}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <ReadingDetail
            label={copy.alternativeLabels.first}
            nested
            value={reading.alternatives[0]}
          />
          <ReadingDetail
            label={copy.alternativeLabels.second}
            nested
            value={reading.alternatives[1]}
          />
        </div>
      </ReadingGroup>

      <ReadingGroup heading={copy.realityCheck}>
        <div className="grid gap-3">
          <ReadingDetail
            label={copy.unknown}
            nested
            value={reading.realityCheck.unknown}
          />
          <ReadingDetail
            label={copy.observableDiscriminator}
            nested
            value={reading.realityCheck.observableDiscriminator}
          />
          <ReadingDetail
            label={copy.revisionCondition}
            nested
            value={reading.realityCheck.revisionCondition}
          />
        </div>
      </ReadingGroup>

      <ReadingGroup heading={copy.nextStep}>
        <div className="grid gap-3 sm:grid-cols-2">
          <ReadingDetail
            label={copy.action}
            nested
            value={reading.nextStep.action}
          />
          <ReadingDetail
            label={copy.stopOrReviewCondition}
            nested
            value={reading.nextStep.stopOrReviewCondition}
          />
        </div>
      </ReadingGroup>
      <ReadingDetail label={copy.reflection} value={reading.reflection} />
    </article>
  );
}

function ReadingGroup({
  children,
  heading,
}: {
  readonly children: ReactNode;
  readonly heading: string;
}) {
  return (
    <section className="grid gap-2">
      <h4 className="text-sm font-semibold text-ts-ink">{heading}</h4>
      {children}
    </section>
  );
}

function ReadingDetail({
  label,
  nested = false,
  value,
}: {
  readonly label: string;
  readonly nested?: boolean;
  readonly value: string;
}) {
  const Heading = nested ? "h5" : "h4";

  return (
    <section className="grid gap-1 rounded-ts-control border border-ts-divider bg-ts-surface p-3">
      <Heading className="text-xs font-semibold text-ts-action">
        {label}
      </Heading>
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
