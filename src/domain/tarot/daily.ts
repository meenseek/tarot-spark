import { tarotCardIds, type TarotCardId } from "./ids";
import { stableHash } from "./stable-hash";
import type { TarotCard } from "./types";

export const dailyQuestionAlgorithmVersion = "daily-v2";

export function getLocalDateKey(date: Date) {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Daily question date must be valid.");
  }

  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function getDailyTarotCardId(localDateKey: string): TarotCardId {
  assertLocalDateKey(localDateKey);

  const seed = [
    dailyQuestionAlgorithmVersion,
    localDateKey,
    tarotCardIds.join(","),
  ].join("|");
  const cardId = tarotCardIds[stableHash(seed) % tarotCardIds.length];

  if (!cardId) {
    throw new RangeError("Daily question card set must not be empty.");
  }

  return cardId;
}

export function getDailyTarotCard(
  cards: readonly TarotCard[],
  localDateKey: string,
) {
  const cardId = getDailyTarotCardId(localDateKey);
  const card = cards.find((candidate) => candidate.id === cardId);

  if (!card) {
    throw new RangeError(`Daily question card is missing: ${cardId}.`);
  }

  return card;
}

function assertLocalDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw new RangeError("Daily question date must use YYYY-MM-DD.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const daysInMonth = getDaysInMonth(year, month);

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) {
    throw new RangeError("Daily question date must be a calendar date.");
  }
}

function getDaysInMonth(year: number, month: number) {
  const monthLengths = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ] as const;

  return monthLengths[month - 1] ?? 0;
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
