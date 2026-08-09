import { describe, expect, it } from "vitest";
import type { InstantReadingRequest } from "@/domain/tarot";
import { getTarotData } from "@/i18n/tarot-data";
import {
  buildInstantReadingPrompt,
  isInstantReadingRequestConsistent,
} from "./instant-reading";

const baseRequest = {
  cards: [
    { cardId: "the-fool" },
    { cardId: "the-magician" },
    { cardId: "the-high-priestess" },
  ],
  spreadId: "quick",
  styleId: "relational",
  topicId: "feelings",
} as const satisfies InstantReadingRequest;

describe("instant reading relationship question", () => {
  const tarotData = getTarotData("ko");

  it("adds the reviewed question focus to provider materials", () => {
    const request = {
      ...baseRequest,
      questionId: "mutual-view",
    } satisfies InstantReadingRequest;

    expect(isInstantReadingRequestConsistent(tarotData, request)).toBe(true);
    expect(buildInstantReadingPrompt(tarotData, request)).toContain(
      "선택한 성찰 질문: 내가 상대에게 기대하는 모습, 상대가 행동으로 보여준 신호, 서로 다르게 해석할 가능성과 확인할 대화를 나누어 주세요.",
    );
  });

  it("rejects unknown or topic-mismatched question presets", () => {
    expect(
      isInstantReadingRequestConsistent(tarotData, {
        ...baseRequest,
        questionId: "unknown",
      }),
    ).toBe(false);
    expect(
      isInstantReadingRequestConsistent(tarotData, {
        ...baseRequest,
        topicId: "love",
        questionId: "mutual-view",
      }),
    ).toBe(false);
  });
});
