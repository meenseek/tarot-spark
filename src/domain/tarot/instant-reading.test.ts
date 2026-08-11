import { describe, expect, it } from "vitest";
import {
  parseInstantReadingRequest,
  parseInstantReadingResponse,
  validateInstantReadingText,
  type InstantReadingRequest,
} from "./instant-reading";

const request = {
  cards: [
    { cardId: "the-fool" },
    { cardId: "wands-queen" },
    { cardId: "swords-3" },
  ],
  spreadId: "quick",
  styleId: "balanced",
  topicId: "love",
} as const satisfies InstantReadingRequest;

describe("instant reading domain", () => {
  it("accepts only the exact public request shape", () => {
    expect(parseInstantReadingRequest(request)).toEqual(request);
    expect(
      parseInstantReadingRequest({ ...request, privateContext: "비밀 상황" }),
    ).toBeUndefined();
    expect(
      parseInstantReadingRequest({
        ...request,
        cards: [request.cards[0], request.cards[0], request.cards[2]],
      }),
    ).toBeUndefined();
    expect(
      parseInstantReadingRequest({ ...request, questionId: " padded " }),
    ).toBeUndefined();
  });

  it("accepts the exact marker grammar and normalizes line endings", () => {
    const text = createValidText(3).replace(/\n/gu, "\r\n");
    expect(validateInstantReadingText(text, request)?.text).toBe(
      createValidText(3),
    );
    expect(
      parseInstantReadingResponse({ text: createValidText(3) }, request),
    ).toEqual({ text: createValidText(3) });
  });

  it("accepts calibrated symbolic interest while rejecting factual certainty", () => {
    const originalOverall =
      "새로운 가능성을 향한 움직임과 분명한 표현이 함께 필요하지만, 아직 확인하지 않은 부분은 현실의 대화로 살펴야 기대와 관찰을 구분할 수 있습니다.";
    const calibratedClaims = [
      "카드상 상대의 시선에는 호감 가능성에 무게가 실리지만, 아직 연애적 관심을 분명히 표현할 준비까지 갖췄다고 단정할 수는 없습니다.",
      "상대에게 호감이 있을 수 있지만, 그 감정이 연애적 관심으로 이어진다고 단정할 수는 없습니다.",
      "상대에게 호감이 있는 쪽으로 읽힐 수 있지만, 관계를 시작할 의향까지는 카드로 확정할 수 없습니다.",
      "상대는 당신을 좋아할 수 있지만, 관계를 시작할 의향까지는 카드로 확정할 수 없습니다.",
      "그 사람은 당신에게 마음이 있을 가능성이 있지만, 그 크기까지는 단정할 수 없습니다.",
      "상대가 당신에게 연애 감정을 느끼는 쪽으로 읽힐 수 있지만, 현실의 사실로 확정할 수는 없습니다.",
      "상대는 당신을 좋아할 수 있어요. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람은 당신에게 마음이 있을 가능성이 있어요. 그 크기까지는 단정할 수 없습니다.",
      "상대는 당신을 좋아하게 될 가능성이 있어요. 미래의 사실로 확정할 수는 없습니다.",
    ];

    for (const claim of calibratedClaims) {
      const calibrated = createValidText(3).replace(originalOverall, claim);
      expect(validateInstantReadingText(calibrated, request)?.text).toBe(
        calibrated,
      );
    }

    const originalUnknown =
      "아직 모르는 점: 현재 정보만으로는 서로 같은 기대와 관계의 속도를 원하는지 알 수 없습니다.";
    const uncertaintyClaims = [
      "아직 모르는 점: 아직 모르는 점은 상대의 마음을 카드로 알 수 없다는 것입니다.",
      "아직 모르는 점: 다른 해석은 상대의 마음을 확정할 수 없다는 것입니다.",
      "아직 모르는 점: 상대의 마음은 실제 대화 없이는 확인하기 어려울 거예요.",
    ];

    for (const claim of uncertaintyClaims) {
      const uncertain = createValidText(3).replace(originalUnknown, claim);
      expect(validateInstantReadingText(uncertain, request)?.text).toBe(
        uncertain,
      );
    }

    const factual = createValidText(3).replace(
      originalOverall,
      "상대의 마음에는 분명히 사랑이 있습니다. 그 사람은 당신과 연애하기를 원합니다.",
    );
    expect(validateInstantReadingText(factual, request)).toBeUndefined();

    for (const bypass of [
      "상대는 당신을 사랑합니다만 연애 가능성은 낮습니다.",
      "상대는 당신에게 호감이 있습니다만 관계가 기울지는 않습니다.",
      "상대에게 호감이 있을 가능성은 있지만 사랑합니다.",
      "상대는 당신을 좋아합니다.",
      "그 사람은 당신에게 마음이 있습니다.",
      "상대는 당신에게 연애 감정을 느낍니다.",
      "상대는 당신을 좋아해요.",
      "그 사람은 당신에게 마음이 있어요.",
      "상대는 당신을 좋아하게 될 것입니다.",
    ]) {
      const factualBeforeQualifier = createValidText(3).replace(
        originalOverall,
        bypass,
      );
      expect(
        validateInstantReadingText(factualBeforeQualifier, request),
      ).toBeUndefined();
    }

    const factualReality = createValidText(3).replace(
      originalUnknown,
      "아직 모르는 점: 상대는 당신을 좋아해요. 이 관계의 답은 정해져 있습니다.",
    );
    expect(validateInstantReadingText(factualReality, request)).toBeUndefined();

    const calibratedInterest = createValidText(3).replace(
      originalOverall,
      "상대에게 연애적 관심이 있을 가능성이 있습니다. 다만 그 관심의 크기나 관계를 시작할 의향까지는 단정할 수 없습니다.",
    );
    expect(validateInstantReadingText(calibratedInterest, request)?.text).toBe(
      calibratedInterest,
    );

    const factualInterest = createValidText(3).replace(
      originalOverall,
      "상대에게 연애적 관심이 있습니다. 그 관심은 관계를 더 이어가려는 태도로 연결되어 있습니다.",
    );
    expect(
      validateInstantReadingText(factualInterest, request),
    ).toBeUndefined();

    const originalFirstPossibility =
      "서로 표현하는 속도가 달라서 같은 행동을 다르게 받아들이며 불확실성이 커졌을 수 있습니다.";
    const implicitCalibrated = createValidText(3).replace(
      originalFirstPossibility,
      "한 가지 해석은 당신을 좋아할 가능성이 있다는 것입니다. 다만 실제 감정으로 확정할 수는 없습니다.",
    );
    expect(validateInstantReadingText(implicitCalibrated, request)?.text).toBe(
      implicitCalibrated,
    );

    const implicitFactual = createValidText(3).replace(
      originalFirstPossibility,
      "한 가지 해석은 당신을 좋아한다는 것입니다. 이 감정은 분명하게 이어지고 있습니다.",
    );
    expect(
      validateInstantReadingText(implicitFactual, request),
    ).toBeUndefined();

    for (const topicId of [
      "love",
      "feelings",
      "reunion",
      "relationship-flow",
    ] as const) {
      const relationshipRequest = { ...request, topicId };
      expect(
        validateInstantReadingText(implicitCalibrated, relationshipRequest)
          ?.text,
      ).toBe(implicitCalibrated);
      expect(
        validateInstantReadingText(implicitFactual, relationshipRequest),
      ).toBeUndefined();
    }
  });

  it.each([
    createValidText(3).replace("[가능성 B]", "[다른 가능성]"),
    createValidText(3).replace(
      "[가능성 B]",
      "[가능성 A]\n겉으로 비슷해 보여도 서로 다른 속도로 확인하고 있을 수 있습니다.\n[가능성 B]",
    ),
    createValidText(3).replace("3. ", "4. "),
    createValidText(3).replace("관찰할 점:", "빠진 표식: 확인\n관찰할 점:"),
    createValidText(3).replace(
      "서로 표현하는 속도가 달라서 같은 행동을 다르게 받아들이며 불확실성이 커졌을 수 있습니다.",
      "상대는 분명히 당신을 사랑하고 반드시 연락하게 됩니다.",
    ),
    createValidText(3).replace(
      "서로 표현하는 속도가 달라서 같은 행동을 다르게 받아들이며 불확실성이 커졌을 수 있습니다.",
      "두 사람은 다시 만나게 됩니다. 관계의 결론은 이미 정해져 있습니다.",
    ),
    createValidText(3).replace(
      "서로 표현하는 속도가 달라서 같은 행동을 다르게 받아들이며 불확실성이 커졌을 수 있습니다.",
      "상대의 마음에는 여전히 사랑이 있습니다. 그 감정은 관계의 답을 정해 줍니다.",
    ),
    createValidText(3).replace(
      "서로 표현하는 속도가 달라서 같은 행동을 다르게 받아들이며 불확실성이 커졌을 수 있습니다.",
      "당신은 우울증입니다. 이 상태가 현재 관계 선택의 원인이라고 단정할 수 있습니다.",
    ),
    createValidText(3).replace(
      "서로 표현하는 속도가 달라서 같은 행동을 다르게 받아들이며 불확실성이 커졌을 수 있습니다.",
      "삼성전자 주식을 사는 것이 정답입니다. 지금의 선택으로 수익을 만들 수 있습니다.",
    ),
    createValidText(3).replace(
      "서로 표현하는 속도가 달라서 같은 행동을 다르게 받아들이며 불확실성이 커졌을 수 있습니다.",
      "상대를 고소하는 것이 정답입니다. 법적 절차를 바로 시작해야 합니다.",
    ),
    createValidText(3).replace("[전체 흐름]", "[전체 흐름]\nJSON 결과입니다."),
  ])("rejects malformed or unsafe output", (text) => {
    expect(validateInstantReadingText(text, request)).toBeUndefined();
  });

  it("rejects extra response fields", () => {
    expect(
      parseInstantReadingResponse(
        { text: createValidText(3), provider: "cloudflare" },
        request,
      ),
    ).toBeUndefined();
  });
});

