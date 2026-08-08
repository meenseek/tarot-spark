import { describe, expect, it } from "vitest";
import koCards from "@/messages/ko/tarot-cards.json";
import {
  getInstantReadingSafetyViolation,
  getInstantReadingVisibleText,
  hasUnsupportedVisualClaim,
  parseInstantReading,
  parseInstantReadingProviderResponse,
  parseInstantReadingRequest,
  type InstantReadingRequest,
  type InstantReadingV2,
} from "./index";

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
const sentence =
  "서두르기보다 지금 확인할 수 있는 선택과 경계를 차분히 살펴보는 흐름입니다. ";

function createReading(): InstantReadingV2 {
  return {
    cardReadings: request.cards.map(({ cardId }) => ({
      cardId,
      interpretation: sentence.repeat(2),
    })),
    headline: "멈춤과 움직임 사이의 선택",
    nextStep: sentence,
    reflection: "지금 가장 부담 없이 확인할 수 있는 선택은 무엇인가요?",
    strongestConnection: {
      cardIds: ["the-fool", "wands-queen"],
      explanation: sentence.repeat(2),
      relationType: "progression",
    },
    synthesis: sentence.repeat(3),
    uncertainty: sentence.repeat(2),
  };
}

function createProviderReading() {
  const reading = createReading();

  return {
    ...reading,
    cardReadings: reading.cardReadings.map(({ interpretation }) => ({
      interpretation,
    })),
    strongestConnection: {
      cardIndexes: [1, 2],
      explanation: reading.strongestConnection.explanation,
      relationType: reading.strongestConnection.relationType,
    },
  };
}

