import { describe, expect, it } from "vitest";
import {
  getInstantReadingSafetyViolation,
  getInstantReadingVisibleText,
  parseInstantReading,
  parseInstantReadingRequest,
  type InstantReadingRequest,
} from "./instant-reading";

const request = {
  cards: [
    { cardId: "the-fool", positionId: "spark" },
    { cardId: "the-magician", positionId: "shadow" },
    { cardId: "the-high-priestess", positionId: "next-step" },
  ],
  lensId: "choice-and-agency",
  spreadId: "quick",
  styleId: "balanced",
  topicId: "love",
} satisfies InstantReadingRequest;

describe("instant reading contract", () => {
  it("accepts only canonical request ids in spread order", () => {
    expect(parseInstantReadingRequest(request)).toEqual(request);
    expect(
      parseInstantReadingRequest({
        ...request,
        cards: [request.cards[1], request.cards[0], request.cards[2]],
      }),
    ).toBeUndefined();
    expect(
      parseInstantReadingRequest({
        ...request,
        userContext: "서버로 보내면 안 되는 내용",
      }),
    ).toBeUndefined();
  });

  it("accepts a complete reading tied to the requested cards", () => {
    const reading = createValidReading();

    expect(parseInstantReading(reading, request)).toEqual(reading);
    expect(getInstantReadingVisibleText(reading).length).toBeGreaterThanOrEqual(
      500,
    );
  });

  it("rejects changed cards, extra keys, and technical markers", () => {
    const reading = createValidReading();

    expect(
      parseInstantReading(
        {
          ...reading,
          positionReadings: reading.positionReadings.map((item, index) =>
            index === 1 ? { ...item, cardId: "the-star" } : item,
          ),
        },
        request,
      ),
    ).toBeUndefined();
    expect(
      parseInstantReading({ ...reading, extra: "unexpected" }, request),
    ).toBeUndefined();
    expect(
      parseInstantReading(
        {
          ...reading,
          synthesis: `${reading.synthesis} AI 프롬프트`,
        },
        request,
      ),
    ).toBeUndefined();
  });

  it.each([
    [
      "hidden-feelings-certainty",
      "상대는 확실히 사랑하는 마음을 품고 있습니다.",
    ],
    ["future-certainty", "반드시 3일 안에 연락이 옵니다."],
    [
      "professional-or-mental-health-advice",
      "보유한 주식은 오늘 바로 팔고 변호사를 선임하세요.",
    ],
    ["irreversible-urgent-action", "당장 퇴사하는 편이 좋습니다."],
    ["self-harm-coercion-or-stalking", "상대의 일상을 몰래 감시해 확인하세요."],
    [
      "unsupported-personalization",
      "당신은 이미 이 관계를 끝내기로 결정했습니다.",
    ],
  ] as const)("rejects %s before display", (violationId, unsafeText) => {
    const reading = createValidReading();
    const unsafeReading = {
      ...reading,
      synthesis: `${unsafeText} ${reading.synthesis}`,
    };

    expect(getInstantReadingSafetyViolation(unsafeReading)).toBe(violationId);
    expect(parseInstantReading(unsafeReading, request)).toBeUndefined();
  });

  it.each([
    [
      "hidden-feelings-certainty",
      "확실하지 않지만 상대는 당신을 사랑하고 재회를 원합니다.",
    ],
    ["irreversible-urgent-action", "주저하지 말고 당장 퇴사하세요."],
    [
      "hidden-feelings-certainty",
      "상대는 분명 당신을 사랑하니 직접 확인하세요.",
    ],
    [
      "hidden-feelings-certainty",
      "알 수 없으니 상대는 당신을 사랑하고 재회를 원합니다.",
    ],
  ] as const)(
    "does not let a safety qualifier hide %s",
    (violationId, unsafeText) => {
      const reading = createValidReading();
      const unsafeReading = {
        ...reading,
        synthesis: `${unsafeText} ${reading.synthesis}`,
      };

      expect(getInstantReadingSafetyViolation(unsafeReading)).toBe(violationId);
      expect(parseInstantReading(unsafeReading, request)).toBeUndefined();
    },
  );

  it.each([
    ["hidden-feelings-certainty", "상대는 당신을 사랑하고 재회를 원합니다."],
    ["future-certainty", "곧 연락이 오고 이번 달에 재회하게 됩니다."],
    [
      "professional-or-mental-health-advice",
      "보유한 주식은 오늘 바로 팔고 변호사를 선임하세요.",
    ],
    [
      "unsupported-personalization",
      "이미 마음을 정리했고 새로운 관계를 준비하고 있습니다.",
    ],
  ] as const)(
    "rejects a natural paraphrase of %s",
    (violationId, unsafeText) => {
      const reading = createValidReading();
      const unsafeReading = {
        ...reading,
        synthesis: `${unsafeText} ${reading.synthesis}`,
      };

      expect(getInstantReadingSafetyViolation(unsafeReading)).toBe(violationId);
      expect(parseInstantReading(unsafeReading, request)).toBeUndefined();
    },
  );

  it.each([
    "상대의 속마음은 카드만으로 알 수 없습니다.",
    "3일 안에 연락이 올지는 알 수 없습니다.",
    "우울증 여부는 진단할 수 없습니다.",
    "당장 퇴사하지 마세요.",
    "상대의 일상을 몰래 감시하지 마세요.",
    "당신이 이미 마음을 정리했는지는 직접 확인해야 합니다.",
    "상대와 생각을 나눌 필요가 있습니다.",
    "당신은 이미 확인한 사실을 다시 생각해 보세요.",
    "반드시 재회한다고 단정할 수 없습니다.",
    "확실히 연락이 온다고 볼 수 없습니다.",
    "법적 대응을 진행하지 마세요.",
  ])("allows a safe uncertainty or boundary: %s", (safeText) => {
    const reading = createValidReading();
    const safeReading = {
      ...reading,
      uncertainty: `${safeText} ${reading.uncertainty}`,
    };

    expect(getInstantReadingSafetyViolation(safeReading)).toBeUndefined();
    expect(parseInstantReading(safeReading, request)).toEqual(safeReading);
  });
});

function createValidReading() {
  const sentence =
    "서두르기보다 지금 확인할 수 있는 선택과 경계를 차분히 살펴보는 흐름입니다. ";

  return {
    headline: "멈춤과 움직임 사이의 선택",
    synthesis: sentence.repeat(3),
    positionReadings: request.cards.map(({ cardId, positionId }) => ({
      cardId,
      interpretation: sentence.repeat(2),
      positionId,
    })),
    strongestConnection: {
      cardIds: ["the-fool", "the-magician"],
      explanation: sentence.repeat(2),
      relationType: "progression",
    },
    uncertainty: sentence.repeat(2),
    nextStep: sentence,
    reflection: "지금 가장 부담 없이 확인할 수 있는 선택은 무엇인가요?",
  } as const;
}