export function createValidText(cardCount: number) {
  const cardLines = [
    "새 가능성을 열어 두되 아직 확인하지 않은 기대를 사실처럼 단정하지 않는 태도를 살펴봅니다.",
    "표현할 수 있는 선택과 자원을 구체적으로 사용하면 원하는 경계를 더 분명히 전할 수 있습니다.",
    "아픈 감정을 서둘러 지우기보다 실제로 확인한 행동과 해석을 나누어 바라볼 필요가 있습니다.",
    "서로 주고받는 균형이 한쪽의 희생으로 기울지 않는지 현실의 부담을 함께 확인해 봅니다.",
    "감정의 친밀함과 실제 약속의 범위가 같은 방향인지 대화와 행동을 통해 천천히 살펴봅니다.",
    "공정함을 원하는 마음이 단단한 경계로 이어지는지, 상대에게도 같은 기준을 적용하는지 봅니다.",
  ]
    .slice(0, cardCount)
    .map((line, index) => `${index + 1}. ${line}`)
    .join("\n");

  return `[전체 흐름]
새로운 가능성을 향한 움직임과 분명한 표현이 함께 필요하지만, 아직 확인하지 않은 부분은 현실의 대화로 살펴야 기대와 관찰을 구분할 수 있습니다.
[카드별 흐름]
${cardLines}
[가장 강한 연결]
열린 가능성과 능동적인 표현이 서로 힘을 보태는 동시에, 아픈 감정을 건너뛰면 속도가 현실보다 앞설 수 있다는 긴장이 가장 두드러집니다.
[가능성 A]
서로 표현하는 속도가 달라서 같은 행동을 다르게 받아들이며 불확실성이 커졌을 수 있습니다.
[가능성 B]
기대가 실제로 확인한 신호보다 앞서서 관계의 빈칸을 스스로 채우고 있을 수 있습니다.
[현실 확인]
아직 모르는 점: 현재 정보만으로는 서로 같은 기대와 관계의 속도를 원하는지 알 수 없습니다.
관찰할 점: 다음 대화에서 질문에 대한 답과 이후 행동이 일정하게 이어지는지 살펴보세요.
다시 볼 조건: 말과 행동이 계속 어긋나면 두 가능성의 비중을 바꾸거나 모두 내려놓고 다시 살펴보세요.
[다음 행동]
작은 행동: 부담이 적은 질문 하나를 골라 서로 확인할 수 있는 범위에서 짧게 대화해 보세요.
멈추거나 다시 볼 조건: 대화가 반복해서 경계를 넘거나 일상에 큰 비용을 만들면 이 행동을 멈추고 다시 판단하세요.
[성찰 질문]
지금 내가 기대와 실제 관찰을 구분하기 위해 가장 먼저 확인할 수 있는 것은 무엇인가요?`;
}