describe("instant reading v5 contract", () => {
  it("accepts only exact ordered card-only requests", () => {
    expect(parseInstantReadingRequest(request)).toEqual(request);
    expect(
      parseInstantReadingRequest({ ...request, lensId: "blind-spot" }),
    ).toBeUndefined();
    expect(
      parseInstantReadingRequest({
        ...request,
        cards: [...request.cards, { cardId: "cups-2" }],
      }),
    ).toBeUndefined();
    expect(
      parseInstantReadingRequest({
        ...request,
        cards: [request.cards[0], request.cards[0], request.cards[2]],
      }),
    ).toBeUndefined();
  });

  it("accepts a complete response with one reading per ordered card", () => {
    const reading = createReading();
    expect(
      parseInstantReadingProviderResponse(createProviderReading(), request),
    ).toEqual(reading);
    expect(parseInstantReading(reading, request)).toEqual(reading);
    expect(getInstantReadingVisibleText(reading)).not.toContain("undefined");
  });

  it("rejects identifiers, repeated indexes, and out-of-range indexes", () => {
    const providerReading = createProviderReading();
    expect(
      parseInstantReadingProviderResponse(
        {
          ...providerReading,
          cardReadings: [
            { cardId: "the-fool", interpretation: sentence.repeat(2) },
            ...providerReading.cardReadings.slice(1),
          ],
        },
        request,
      ),
    ).toBeUndefined();
    expect(
      parseInstantReadingProviderResponse(
        {
          ...providerReading,
          strongestConnection: {
            ...providerReading.strongestConnection,
            cardIndexes: [1, 1],
          },
        },
        request,
      ),
    ).toBeUndefined();
    expect(
      parseInstantReadingProviderResponse(
        {
          ...providerReading,
          strongestConnection: {
            ...providerReading.strongestConnection,
            cardIndexes: [1, 4],
          },
        },
        request,
      ),
    ).toBeUndefined();
  });

  it.each([
    ["그림에 보이는 사자가 용기를 상징합니다.", "unsupported-visual-claim"],
    ["카드 속 동물이 앞으로 나아갑니다.", "unsupported-visual-claim"],
    ["작은 개가 그려진 장면은 경고입니다.", "unsupported-visual-claim"],
    ["사자는 용기를 뜻합니다.", "unsupported-visual-claim"],
    ["검은 말은 변화를 암시합니다.", "unsupported-visual-claim"],
    ["The lion represents courage.", "unsupported-visual-claim"],
    ["고양이는 독립성을 상징합니다.", "unsupported-visual-claim"],
    ["물고기는 감정의 메시지를 뜻합니다.", "unsupported-visual-claim"],
    ["늑대는 본능을 나타냅니다.", "unsupported-visual-claim"],
    ["The cat symbolizes independence.", "unsupported-visual-claim"],
    ["The fish suggests an emotional message.", "unsupported-visual-claim"],
    ["The wolf represents instinct.", "unsupported-visual-claim"],
    ["카드 속 배는 이동을 상징합니다.", "unsupported-visual-claim"],
    ["카드 안의 산은 장애물을 뜻합니다.", "unsupported-visual-claim"],
    ["그림 속 왕좌가 권위를 나타냅니다.", "unsupported-visual-claim"],
    ["칼이 보이는 장면은 갈등을 암시합니다.", "unsupported-visual-claim"],
    ["The throne represents authority.", "unsupported-visual-claim"],
    ["The red robe suggests passion.", "unsupported-visual-claim"],
    ["왕좌는 권위를 상징합니다.", "unsupported-visual-claim"],
    ["붉은 옷은 열정을 의미합니다.", "unsupported-visual-claim"],
    ["세 자루의 검은 상처를 나타냅니다.", "unsupported-visual-claim"],
    [
      "첫 번째 카드는 과거를 뜻하고 두 번째 카드는 장애물입니다.",
      "invented-position-semantics",
    ],
    ["불씨 자리에서 시작합니다.", "invented-position-semantics"],
    ["과거의 자리로 읽습니다.", "invented-position-semantics"],
    ["역방향으로 보면 의미가 달라집니다.", "reversed-card-interpretation"],
    ["완드 퀸은 실제 여성을 뜻합니다.", "court-card-person-literalization"],
    ["1번 카드는 과거를 뜻합니다.", "invented-position-semantics"],
    ["2번 카드는 현재를 나타냅니다.", "invented-position-semantics"],
    [
      "첫 카드는 과거, 둘째 카드는 현재로 읽습니다.",
      "invented-position-semantics",
    ],
    ["퀸은 실제 여성을 뜻합니다.", "court-card-person-literalization"],
    ["완드의 퀸은 특정 여성을 뜻합니다.", "court-card-person-literalization"],
    ["킹 카드는 연상의 남성을 가리킵니다.", "court-card-person-literalization"],
    ["1번째 카드는 과거입니다.", "invented-position-semantics"],
    ["1번은 과거, 2번은 현재입니다.", "invented-position-semantics"],
    ["첫 번째는 과거입니다.", "invented-position-semantics"],
    ["1번 카드는 관계의 핵심입니다.", "invented-position-semantics"],
    ["첫 카드는 숨은 영향입니다.", "invented-position-semantics"],
    ["세 번째 카드는 행동 방향입니다.", "invented-position-semantics"],
    ["거꾸로 읽으면 의미가 달라집니다.", "reversed-card-interpretation"],
    ["킹은 특정 인물을 가리킵니다.", "court-card-person-literalization"],
    ["킹은 연상의 남성으로 읽습니다.", "court-card-person-literalization"],
    ["퀸은 상대방의 어머니를 나타냅니다.", "court-card-person-literalization"],
    ["카드에는 왕관을 쓴 여성이 있습니다.", "unsupported-visual-claim"],
    ["카드에는 한 여성이 검을 들고 있습니다.", "unsupported-visual-claim"],
    ["카드 위에는 별이 있습니다.", "unsupported-visual-claim"],
    ["여성이 왕좌에 앉아 있습니다.", "unsupported-visual-claim"],
    ["흰 말이 달려갑니다.", "unsupported-visual-claim"],
    ["말이 등장합니다.", "unsupported-visual-claim"],
    ["과거: 완드 퀸", "invented-position-semantics"],
    ["현재 — 소드 3", "invented-position-semantics"],
    ["1번 카드: 관계의 핵심", "invented-position-semantics"],
    ["첫 번째 카드, 숨은 영향", "invented-position-semantics"],
    ["왼쪽 카드는 과거를 뜻합니다.", "invented-position-semantics"],
    ["가운데 카드는 현재입니다.", "invented-position-semantics"],
    ["마지막 카드는 조언입니다.", "invented-position-semantics"],
    ["카드 1은 과거입니다.", "invented-position-semantics"],
    ["반대로 읽으면 의미가 달라집니다.", "reversed-card-interpretation"],
    ["뒤집어 읽으면 의미가 달라집니다.", "reversed-card-interpretation"],
    ["퀸은 실제 여성입니다.", "court-card-person-literalization"],
    ["킹은 특정 인물입니다.", "court-card-person-literalization"],
    ["페이지는 젊은 사람입니다.", "court-card-person-literalization"],
    ["카드에는 컵 세 개가 놓여 있습니다.", "unsupported-visual-claim"],
    ["카드에는 나무가 자라고 있습니다.", "unsupported-visual-claim"],
    ["카드 속에서 아이가 걷고 있습니다.", "unsupported-visual-claim"],
    ["카드 한가운데에 태양이 떠 있습니다.", "unsupported-visual-claim"],
    ["그림에는 꽃이 피어 있습니다.", "unsupported-visual-claim"],
    ["여자가 칼을 들고 서 있습니다.", "unsupported-visual-claim"],
    ["카드 배경은 파란색입니다.", "unsupported-visual-claim"],
    ["그림의 색은 붉습니다.", "unsupported-visual-claim"],
    ["카드 속 인물은 미소 짓고 있습니다.", "unsupported-visual-claim"],
    ["카드에는 두 사람이 손을 맞잡고 있습니다.", "unsupported-visual-claim"],
    ["카드의 여자는 하늘을 바라봅니다.", "unsupported-visual-claim"],
    ["이미지의 중심에는 밝은 빛이 있습니다.", "unsupported-visual-claim"],
    ["카드 속 붉은색은 열정을 뜻합니다.", "unsupported-visual-claim"],
    ["카드는 푸른색입니다.", "unsupported-visual-claim"],
    ["카드의 배경이 파랗습니다.", "unsupported-visual-claim"],
    ["이 카드는 붉은 빛을 띱니다.", "unsupported-visual-claim"],
    ["카드 안에는 남자가 있습니다.", "unsupported-visual-claim"],
    ["카드 위에 천사가 서 있습니다.", "unsupported-visual-claim"],
    ["카드 중앙에 인물이 있습니다.", "unsupported-visual-claim"],
    ["이미지는 여성을 묘사합니다.", "unsupported-visual-claim"],
    ["이미지는 인물을 담고 있습니다.", "unsupported-visual-claim"],
    [
      "이미지는 붉은 옷을 입은 인물을 담고 있습니다.",
      "unsupported-visual-claim",
    ],
    ["그림은 온통 파란색입니다.", "unsupported-visual-claim"],
    ["카드에는 파란 배경이 있습니다.", "unsupported-visual-claim"],
    ["카드에 빨간색이 쓰였습니다.", "unsupported-visual-claim"],
    ["카드에는 여왕이 서 있습니다.", "unsupported-visual-claim"],
    ["카드에 노인이 앉아 있습니다.", "unsupported-visual-claim"],
    ["카드는 세 사람을 담고 있습니다.", "unsupported-visual-claim"],
    ["카드에는 흰옷의 인물이 있습니다.", "unsupported-visual-claim"],
    ["카드의 중심 인물은 노인입니다.", "unsupported-visual-claim"],
    ["카드에는 바다가 보입니다.", "unsupported-visual-claim"],
    ["카드는 주황색입니다.", "unsupported-visual-claim"],
    ["카드에는 갈색 배경이 있습니다.", "unsupported-visual-claim"],
    ["카드에는 소년이 서 있습니다.", "unsupported-visual-claim"],
    ["카드에는 두 사람이 있습니다.", "unsupported-visual-claim"],
    ["카드에는 지팡이가 그려져 있습니다.", "unsupported-visual-claim"],
    ["카드에는 펜타클이 보입니다.", "unsupported-visual-claim"],
    ["카드에는 탑이 보입니다.", "unsupported-visual-claim"],
    ["카드에는 구름이 떠 있습니다.", "unsupported-visual-claim"],
    ["그림은 주황색입니다.", "unsupported-visual-claim"],
    ["이미지는 갈색입니다.", "unsupported-visual-claim"],
    ["카드에는 두 여인이 있습니다.", "unsupported-visual-claim"],
    ["카드에는 새하얀 옷의 사람이 있습니다.", "unsupported-visual-claim"],
    ["카드에는 강물이 흐릅니다.", "unsupported-visual-claim"],
    ["카드에는 정원이 펼쳐집니다.", "unsupported-visual-claim"],
    ["과거 / 완드 퀸", "invented-position-semantics"],
    ["과거 | 완드 퀸", "invented-position-semantics"],
    ["왼편 카드는 과거입니다.", "invented-position-semantics"],
    ["중앙 카드는 현재입니다.", "invented-position-semantics"],
    ["중간 카드는 핵심입니다.", "invented-position-semantics"],
    ["오른편 카드는 조언입니다.", "invented-position-semantics"],
    ["첫 장은 과거입니다.", "invented-position-semantics"],
    ["두 번째 장은 현재입니다.", "invented-position-semantics"],
    ["첫 번째로 뽑힌 카드는 원인입니다.", "invented-position-semantics"],
    ["처음 뽑힌 카드는 과거입니다.", "invented-position-semantics"],
    ["핵심: 완드 퀸", "invented-position-semantics"],
    ["숨은 영향: 소드 3", "invented-position-semantics"],
    ["맨 앞 카드는 과거입니다.", "invented-position-semantics"],
    ["끝 카드는 조언입니다.", "invented-position-semantics"],
    ["과거 → 완드 퀸", "invented-position-semantics"],
    ["핵심 = 완드 퀸", "invented-position-semantics"],
    ["완드 퀸 — 과거", "invented-position-semantics"],
    ["완드 퀸 카드는 과거를 뜻합니다.", "invented-position-semantics"],
    ["완드 퀸: 과거", "invented-position-semantics"],
    ["완드 퀸 | 현재", "invented-position-semantics"],
    ["시작 → 완드 퀸", "invented-position-semantics"],
    ["완드 퀸 → 시작", "invented-position-semantics"],
    ["완드 퀸은 과거 카드입니다.", "invented-position-semantics"],
    ["완드 퀸 / 결론", "invented-position-semantics"],
    ["완드 퀸은 조언 역할입니다.", "invented-position-semantics"],
    ["완드 퀸은 시작을 담당합니다.", "invented-position-semantics"],
    ["완드 퀸이 조언을 담당합니다.", "invented-position-semantics"],
    ["소드 3이 장애물 역할입니다.", "invented-position-semantics"],
    ["컵 킹이 결론 카드입니다.", "invented-position-semantics"],
    ["완드 퀸이 과거를 뜻합니다.", "invented-position-semantics"],
    ["반대 방향으로 해석하면 달라집니다.", "reversed-card-interpretation"],
    ["뒤집어서 보면 달라집니다.", "reversed-card-interpretation"],
    ["역으로 읽으면 달라집니다.", "reversed-card-interpretation"],
    ["정방향과 반대되는 뜻입니다.", "reversed-card-interpretation"],
    ["반대 의미로 읽으면 경고입니다.", "reversed-card-interpretation"],
    ["정방향이 아닌 해석도 가능합니다.", "reversed-card-interpretation"],
    ["역위치로 읽으면 경고입니다.", "reversed-card-interpretation"],
    ["정위치가 아닌 뜻도 있습니다.", "reversed-card-interpretation"],
    ["정방향 외의 해석은 경고입니다.", "reversed-card-interpretation"],
    ["퀸은 실제 여성인 셈입니다.", "court-card-person-literalization"],
    ["퀸은 특정 여성을 말합니다.", "court-card-person-literalization"],
    ["킹은 아버지 같은 사람입니다.", "court-card-person-literalization"],
    ["퀸은 어머니 같은 인물을 뜻합니다.", "court-card-person-literalization"],
    ["킹은 나이 많은 사람을 나타냅니다.", "court-card-person-literalization"],
    ["페이지는 젊은 인물을 뜻합니다.", "court-card-person-literalization"],
    ["페이지는 아이를 뜻합니다.", "court-card-person-literalization"],
    ["나이트는 젊은이를 뜻합니다.", "court-card-person-literalization"],
    ["퀸은 특정 여성일 수 있습니다.", "court-card-person-literalization"],
    ["킹은 아버지를 떠올리게 합니다.", "court-card-person-literalization"],
    ["페이지는 어린 사람과 연결됩니다.", "court-card-person-literalization"],
    ["나이트는 젊은 남성을 연상시킵니다.", "court-card-person-literalization"],
    ["킹은 남자일 가능성이 있습니다.", "court-card-person-literalization"],
    ["퀸은 여성과 관련됩니다.", "court-card-person-literalization"],
    ["페이지는 어린 인물을 암시합니다.", "court-card-person-literalization"],
    ["나이트는 청년을 가리킵니다.", "court-card-person-literalization"],
    ["퀸은 여성으로 볼 수 있습니다.", "court-card-person-literalization"],
    ["킹은 남성 캐릭터입니다.", "court-card-person-literalization"],
    ["킹이 아버지 같은 존재를 상징합니다.", "court-card-person-literalization"],
    ["나이트는 청년의 모습을 나타냅니다.", "court-card-person-literalization"],
    [
      "페이지는 어린 존재로 볼 수 있습니다.",
      "court-card-person-literalization",
    ],
    ["일러스트에는 한 여인이 서 있습니다.", "unsupported-visual-claim"],
    ["삽화에는 파란 배경이 보입니다.", "unsupported-visual-claim"],
    ["카드에서 한 인물이 등장합니다.", "unsupported-visual-claim"],
    ["카드에 등장하는 인물은 노인입니다.", "unsupported-visual-claim"],
    ["완드 퀸의 해바라기는 자신감을 뜻합니다.", "unsupported-visual-claim"],
    ["그림은 따뜻한 색감으로 구성됩니다.", "unsupported-visual-claim"],
    ["이미지가 어둡게 표현되어 있습니다.", "unsupported-visual-claim"],
    ["일러스트는 밝은 분위기입니다.", "unsupported-visual-claim"],
    ["삽화가 인물을 중심으로 구성됩니다.", "unsupported-visual-claim"],
    ["카드에는 인물이 등장합니다.", "provider-owned-card-reference"],
    ["카드에서 왕이 모습을 드러냅니다.", "provider-owned-card-reference"],
    ["카드 위로 구름이 흐릅니다.", "provider-owned-card-reference"],
    [
      "완드 퀸 옆의 해바라기가 자신감을 뜻합니다.",
      "provider-owned-card-reference",
    ],
    ["완드 퀸을 조언으로 읽습니다.", "provider-owned-card-reference"],
    ["소드 3을 장애물 카드로 봅니다.", "provider-owned-card-reference"],
    ["컵 킹에게 결론 역할을 맡깁니다.", "provider-owned-card-reference"],
    [
      "완드 퀸에는 과거라는 의미를 부여합니다.",
      "provider-owned-card-reference",
    ],
    ["과거 역할은 완드 퀸입니다.", "invented-position-semantics"],
    ["조언 카드로 완드 퀸이 나왔습니다.", "provider-owned-card-reference"],
    ["완드 퀸은 현재 상황 카드입니다.", "provider-owned-card-reference"],
    ["이 카드는 정방향이 아닙니다.", "provider-owned-card-reference"],
    ["정위치 반대의 뜻은 지연입니다.", "reversed-card-interpretation"],
    ["퀸을 여성으로 볼 수 있습니다.", "court-card-person-literalization"],
    [
      "킹에게서 아버지 같은 모습을 볼 수 있습니다.",
      "court-card-person-literalization",
    ],
    ["페이지가 어린 세대를 상징합니다.", "court-card-person-literalization"],
    ["나이트를 청년 인물로 해석합니다.", "court-card-person-literalization"],
    ["퀸은 여성상을 표현합니다.", "court-card-person-literalization"],
    ["페이지는 아이 같은 존재입니다.", "court-card-person-literalization"],
    ["카드라는 틀로 읽습니다.", "provider-owned-card-reference"],
    ["카드처럼 보입니다.", "provider-owned-card-reference"],
    ["완드처럼 곧게 나아갑니다.", "provider-owned-card-reference"],
    ["컵이라는 상징을 떠올립니다.", "provider-owned-card-reference"],
    ["소드처럼 날카롭습니다.", "provider-owned-card-reference"],
    ["펜타클이라는 표식입니다.", "provider-owned-card-reference"],
    ["Queen은 여성을 뜻합니다.", "court-card-person-literalization"],
    ["King은 남성을 뜻합니다.", "court-card-person-literalization"],
    ["Wands는 행동을 뜻합니다.", "provider-owned-card-reference"],
    ["게가 옆으로 기어가는 모습입니다.", "unsupported-visual-claim"],
    ["과거 역할은 회고입니다.", "invented-position-semantics"],
    ["조언 역할로 읽습니다.", "invented-position-semantics"],
    ["상대는 분명 사랑하는 마음입니다.", "hidden-feelings-certainty"],
    ["반드시 곧 재회합니다.", "future-certainty"],
    ["지금 바로 퇴사하세요.", "irreversible-urgent-action"],
    ["상대의 뒤를 몰래 따라가 확인하세요.", "self-harm-coercion-or-stalking"],
  ])("rejects hard failure text: %s", (unsafeText, expectedViolation) => {
    const reading = {
      ...createReading(),
      synthesis: unsafeText + sentence.repeat(3),
    };
    expect(getInstantReadingSafetyViolation(reading)).toBe(expectedViolation);
    const providerReading = createProviderReading();
    expect(
      parseInstantReadingProviderResponse(
        { ...providerReading, synthesis: reading.synthesis },
        request,
      ),
    ).toBeUndefined();
  });

  it("allows uncertainty language that does not claim visual evidence", () => {
    const reading = createReading();
    expect(getInstantReadingSafetyViolation(reading)).toBeUndefined();
  });

  it.each([
    "감정을 다루는 힘을 천천히 기르세요.",
    "별다른 근거가 없다면 판단을 잠시 미뤄보세요.",
    "상황은 행동에 따라 달라질 수 있습니다.",
    "연인과의 대화에서는 확인된 사실을 구분해 보세요.",
    "먼저 판단 기준을 정의해 보세요.",
    "내 세계관과 현실의 차이를 살펴보세요.",
    "죽음을 단정하는 표현은 피해야 합니다.",
    "새 기능이 탑재됐다는 사실만 확인하세요.",
    "관심 회사의 채용 페이지를 10분 살펴보세요.",
    "네트워킹 행사 하나를 찾아보세요.",
    "가벼운 워킹 모임을 검토해 보세요.",
    "현재 자리에서 확인할 사실을 하나 적어보세요.",
    "지금 확인하는 게 가장 중요합니다.",
    "결론을 미루는 게 더 안전합니다.",
    "물 한 컵을 마시며 잠시 쉬어 보세요.",
    "반복되는 에피소드를 사실과 추측으로 나눠 보세요.",
    "검토 메소드를 하나 정해 보세요.",
  ])("allows ordinary words that overlap Major Arcana names: %s", (text) => {
    expect(
      getInstantReadingSafetyViolation({
        ...createReading(),
        synthesis: text + sentence.repeat(3),
      }),
    ).toBeUndefined();
  });

  it.each([
    "개인의 선택이 어떤 의미인지 살펴봅니다.",
    "개인적 경계가 무엇을 뜻하는지 생각해 봅니다.",
    "관계 개선이 무엇을 뜻하는지 확인합니다.",
    "두 당사자는 대화를 이어갑니다.",
    "이 전개가 자연스럽습니다.",
    "질문 소개가 이어집니다.",
    "카드 공개가 늦어집니다.",
    "카드의 의미를 현실에 연결해 보세요.",
    "이 카드의 뜻은 새로운 시작입니다.",
    "카드에 담긴 의미를 살펴봅니다.",
    "The Fool represents a new beginning.",
    "The Queen of Wands suggests confidence.",
    "The first card represents a choice.",
    "새 길은 가능성을 의미합니다.",
    "새 선택이 무엇을 뜻하는지 살펴봅니다.",
    "두 개의 선택지가 무엇을 의미하는지 생각합니다.",
    "솔직한 말은 신뢰를 의미합니다.",
    "카드 속 공통된 의미를 연결합니다.",
    "지난 선택을 돌아보고 책임 있게 새 방향에 응답하는 태도를 뜻합니다.",
    "선택지는 두 개가 아니라 세 개입니다.",
    "두 개가 같은 의미를 뜻하지는 않습니다.",
    "한 개가 더 현실적인 선택을 의미합니다.",
    "카드에는 사람마다 다르게 적용할 수 있는 의미가 있습니다.",
    "카드에는 사람이 직접 확인할 점이 있습니다.",
    "책임이 두 배가 된다는 의미는 아닙니다.",
    "넘어야 할 산은 우선순위 조정을 뜻합니다.",
    "익숙한 선택과 반대 방향도 검토해 보세요.",
    "질문의 순서를 뒤집어서 살펴보세요.",
    "생각을 거꾸로 따라가 보면 빠진 전제를 찾을 수 있습니다.",
    "흐름을 따라가 보세요.",
    "산은 목표 앞의 부담을 뜻하는 비유입니다.",
    "배가 되는 부담이라는 뜻은 아닙니다.",
    "문은 새로운 선택지를 의미하는 비유일 뿐입니다.",
    "과거-현재의 경험을 구분해 보세요.",
    "과거/현재를 나누어 살펴봅니다.",
    "현재-미래의 선택을 비교해 보세요.",
    "원인-결과를 차분히 나눠 보세요.",
    "상대의 말을 따라가 보면 빠진 전제를 찾을 수 있습니다.",
    "그 사람의 설명을 따라가 보세요.",
    "연인의 대화 흐름을 따라가며 사실을 확인해 보세요.",
    "결론: 완드 퀸의 의미는 자신감입니다.",
    "완드 퀸 / 소드 3의 공통점은 결단입니다.",
    "카드에 중요한 선택지가 보입니다.",
    "카드에는 검토할 선택지가 있습니다.",
    "완드 6 카드는 노력에 대한 인정과 눈에 보이는 진전을 뜻합니다.",
    "세 카드에서 공통적으로 보이는 흐름은 선택과 책임입니다.",
    "카드에서 보이는 공통점은 신중함입니다.",
    "컵 킹은 다른 사람의 감정을 배려하는 태도입니다.",
    "완드 퀸은 따뜻하게 사람을 이끄는 주도성을 뜻합니다.",
    "소드 페이지는 젊은 마음으로 사실을 확인합니다.",
    "펜타클 퀸은 현실적인 돌봄으로 사람을 돕습니다.",
    "킹은 사람 자체가 아니라 책임 있는 판단을 뜻합니다.",
    "완드 퀸이 조언하는 태도는 자신감입니다.",
    "소드 3이 장애물처럼 느껴져도 감정을 정리해 보세요.",
    "정방향 외의 선택지도 현실에서는 검토할 수 있습니다.",
  ])(
    "does not mistake ordinary Korean words for animal imagery: %s",
    (text) => {
      expect(hasUnsupportedVisualClaim(text)).toBe(false);
    },
  );

  it("allows every canonical Korean meaning and reflection", () => {
    for (const card of Object.values(koCards)) {
      expect(hasUnsupportedVisualClaim(card.meaning)).toBe(false);
      expect(hasUnsupportedVisualClaim(card.reflection)).toBe(false);
      expect(
        getInstantReadingSafetyViolation({
          ...createReading(),
          synthesis: `${card.meaning} ${card.reflection} ${sentence.repeat(3)}`,
        }),
      ).toBeUndefined();
    }
  });
});
