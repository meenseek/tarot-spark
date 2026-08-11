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
