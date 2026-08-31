import { describe, expect, it } from "vitest";
import {
  isInstantReadingTaxonomyEligible,
  parseInstantReadingRequest,
  parseInstantReadingResponse,
  validateInstantReadingText,
  type InstantReadingRequest,
} from "./instant-reading";
import { getReadingTaxonomy } from "./taxonomy";

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
  it("keeps public eligibility fail-closed for the self domain", () => {
    expect(isInstantReadingTaxonomyEligible(getReadingTaxonomy("love"))).toBe(
      true,
    );
    expect(
      isInstantReadingTaxonomyEligible(getReadingTaxonomy("career-direction")),
    ).toBe(true);
    expect(
      isInstantReadingTaxonomyEligible(getReadingTaxonomy("self-direction")),
    ).toBe(false);
    expect(
      isInstantReadingTaxonomyEligible(
        getReadingTaxonomy("money-life", "money-want-or-need"),
      ),
    ).toBe(false);
  });

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
    expect(
      parseInstantReadingRequest({ ...request, questionId: "unknown" }),
    ).toBeUndefined();
    expect(
      parseInstantReadingRequest({ ...request, questionId: "mutual-view" }),
    ).toBeUndefined();
    expect(
      parseInstantReadingRequest({
        ...request,
        questionId: "mutual-view",
        topicId: "feelings",
      }),
    ).toEqual({
      ...request,
      questionId: "mutual-view",
      topicId: "feelings",
    });
    expect(
      parseInstantReadingRequest({
        ...request,
        questionId: "career-stay-or-prepare",
        topicId: "career-direction",
      }),
    ).toEqual({
      ...request,
      questionId: "career-stay-or-prepare",
      topicId: "career-direction",
    });
    expect(
      parseInstantReadingRequest({
        ...request,
        questionId: "career-manager-view",
        topicId: "career-direction",
      }),
    ).toEqual({
      ...request,
      questionId: "career-manager-view",
      topicId: "career-direction",
    });
    expect(
      parseInstantReadingRequest({
        ...request,
        questionId: "romantic-partner-impression",
      }),
    ).toEqual({
      ...request,
      questionId: "romantic-partner-impression",
    });
    expect(
      parseInstantReadingRequest({
        ...request,
        questionId: "romantic-partner-impression",
        topicId: "feelings",
      }),
    ).toBeUndefined();
    expect(
      parseInstantReadingRequest({
        ...request,
        topicId: "self-direction",
      }),
    ).toBeUndefined();
    expect(
      parseInstantReadingRequest({
        ...request,
        questionId: "money-want-or-need",
        topicId: "money-life",
      }),
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
    const attractionRequest = {
      ...request,
      questionId: "interest-or-kindness",
      topicId: "feelings",
    } as const;
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
      expect(
        validateInstantReadingText(calibrated, attractionRequest)?.text,
      ).toBe(calibrated);
    }

    const romanticImpressionRequest = {
      ...request,
      questionId: "romantic-partner-impression",
      topicId: "love",
    } as const;
    const calibratedRomanticImpression = createValidText(3).replace(
      originalOverall,
      "독자는 이성에게 매력적인 사람으로 보일 가능성이 있습니다. 실제 인상은 직접 확인해야 합니다.",
    );
    expect(
      validateInstantReadingText(
        calibratedRomanticImpression,
        romanticImpressionRequest,
      )?.text,
    ).toBe(calibratedRomanticImpression);

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
    expect(
      validateInstantReadingText(factual, attractionRequest),
    ).toBeUndefined();

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
      "상대는 당신을 연애 대상으로 봅니다.",
      "상대에게 연애적 망설임이 있습니다.",
    ]) {
      const factualBeforeQualifier = createValidText(3).replace(
        originalOverall,
        bypass,
      );
      expect(
        validateInstantReadingText(factualBeforeQualifier, attractionRequest),
      ).toBeUndefined();
    }

    const factualReality = createValidText(3).replace(
      originalUnknown,
      "아직 모르는 점: 상대는 당신을 좋아해요. 이 관계의 답은 정해져 있습니다.",
    );
    expect(
      validateInstantReadingText(factualReality, attractionRequest),
    ).toBeUndefined();

    const calibratedInterest = createValidText(3).replace(
      originalOverall,
      "상대에게 연애적 관심이 있을 가능성이 있습니다. 다만 그 관심의 크기나 관계를 시작할 의향까지는 단정할 수 없습니다.",
    );
    expect(
      validateInstantReadingText(calibratedInterest, attractionRequest)?.text,
    ).toBe(calibratedInterest);

    const factualInterest = createValidText(3).replace(
      originalOverall,
      "상대에게 연애적 관심이 있습니다. 그 관심은 관계를 더 이어가려는 태도로 연결되어 있습니다.",
    );
    expect(
      validateInstantReadingText(factualInterest, attractionRequest),
    ).toBeUndefined();

    const originalFirstPossibility =
      "서로 표현하는 속도가 달라서 같은 행동을 다르게 받아들이며 불확실성이 커졌을 수 있습니다.";
    const implicitCalibrated = createValidText(3).replace(
      originalFirstPossibility,
      "한 가지 해석은 당신을 좋아할 가능성이 있다는 것입니다. 다만 실제 감정으로 확정할 수는 없습니다.",
    );
    expect(
      validateInstantReadingText(implicitCalibrated, attractionRequest)?.text,
    ).toBe(implicitCalibrated);

    const implicitFactual = createValidText(3).replace(
      originalFirstPossibility,
      "한 가지 해석은 당신을 좋아한다는 것입니다. 이 감정은 분명하게 이어지고 있습니다.",
    );
    expect(
      validateInstantReadingText(implicitFactual, attractionRequest),
    ).toBeUndefined();

    expect(
      validateInstantReadingText(implicitCalibrated, {
        ...request,
        topicId: "feelings",
      })?.text,
    ).toBe(implicitCalibrated);

    for (const topicId of ["love", "reunion", "relationship-flow"] as const) {
      const relationshipRequest = { ...request, topicId };
      expect(
        validateInstantReadingText(implicitCalibrated, relationshipRequest),
      ).toBeUndefined();
      expect(
        validateInstantReadingText(implicitFactual, relationshipRequest),
      ).toBeUndefined();
    }
  });

  it("uses a question answer target instead of a broad topic default", () => {
    const selfFocused = createValidText(3).replace(
      "새로운 가능성을 향한 움직임과 분명한 표현이 함께 필요하지만, 아직 확인하지 않은 부분은 현실의 대화로 살펴야 기대와 관찰을 구분할 수 있습니다.",
      "카드 의미는 내가 크게 읽은 신호와 실제로 확인한 행동 사이의 차이를 중심으로 차분하게 살펴보게 합니다.",
    );
    const feelingsRequest = { ...request, topicId: "feelings" } as const;

    expect(
      validateInstantReadingText(selfFocused, feelingsRequest),
    ).toBeUndefined();
    expect(
      validateInstantReadingText(selfFocused, {
        ...feelingsRequest,
        questionId: "ignored-signals",
      })?.text,
    ).toBe(selfFocused);
  });

  it("keeps broad relationship impressions possible rather than factual", () => {
    const impressionRequest = {
      ...request,
      questionId: "how-they-see-me",
    } as const;
    const originalOverall =
      "새로운 가능성을 향한 움직임과 분명한 표현이 함께 필요하지만, 아직 확인하지 않은 부분은 현실의 대화로 살펴야 기대와 관찰을 구분할 수 있습니다.";

    const calibrated = createValidText(3).replace(
      originalOverall,
      "카드상 그 사람이 독자를 신중한 사람으로 볼 가능성에 무게가 실립니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
    );
    expect(
      validateInstantReadingText(calibrated, impressionRequest)?.text,
    ).toBe(calibrated);

    const factual = createValidText(3).replace(
      originalOverall,
      "그 사람은 독자를 차갑고 거리감 있는 사람으로 봅니다. 이 인상은 이미 분명합니다.",
    );
    expect(
      validateInstantReadingText(factual, impressionRequest),
    ).toBeUndefined();

    const factualSupportingSection = createValidText(3).replace(
      "1. 새 가능성을 열어 두되 아직 확인하지 않은 기대를 사실처럼 단정하지 않는 태도를 살펴봅니다.",
      "1. 그 사람에게 독자는 차갑고 거리감 있는 이미지입니다.",
    );
    expect(
      validateInstantReadingText(factualSupportingSection, impressionRequest),
    ).toBeUndefined();

    const factualPerspectiveSupportingSection = createValidText(3).replace(
      "1. 새 가능성을 열어 두되 아직 확인하지 않은 기대를 사실처럼 단정하지 않는 태도를 살펴봅니다.",
      "1. 그 사람이 보는 독자는 친절합니다.",
    );
    expect(
      validateInstantReadingText(
        factualPerspectiveSupportingSection,
        impressionRequest,
      ),
    ).toBeUndefined();

    const openEndedPerspectiveSupportingSection = createValidText(3).replace(
      "1. 새 가능성을 열어 두되 아직 확인하지 않은 기대를 사실처럼 단정하지 않는 태도를 살펴봅니다.",
      "1. 그 사람이 보는 독자는 재미있고 활기가 많습니다.",
    );
    expect(
      validateInstantReadingText(
        openEndedPerspectiveSupportingSection,
        impressionRequest,
      ),
    ).toBeUndefined();

    const borrowedCalibrationSupportingSection = createValidText(3).replace(
      "1. 새 가능성을 열어 두되 아직 확인하지 않은 기대를 사실처럼 단정하지 않는 태도를 살펴봅니다.",
      "1. 가능성이 열려 있지만 그 사람이 보는 독자는 활기가 많습니다.",
    );
    expect(
      validateInstantReadingText(
        borrowedCalibrationSupportingSection,
        impressionRequest,
      ),
    ).toBeUndefined();

    const mixedDescriptionAndGroundingSection = createValidText(3).replace(
      "1. 새 가능성을 열어 두되 아직 확인하지 않은 기대를 사실처럼 단정하지 않는 태도를 살펴봅니다.",
      "1. 독자는 다정하고 카드 의미를 확인합니다.",
    );
    expect(
      validateInstantReadingText(
        mixedDescriptionAndGroundingSection,
        impressionRequest,
      ),
    ).toBeUndefined();

    for (const calibratedClaim of [
      "그 사람 눈에 독자는 신중한 사람일 가능성이 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "독자는 신중하게 보일 가능성이 있습니다. 실제 인상은 반복 행동으로 확인해야 합니다.",
      "그 사람은 독자를 매력적으로 느낄 수 있습니다. 현실의 평가는 직접 확인해야 합니다.",
      "그 사람 눈에 독자는 매력적인 사람이 아닐 가능성이 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "그 사람은 독자를 매력적이라고 판단할 수 있습니다. 실제 판단은 직접 받은 말로 확인해야 합니다.",
      "그 사람에게 독자의 첫인상은 좋아 보일 가능성이 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "그 사람 눈에 독자는 친절할 가능성이 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "그 사람 눈에 독자는 독립적으로 보일 가능성이 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "그 사람 눈에 독자는 매력적이지 않을 가능성이 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "그 사람 눈에 독자는 따뜻하지 않게 보일 가능성이 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "그 사람이 보기에는 신중할 가능성이 크고 활기도 많을 가능성이 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "그 사람이 보기에는 신중한 것 같고 활기도 많은 것 같습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "그 사람이 보기에는 신중할 가능성이 있으면서 활기도 많을 가능성이 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "그 사람은 독자에게 다정한 사람이라고 말했을 가능성이 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "그 사람은 독자에게 재미있다고 말했을 가능성이 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "그 사람은 독자를 매력적으로 느꼈을 가능성이 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "그 사람은 독자를 다정하고 편한 사람으로 봤을 가능성이 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "그 사람은 독자를 다정하고 편한 사람으로 보고 있을 가능성이 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "그 사람은 독자에 대해 다정하고 편한 사람이라고 말했을 가능성이 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "그 사람은 독자의 인상이 다정하고 편하다고 말했을 가능성이 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "그 사람께서는 독자에게 다정하다고 말했을 가능성이 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "그 사람들은 독자에게 다정하다고 말했을 가능성이 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "그분은 독자에게 다정하다고 말했을 가능성이 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "그 사람은 제게 다정하다고 말했을 가능성이 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "그 사람은 독자를 다정하게 본다고 할 가능성이 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "그 사람은 독자를 매력적으로 보지 않는다고 할 가능성이 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "그 사람은 독자를 다정하다고 볼 가능성이 있고 차갑다고 볼 가능성도 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
    ]) {
      const calibratedVariant = createValidText(3).replace(
        originalOverall,
        calibratedClaim,
      );
      expect(
        validateInstantReadingText(calibratedVariant, impressionRequest)?.text,
      ).toBe(calibratedVariant);
    }

    for (const factualClaim of [
      "카드상 조심스러운 사람으로 보일 가능성이 있습니다. 그러나 독자는 차갑고 거리감 있는 사람입니다.",
      "카드상 조심스럽게 볼 가능성이 있고 그 사람은 독자를 매력적으로 느낍니다.",
      "그 사람 눈에 독자는 차갑고 거리감 있는 사람입니다.",
      "독자는 차갑고 거리감 있는 이미지입니다.",
      "독자는 신중합니다. 이 인상은 이미 정해져 있습니다.",
      "상대에게 독자는 차갑고 부담스럽습니다.",
      "그 사람 눈에 독자는 매력적인 사람이 아닙니다.",
      "그 사람은 독자를 매력적이라고 판단합니다.",
      "그 사람 눈에 독자는 친절합니다.",
      "그 사람 눈에 독자는 독립적입니다.",
      "그 사람 눈에 독자는 밝습니다.",
      "독자는 낯선 자리에서 조심스럽습니다.",
      "독자는 다정합니다.",
      "카드상 가능성이 열려 있지만 독자는 다정합니다.",
      "카드상 신중하게 보일 가능성이 있습니다. 그 사람이 보기에는 다정하고 활기가 많습니다.",
      "카드상 신중하게 보일 가능성이 있습니다. 그 사람 입장에서는 다정하고 활기가 많습니다.",
      "카드상 신중하게 보일 가능성이 있습니다. 그 사람 기준으로는 다정하고 활기가 많습니다.",
      "그 사람이 보기에는 신중할 가능성이고 활기가 많습니다.",
      "그 사람이 보기에는 신중할 가능성이 크고 활기가 많습니다.",
      "그 사람이 보기에는 신중한 것 같고 활기가 많습니다.",
      "그 사람이 보기에는 신중한 것 같으며 활기가 많습니다.",
      "그 사람이 보기에는 다정하고 활기가 많을 가능성이 있습니다.",
      "그 사람이 보기에는 신중할 가능성이 있으면서 활기가 많습니다.",
      "카드상 여러 가능성이 열려 있습니다. 실제로 그 사람은 독자를 다정하다고 여긴다는 점을 확인합니다.",
      "카드상 여러 가능성이 열려 있습니다. 그 사람은 독자를 다정하게 본다고 합니다.",
      "카드상 여러 가능성이 열려 있습니다. 그 사람은 독자를 매력적으로 보지 않는다고 합니다.",
      "그 사람과의 관계에서 독자는 무엇을 확인할 필요가 있다고 생각합니다.",
      "그 사람과의 관계에서 당신은 어떤 기대를 갖고 있다고 생각하세요.",
      "그 사람과의 관계에서 당신은 무엇이 필요하다고 생각하시는지요.",
      "그 사람은 독자를 다정하다고 볼 가능성이 있고 차갑다고도 말했습니다. 두 해석은 모두 열려 있습니다.",
      "그 사람은 독자에게 다정한 사람이라고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "그 사람은 독자에게 다정하다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "그 사람은 독자에게 재미있다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "그 사람은 독자에게 조용하다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "그 사람은 독자를 매력적으로 느꼈습니다. 카드가 다른 가능성을 시사합니다.",
      "그 사람은 독자를 다정하고 편한 사람으로 봤습니다. 카드가 다른 가능성을 시사합니다.",
      "그 사람은 독자를 다정하고 편한 사람으로 보고 있습니다. 카드가 다른 가능성을 시사합니다.",
      "그 사람은 독자에 대해 다정하고 편한 사람이라고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "그 사람은 독자의 인상이 다정하고 편하다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "그 사람은 독자에게 결과를 말했다고 합니다. 카드가 다른 가능성을 시사합니다.",
      "그 사람은 나한테 반했다고 말했습니다. 카드가 호감 가능성을 시사합니다.",
      "그 사람께서는 독자에게 다정하다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "그 사람들은 독자에게 다정하다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "그분은 독자에게 다정하다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "그 사람은 제게 다정하다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "그 사람 눈에 독자는 매력적이지 않습니다.",
      "그 사람 눈에 독자는 따뜻하지 않습니다.",
      "그 사람은 독자와 연애할 가능성을 높게 봅니다.",
    ]) {
      const factualVariant = createValidText(3).replace(
        originalOverall,
        factualClaim,
      );
      expect(
        validateInstantReadingText(factualVariant, impressionRequest),
      ).toBeUndefined();
    }

    const safeGrounding = createValidText(3).replace(
      "열린 가능성과 능동적인 표현이 서로 힘을 보태는 동시에, 아픈 감정을 건너뛰면 속도가 현실보다 앞설 수 있다는 긴장이 가장 두드러집니다.",
      "카드가 보여 주는 가능성은 하나로 모입니다. 두 의미는 서로 다른 관점을 함께 살펴보게 합니다.",
    );
    expect(
      validateInstantReadingText(safeGrounding, impressionRequest)?.text,
    ).toBe(safeGrounding);

    const calibratedWithReaderGrounding = createValidText(3).replace(
      originalOverall,
      "카드상 그 사람이 독자를 신중하게 볼 가능성이 있습니다. 독자는 두 카드의 차이를 확인합니다.",
    );
    expect(
      validateInstantReadingText(
        calibratedWithReaderGrounding,
        impressionRequest,
      )?.text,
    ).toBe(calibratedWithReaderGrounding);

    for (const calibratedWithInlineGrounding of [
      "그 사람이 보기에는 신중할 가능성이 있고 실제 인상은 직접 확인해야 합니다.",
      "그 사람이 보는 독자는 신중할 가능성이 있고 독자는 두 카드의 차이를 확인합니다.",
    ]) {
      const inlineGrounding = createValidText(3).replace(
        originalOverall,
        calibratedWithInlineGrounding,
      );
      expect(
        validateInstantReadingText(inlineGrounding, impressionRequest)?.text,
      ).toBe(inlineGrounding);
    }

    const perspectiveReflectionQuestion = createValidText(3).replace(
      "지금 내가 기대와 실제 관찰을 구분하기 위해 가장 먼저 확인할 수 있는 것은 무엇인가요?",
      "그 사람이 보는 독자는 어떤 사람으로 느껴지는지 무엇을 확인할까요?",
    );
    expect(
      validateInstantReadingText(
        perspectiveReflectionQuestion,
        impressionRequest,
      )?.text,
    ).toBe(perspectiveReflectionQuestion);

    for (const [reflectionQuestion, reflectionRequest] of [
      [
        "그 사람과의 관계에서 독자는 무엇을 확인할 필요가 있다고 생각하나요?",
        impressionRequest,
      ],
      [
        "그 사람과의 관계에서 독자는 어떤 기대를 확인할 필요가 있다고 생각하나요?",
        { ...request, questionId: "mutual-view", topicId: "feelings" },
      ],
      [
        "그 사람과의 관계에서 당신은 어떤 기대를 갖고 있다고 생각하세요?",
        { ...request, questionId: "mutual-view", topicId: "feelings" },
      ],
      [
        "그 사람과의 관계에서 당신은 무엇이 필요하다고 생각하시는지요?",
        { ...request, questionId: "mutual-view", topicId: "feelings" },
      ],
      ["그 사람은 독자를 어떻게 본다고 생각하세요?", impressionRequest],
      [
        "그 사람은 독자를 다정하다고 생각하는지 어떻게 확인할까요?",
        impressionRequest,
      ],
      [
        "그 사람에게 독자는 다정한 사람으로 여겨질 가능성이 있으니 무엇을 현실에서 확인할까요?",
        impressionRequest,
      ],
      [
        "그 사람에게 독자는 카드 의미상 어떤 사람으로 보일 수 있을까요?",
        impressionRequest,
      ],
      [
        "그 사람은 독자를 다정하다고 말했을 가능성이 있고, 다른 가능성도 있나요?",
        impressionRequest,
      ],
      [
        "상사는 독자를 어떻게 평가한다고 생각하세요?",
        {
          ...request,
          questionId: "career-manager-view",
          topicId: "career-direction",
        },
      ],
      [
        "상사는 독자를 핵심 인재라고 평가하는지 어떻게 확인할까요?",
        {
          ...request,
          questionId: "career-manager-view",
          topicId: "career-direction",
        },
      ],
      [
        "상사에게 독자는 핵심 인재로 여겨질 가능성이 있으니 어떤 피드백을 확인할까요?",
        {
          ...request,
          questionId: "career-manager-view",
          topicId: "career-direction",
        },
      ],
      [
        "상사에게 독자는 카드 흐름상 어떤 인재로 보일 수 있을까요?",
        {
          ...request,
          questionId: "career-manager-view",
          topicId: "career-direction",
        },
      ],
      [
        "상사는 독자를 핵심 인재라고 평가했을 가능성이 있고, 다른 가능성도 있나요?",
        {
          ...request,
          questionId: "career-manager-view",
          topicId: "career-direction",
        },
      ],
    ] as const) {
      const embeddedReflectionQuestion = createValidText(3).replace(
        "지금 내가 기대와 실제 관찰을 구분하기 위해 가장 먼저 확인할 수 있는 것은 무엇인가요?",
        reflectionQuestion,
      );
      expect(
        validateInstantReadingText(
          embeddedReflectionQuestion,
          reflectionRequest,
        )?.text,
      ).toBe(embeddedReflectionQuestion);
    }

    for (const [factualPremiseQuestion, factualPremiseRequest] of [
      [
        "그 사람은 독자를 다정하다고 하는데, 무엇을 현실에서 확인할까요?",
        impressionRequest,
      ],
      [
        "상사는 독자를 핵심 인재로 여긴다고 하는데, 어떤 피드백을 확인할까요?",
        {
          ...request,
          questionId: "career-manager-view",
          topicId: "career-direction",
        },
      ],
      [
        "그 사람은 독자를 다정하다고 말했으니 무엇을 현실에서 확인할까요?",
        impressionRequest,
      ],
      [
        "상사는 독자를 핵심 인재로 여긴다고 했으니 어떤 피드백을 확인할까요?",
        {
          ...request,
          questionId: "career-manager-view",
          topicId: "career-direction",
        },
      ],
      [
        "그 사람에게 독자는 다정한 사람으로 여겨지니 무엇을 현실에서 확인할까요?",
        impressionRequest,
      ],
      [
        "상사에게 독자는 핵심 인재로 여겨지니 어떤 피드백을 확인할까요?",
        {
          ...request,
          questionId: "career-manager-view",
          topicId: "career-direction",
        },
      ],
      [
        "그 사람은 독자를 다정하다고 말했고, 다른 가능성도 있나요?",
        impressionRequest,
      ],
      [
        "상사는 독자를 핵심 인재라고 평가했고, 다른 가능성도 있나요?",
        {
          ...request,
          questionId: "career-manager-view",
          topicId: "career-direction",
        },
      ],
      [
        "그 사람이 보는 독자는 다정한데, 무엇을 현실에서 확인할까요?",
        impressionRequest,
      ],
      [
        "상사가 보는 독자는 핵심 인재인데, 어떤 피드백을 확인할까요?",
        {
          ...request,
          questionId: "career-manager-view",
          topicId: "career-direction",
        },
      ],
    ] as const) {
      const factualPremiseReflection = createValidText(3).replace(
        "지금 내가 기대와 실제 관찰을 구분하기 위해 가장 먼저 확인할 수 있는 것은 무엇인가요?",
        factualPremiseQuestion,
      );
      expect(
        validateInstantReadingText(
          factualPremiseReflection,
          factualPremiseRequest,
        ),
      ).toBeUndefined();
    }

    for (const actionLine of [
      "작은 행동: 부담이 적은 질문 하나를 상대에게 건네 보세요.",
      "작은 행동: 자신의 경계를 한 문장으로 전해 보세요.",
      "작은 행동: 짧은 메시지를 상대에게 보내 보세요.",
      "작은 행동: 상대와 짧게 대화해 보세요.",
      "작은 행동: 잠시 기다려 보세요.",
      "작은 행동: 한 걸음 물러나 보세요.",
      "작은 행동: 짧게 사과해 보세요.",
      "작은 행동: 한 번 연락해 보세요.",
    ]) {
      const readerAction = createValidText(3).replace(
        "작은 행동: 부담이 적은 질문 하나를 골라 서로 확인할 수 있는 범위에서 짧게 대화해 보세요.",
        actionLine,
      );
      expect(
        validateInstantReadingText(readerAction, impressionRequest)?.text,
      ).toBe(readerAction);
    }

    for (const unsafeActionLine of [
      "작은 행동: 독자는 다정하고 질문 하나를 상대에게 건넵니다.",
      "작은 행동: 독자는 다정하고 배려심이 깊습니다.",
      "작은 행동: 독자는 질문을 건네고 다정합니다.",
      "작은 행동: 독자는 다정하며 질문 하나를 상대에게 건넵니다.",
      "작은 행동: 독자는 업무를 대하는 태도가 진지합니다.",
      "작은 행동: 독자는 업무를 대할 때 진지합니다.",
      "작은 행동: 독자는 사과합니다.",
      "작은 행동: 독자는 연락합니다.",
      "작은 행동: 독자는 관계를 대할 때 성숙합니다.",
    ]) {
      const readerDescription = createValidText(3).replace(
        "작은 행동: 부담이 적은 질문 하나를 골라 서로 확인할 수 있는 범위에서 짧게 대화해 보세요.",
        unsafeActionLine,
      );
      expect(
        validateInstantReadingText(readerDescription, impressionRequest),
      ).toBeUndefined();
    }
  });

  it("allows requested calibrated attraction without adding or factualizing it", () => {
    const originalOverall =
      "새로운 가능성을 향한 움직임과 분명한 표현이 함께 필요하지만, 아직 확인하지 않은 부분은 현실의 대화로 살펴야 기대와 관찰을 구분할 수 있습니다.";
    const calibratedAttractionClaims = [
      "카드상 그 사람의 감정은 호감일 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람에게 끌림이 있을 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람에게 연애 관심이 있을 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람에게 연애적 관심이 있을 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람에게 연애적 끌림이 있을 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람은 독자에게 설렘을 느낄 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람은 독자에게 두근거림을 느낄 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람은 독자에게 이성적인 관심을 느낄 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "상대의 호감이 크게 커졌을 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "상대의 연애 감정이 매우 깊을 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "상대의 호감이 사라졌을 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "상대의 연애 감정이 식었을 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람은 독자에게 끌릴 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람은 독자를 연인으로 볼 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람은 독자를 이성으로 볼 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람에게 독자가 마음에 들 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람에게 독자는 이성으로 보일 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람에게 독자는 연인으로 느껴질 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람에게 독자는 연애 상대로 보일 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람에게 독자는 연인일 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람에게 독자는 이성일 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람은 독자를 연인이라고 생각할 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람은 독자를 연인 후보로 볼 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람에게 독자는 연인 같은 사람일 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람은 독자를 애인 후보로 볼 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람은 독자를 데이트 상대로 볼 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람은 독자에게 끌린다고 말했을 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람은 독자에게 끌렸다고 말했을 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람은 독자에게 이상형이라고 말했을 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람은 독자에게 반했다고 말했을 가능성이 있습니다. 다만 실제 감정으로 단정할 수는 없습니다.",
      "그 사람은 독자에게 애정을 느낄 가능성이 있습니다. 현실 반응은 직접 확인해야 합니다.",
      "상대의 마음이 독자 쪽으로 움직일 가능성이 있습니다. 현실 반응은 직접 확인해야 합니다.",
      "그 사람은 독자를 향한 연정을 품을 가능성이 있습니다. 현실 반응은 직접 확인해야 합니다.",
    ];
    const factualAttractionClaims = [
      "카드상 여러 가능성이 열려 있습니다. 상대의 감정은 분명한 호감입니다. 실제 행동도 함께 확인해야 합니다.",
      "카드상 여러 가능성이 열려 있습니다. 그 사람은 당신에게 끌립니다. 실제 행동도 함께 확인해야 합니다.",
      "카드상 여러 가능성이 열려 있습니다. 그 사람에게 독자가 마음에 듭니다. 실제 행동도 함께 확인해야 합니다.",
      "카드상 여러 가능성이 열려 있습니다. 그러나 그 사람은 독자가 마음에 안 듭니다. 실제 행동도 함께 확인해야 합니다.",
      "카드상 여러 가능성이 열려 있습니다. 그 사람은 독자와 연애할 수 있다고 봅니다. 실제 행동도 함께 확인해야 합니다.",
      "카드상 여러 가능성이 열려 있습니다. 그 사람에게 독자는 연인입니다. 실제 행동도 함께 확인해야 합니다.",
      "그 사람은 독자에게 끌린다고 말했습니다. 카드가 호감 가능성을 시사합니다.",
      "그 사람은 독자에게 끌렸다고 말했습니다. 카드가 호감 가능성을 시사합니다.",
      "그 사람은 독자에게 이상형이라고 말했습니다. 카드가 호감 가능성을 시사합니다.",
      "그 사람은 독자에게 반했다고 말했습니다. 카드가 호감 가능성을 시사합니다.",
      "그 사람은 나한테 반했다고 말했습니다. 카드가 호감 가능성을 시사합니다.",
      "상대의 호감이 크게 커졌습니다. 다른 가능성도 현실 대화로 확인해야 합니다.",
      "상대의 연애 감정이 매우 깊습니다. 다른 가능성도 현실 대화로 확인해야 합니다.",
      "상대의 호감이 완전히 사라졌습니다. 다른 가능성도 현실 대화로 확인해야 합니다.",
      "상대의 연애 감정은 이미 식었습니다. 다른 가능성도 현실 대화로 확인해야 합니다.",
      "상대 쪽의 호감이 크게 커졌습니다. 다른 가능성은 현실 대화로 확인해야 합니다.",
      "그 사람 안의 연애 감정은 이미 깊습니다. 다른 가능성은 현실 대화로 확인해야 합니다.",
      "상대방 측 호감은 완전히 사라졌습니다. 다른 가능성은 현실 대화로 확인해야 합니다.",
      "상대의 마음이 독자 쪽으로 움직입니다. 다른 가능성은 현실 대화로 확인해야 합니다.",
    ];

    for (const attractionRequest of [
      { ...request, topicId: "feelings" },
      {
        ...request,
        questionId: "interest-or-kindness",
        topicId: "feelings",
      },
    ] as const) {
      for (const claim of calibratedAttractionClaims) {
        const calibratedAttraction = createValidText(3).replace(
          originalOverall,
          claim,
        );
        expect(
          validateInstantReadingText(calibratedAttraction, attractionRequest)
            ?.text,
        ).toBe(calibratedAttraction);
      }
      for (const claim of factualAttractionClaims) {
        const factualAttraction = createValidText(3).replace(
          originalOverall,
          claim,
        );
        expect(
          validateInstantReadingText(factualAttraction, attractionRequest),
        ).toBeUndefined();
      }

      for (const assumptiveActionLine of [
        "작은 행동: 상대의 호감을 사실로 확신하세요.",
        "작은 행동: 그 사람과 연인이 되었다고 상상하세요.",
        "작은 행동: 상대의 호감을 사실로 받아들이세요.",
        "작은 행동: 상대의 호감이 확실하다고 믿으세요.",
        "작은 행동: 그 사람과 연인이라고 여기세요.",
        "작은 행동: 상대의 호감을 기정사실로 삼으세요.",
        "작은 행동: 상대의 호감 가능성은 낮게 두되 그 사람과 연인이라고 믿으세요.",
        "작은 행동: 상대의 호감을 단정하지 말고 그 사람과 연인이라고 믿으세요.",
        "작은 행동: 두 사람이 이미 사귀고 있다고 믿으세요.",
        "작은 행동: 그 사람과 이미 교제한다고 믿으세요.",
        "작은 행동: 두 사람이 연애 중이라고 믿으세요.",
        "작은 행동: 상대의 감정이 확실하다고 믿으세요.",
        "작은 행동: 상대의 감정을 확실한 사실로 받아들이세요.",
        "작은 행동: 상대의 마음을 사실로 받아들이세요.",
        "작은 행동: 그 사람의 감정을 진실이라고 여기세요.",
        "작은 행동: 상대의 호감을 실제 사실로 믿으세요.",
        "작은 행동: 상대의 호감이 현실이라고 믿으세요.",
        "작은 행동: 상대의 호감 신호를 확실한 사실로 믿으세요.",
        "작은 행동: 상대의 호감 가능성을 살펴보세요. 그 사람과 연인이라고 믿으세요.",
        "작은 행동: 상대의 호감을 확인된 사실로 믿으세요.",
        "작은 행동: 상대의 호감을 관찰된 진실로 받아들이세요.",
        "작은 행동: 상대의 호감을 지켜보지 말고 사실로 믿으세요.",
        "작은 행동: 상대의 호감을 확인하고 사실로 믿으세요.",
        "작은 행동: 상대의 호감 가능성을 살펴보고 그 사람과 연인이라고 믿으세요.",
        "작은 행동: 상대의 호감 가능성으로 생각하고 그 사람과 연인이라고 믿으세요.",
        "작은 행동: 그분의 마음을 사실로 받아들이세요.",
        "작은 행동: 타인의 감정을 확실한 사실로 믿으세요.",
        "작은 행동: 상대 측의 의도를 사실이라고 여기세요.",
        "작은 행동: 그 사람과 연인이라고 믿고 호감 가능성은 따로 확인해 보세요.",
        "작은 행동: 상대의 호감을 사실로 믿지만 다른 가능성도 살펴보세요.",
        "작은 행동: 그분의 마음을 사실로 믿고 다른 가능성을 확인해 보세요.",
        "작은 행동: 상대의 호감을 확실한 사실이라고 판단하세요.",
        "작은 행동: 그 사람과 연인 사이라고 결론 내리세요.",
        "작은 행동: 상대의 마음을 진실이라고 생각하세요.",
        "작은 행동: 상대의 호감을 사실로 믿으며 다른 가능성을 확인해 보세요.",
        "작은 행동: 상대의 호감을 사실로 믿으면서 다른 가능성을 살펴보세요.",
        "작은 행동: 상대의 호감을 사실로 믿어도 다른 가능성을 확인해 보세요.",
        "작은 행동: 그 사람을 애인처럼 대하세요.",
        "작은 행동: 이미 연인인 것처럼 행동하세요.",
        "작은 행동: 이미 사귀는 사이처럼 연락하세요.",
        "작은 행동: 이미 커플인 것처럼 행동하세요.",
        "작은 행동: 이미 썸 관계인 것처럼 연락하세요.",
        "작은 행동: 이미 데이트 중인 것처럼 대하세요.",
        "작은 행동: 그 사람을 애인처럼 대하지 말고 이미 연인인 것처럼 행동하세요.",
        "작은 행동: 애인처럼 대하기보다 커플처럼 행동하세요.",
        "작은 행동: 이미 연인인 양 행동하세요.",
        "작은 행동: 그 사람에게 애인 행세를 하세요.",
        "작은 행동: 이미 커플처럼 굴어 보세요.",
        "작은 행동: 상대의 호감을 사실로 믿는데도 다른 가능성을 확인해 보세요.",
        "작은 행동: 상대의 호감을 사실로 믿고도 다른 가능성을 살펴보세요.",
        "작은 행동: 상대의 호감을 사실로 믿는 반면 다른 가능성을 확인해 보세요.",
        "작은 행동: 애인처럼 대하지 않은 채 이미 커플처럼 행동하세요.",
        "작은 행동: 애인처럼 대하지 않는 대신 이미 커플처럼 굴어 보세요.",
        "작은 행동: 호감을 사실로 믿지 않은 채 그 사람과 연인이라고 믿으세요.",
        "작은 행동: 호감을 단정하지 않는 대신 연인 관계라고 확신하세요.",
        "작은 행동: 호감 가능성을 살펴본 채 그 사람과 연인이라고 믿으세요.",
        "작은 행동: 호감 가능성을 생각하는 대신 이미 연인이라고 확신하세요.",
        "작은 행동: 그 사람과 연인이라고 믿고 호감은 확신하지 마세요.",
        "작은 행동: 이미 커플처럼 행동하고 애인처럼 대하지 마세요.",
        "작은 행동: 상대의 호감을 확실시하세요.",
        "작은 행동: 상대의 호감을 기정사실화하세요.",
        "작은 행동: 그 사람과 연인 관계라고 못 박으세요.",
        "작은 행동: 연인 관계를 이미 사실로 놓은 상태에서 짧게 대화해 보세요.",
        "작은 행동: 연인 관계가 사실인 상태에서 상대와 짧게 대화해 보세요.",
        "작은 행동: 애인 사이가 맞다는 틀 안에서 관계를 확인해 보세요.",
        "작은 행동: 연인 관계가 이미 정해진 상태에서 상대와 짧게 대화해 보세요.",
        "작은 행동: 연인 관계가 이미 성립된 상태에서 상대와 짧게 대화해 보세요.",
        "작은 행동: 애인 사이로 굳어진 상태에서 관계를 확인해 보세요.",
        "작은 행동: 상대의 의도가 호의일 가능성을 사실로 받아들인 뒤 질문해 보세요.",
        "작은 행동: 상대 마음일 가능성을 확신한 뒤 행동을 관찰해 보세요.",
        "작은 행동: 상대의 호감을 확정하세요.",
        "작은 행동: 상대가 호감이 있다는 점을 인정하세요.",
        "작은 행동: 그 사람과 연인 관계라고 규정하세요.",
        "작은 행동: 상대의 호감을 당연시하고 실제 신호를 확인해 보세요.",
        "작은 행동: 그 사람을 연인으로 취급하고 행동을 관찰해 보세요.",
        "작은 행동: 상대의 호감을 정답으로 정하고 실제 말은 질문해 보세요.",
        "작은 행동: 상대의 호감을 당연시한 채 실제 신호를 확인해 보세요.",
        "작은 행동: 그 사람을 연인으로 취급한 채 행동을 관찰해 보세요.",
        "작은 행동: 상대의 호감을 당연시한 대신 실제 신호를 확인해 보세요.",
        "작은 행동: 그 사람을 연인으로 취급한 대신 행동을 관찰해 보세요.",
        "작은 행동: 상대의 반응을 호감으로 받아들여 실제 행동을 확인해 보세요.",
        "작은 행동: 상대의 말을 호감으로 여겨 실제 행동을 확인해 보세요.",
        "작은 행동: 상대의 반응을 호감으로 취급해 실제 행동을 확인해 보세요.",
        "작은 행동: 그 사람을 연인으로 봐 실제 말과 행동을 확인해 보세요.",
        "작은 행동: 둘이 이미 만나는 사이라고 믿고 메시지를 보내 보세요.",
        "작은 행동: 상대와 데이트하는 사이라고 여기고 짧게 대화해 보세요.",
        "작은 행동: 두 사람이 특별한 사이라고 확신하고 관계를 확인해 보세요.",
        "작은 행동: 둘이 공식적인 관계라고 믿고 상대에게 연락해 보세요.",
      ]) {
        const assumptiveAction = createValidText(3).replace(
          "작은 행동: 부담이 적은 질문 하나를 골라 서로 확인할 수 있는 범위에서 짧게 대화해 보세요.",
          assumptiveActionLine,
        );
        expect(
          validateInstantReadingText(assumptiveAction, attractionRequest),
        ).toBeUndefined();
      }

      const realityBasedAction = createValidText(3).replace(
        "작은 행동: 부담이 적은 질문 하나를 골라 서로 확인할 수 있는 범위에서 짧게 대화해 보세요.",
        "작은 행동: 상대의 호감을 단정하지 말고 실제 행동을 확인해 보세요.",
      );
      expect(
        validateInstantReadingText(realityBasedAction, attractionRequest)?.text,
      ).toBe(realityBasedAction);

      const emphasizedNegativeAction = createValidText(3).replace(
        "작은 행동: 부담이 적은 질문 하나를 골라 서로 확인할 수 있는 범위에서 짧게 대화해 보세요.",
        "작은 행동: 상대의 호감을 확신하지는 말고 실제 행동을 확인해 보세요.",
      );
      expect(
        validateInstantReadingText(emphasizedNegativeAction, attractionRequest)
          ?.text,
      ).toBe(emphasizedNegativeAction);

      const comparativeRealityAction = createValidText(3).replace(
        "작은 행동: 부담이 적은 질문 하나를 골라 서로 확인할 수 있는 범위에서 짧게 대화해 보세요.",
        "작은 행동: 상대의 호감을 믿기보다 실제 행동을 확인해 보세요.",
      );
      expect(
        validateInstantReadingText(comparativeRealityAction, attractionRequest)
          ?.text,
      ).toBe(comparativeRealityAction);

      const purposeClauseAction = createValidText(3).replace(
        "작은 행동: 부담이 적은 질문 하나를 골라 서로 확인할 수 있는 범위에서 짧게 대화해 보세요.",
        "작은 행동: 상대의 호감 여부를 알고 싶다면 직접 질문해 보세요.",
      );
      expect(
        validateInstantReadingText(purposeClauseAction, attractionRequest)
          ?.text,
      ).toBe(purposeClauseAction);

      const calibratedBeliefAction = createValidText(3).replace(
        "작은 행동: 부담이 적은 질문 하나를 골라 서로 확인할 수 있는 범위에서 짧게 대화해 보세요.",
        "작은 행동: 호감 가능성으로 받아들이고 실제 행동을 확인해 보세요.",
      );
      expect(
        validateInstantReadingText(calibratedBeliefAction, attractionRequest)
          ?.text,
      ).toBe(calibratedBeliefAction);

      for (const nonFactualizingActionLine of [
        "작은 행동: 상대의 마음을 추측하지 마세요.",
        "작은 행동: 상대의 감정을 존중하세요.",
        "작은 행동: 그 사람의 의도를 대신 정하지 마세요.",
        "작은 행동: 상대의 호감을 확실한 사실이라고 판단하지 마세요.",
        "작은 행동: 그 사람과 연인 사이라고 결론 내리기보다 직접 질문해 보세요.",
        "작은 행동: 상대의 호감이 사실인지 판단하기 전에 실제 행동을 확인해 보세요.",
        "작은 행동: 상대의 호감을 가능성으로 받아들이며 실제 행동을 확인해 보세요.",
        "작은 행동: 상대의 호감을 가능성으로 받아들이면서 실제 행동을 확인해 보세요.",
        "작은 행동: 상대의 호감을 가능성으로 생각해도 실제 행동을 확인해 보세요.",
        "작은 행동: 그 사람을 애인처럼 대하지 말고 실제 관계를 확인해 보세요.",
        "작은 행동: 이미 연인인 양 행동하지 말고 실제 관계를 확인해 보세요.",
        "작은 행동: 그 사람에게 애인 행세를 하지 말고 실제 관계를 확인해 보세요.",
        "작은 행동: 이미 커플처럼 굴지 말고 실제 관계를 확인해 보세요.",
        "작은 행동: 상대의 호감을 사실로 믿는 대신 실제 행동을 확인해 보세요.",
        "작은 행동: 이미 연인이라고 생각하는 대신 직접 질문해 보세요.",
        "작은 행동: 애인처럼 대하는 대신 실제 관계를 확인해 보세요.",
        "작은 행동: 상대의 호감이 확실하지 않다고 생각하고 실제 행동을 확인해 보세요.",
        "작은 행동: 상대의 호감은 확정할 수 없다고 생각하고 실제 행동을 확인해 보세요.",
        "작은 행동: 상대의 호감을 사실로 단정할 수 없다고 생각하세요.",
        "작은 행동: 상대의 호감을 확실시하지 말고 실제 행동을 확인해 보세요.",
        "작은 행동: 상대의 호감을 기정사실화하는 대신 직접 질문해 보세요.",
        "작은 행동: 그 사람과 연인 관계라고 못 박기보다 실제 관계를 확인해 보세요.",
        "작은 행동: 상대의 호감을 확정하지 말고 실제 행동을 확인해 보세요.",
        "작은 행동: 상대가 호감이 있다는 점을 인정하기보다 직접 질문해 보세요.",
        "작은 행동: 그 사람과 연인 관계라고 규정하는 대신 실제 관계를 확인해 보세요.",
        "작은 행동: 연인 관계가 사실인지 실제 말과 행동으로 확인해 보세요.",
        "작은 행동: 상대 마음일 가능성을 확신하지 말고 실제 행동을 확인해 보세요.",
        "작은 행동: 부담 없는 호감을 한 문장으로 표현해 보세요.",
        "작은 행동: 연인 관계를 서두르지 말고 자신의 기준을 정해 보세요.",
        "작은 행동: 상대의 호감을 기대하지 마세요.",
        "작은 행동: 상대의 호감을 추측하지 마세요.",
        "작은 행동: 연인 관계를 전제로 삼지 마세요.",
        "작은 행동: 상대의 반응을 호감으로 받아들이지 말고 실제 행동을 확인해 보세요.",
        "작은 행동: 상대의 말을 호감으로 여기기보다 직접 질문해 보세요.",
        "작은 행동: 상대의 반응을 호감으로 취급하지 말고 실제 행동을 확인해 보세요.",
        "작은 행동: 그 사람을 연인으로 보지 말고 실제 관계를 확인해 보세요.",
        "작은 행동: 내가 원하는 관계의 기준을 한 줄로 적어 보세요.",
        "작은 행동: 나는 어떤 관계를 원하는지 한 줄로 적어 보세요.",
        "작은 행동: 당신이 지킬 경계를 한 줄로 정해 보세요.",
        "작은 행동: 독자가 확인할 수 있는 신호를 하나 골라 보세요.",
        "작은 행동: 자신을 사랑하는 행동 하나를 실천해 보세요.",
        "작은 행동: 나를 사랑하는 작은 습관 하나를 실천해 보세요.",
        "작은 행동: 자신을 사랑하기 위한 습관 하나를 적어 보세요.",
        "작은 행동: 나를 사랑하기 위한 시간을 짧게 가져 보세요.",
        "작은 행동: 자신을 좋아하기 위한 행동 하나를 기록해 보세요.",
        "작은 행동: 스스로를 사랑하는 작은 행동을 해 보세요.",
      ]) {
        const nonFactualizingAction = createValidText(3).replace(
          "작은 행동: 부담이 적은 질문 하나를 골라 서로 확인할 수 있는 범위에서 짧게 대화해 보세요.",
          nonFactualizingActionLine,
        );
        expect(
          validateInstantReadingText(nonFactualizingAction, attractionRequest)
            ?.text,
        ).toBe(nonFactualizingAction);
      }
    }

    for (const noAttractionRequest of [
      { ...request, questionId: "how-they-see-me" },
      { ...request, questionId: "romantic-partner-impression" },
      {
        ...request,
        questionId: "mutual-view",
        topicId: "feelings",
      },
      {
        ...request,
        questionId: "desired-relationship",
        topicId: "love",
      },
    ] as const) {
      for (const claim of calibratedAttractionClaims) {
        const unaskedCalibrated = createValidText(3).replace(
          originalOverall,
          claim,
        );
        expect(
          validateInstantReadingText(unaskedCalibrated, noAttractionRequest),
        ).toBeUndefined();
      }
      for (const externalAttractionObject of [
        "카드상 여러 가능성이 열려 있습니다. 그 사람에게 독자는 호감 대상입니다. 실제 행동도 함께 확인해야 합니다.",
        "카드상 여러 가능성이 열려 있습니다. 상대에게 나는 연애 대상입니다. 실제 행동도 함께 확인해야 합니다.",
        "카드상 여러 가능성이 열려 있습니다. 그 사람에게 독자는 연인입니다. 실제 행동도 함께 확인해야 합니다.",
        "그 사람은 독자에게 마음이 간다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
        "그 사람은 독자에게 끌렸다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
        "그 사람은 독자에게 반했다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
        "그 사람에게 독자는 썸 상대로 보일 가능성이 있습니다. 실제 생각은 단정할 수 없습니다.",
      ]) {
        const factualObject = createValidText(3).replace(
          originalOverall,
          externalAttractionObject,
        );
        expect(
          validateInstantReadingText(factualObject, noAttractionRequest),
        ).toBeUndefined();
      }
      for (const selfAttractionActionLine of [
        "작은 행동: 자신을 사랑하는 행동 하나를 실천해 보세요.",
        "작은 행동: 나를 사랑하는 작은 습관 하나를 실천해 보세요.",
        "작은 행동: 자신을 사랑하기 위한 습관 하나를 적어 보세요.",
        "작은 행동: 나를 사랑하기 위한 시간을 짧게 가져 보세요.",
        "작은 행동: 자신을 좋아하기 위한 행동 하나를 기록해 보세요.",
        "작은 행동: 스스로를 사랑하는 작은 행동을 해 보세요.",
      ]) {
        const selfAttractionAction = createValidText(3).replace(
          "작은 행동: 부담이 적은 질문 하나를 골라 서로 확인할 수 있는 범위에서 짧게 대화해 보세요.",
          selfAttractionActionLine,
        );
        expect(
          validateInstantReadingText(selfAttractionAction, noAttractionRequest)
            ?.text,
        ).toBe(selfAttractionAction);
      }
    }
  });

  it("keeps attraction owned by explicit self questions without assigning it to another person", () => {
    const originalOverall =
      "새로운 가능성을 향한 움직임과 분명한 표현이 함께 필요하지만, 아직 확인하지 않은 부분은 현실의 대화로 살펴야 기대와 관찰을 구분할 수 있습니다.";
    const originalAction =
      "작은 행동: 부담이 적은 질문 하나를 골라 서로 확인할 수 있는 범위에서 짧게 대화해 보세요.";
    for (const [selfRequest, selfInterpretation, selfActionLine] of [
      [
        { ...request, topicId: "love", questionId: "drawn-to-ambiguity" },
        "애매한 관계에 끌리는 이유는 익숙함일 수 있습니다. 실제로 반복되는 장면과 그 비용을 함께 확인해야 합니다.",
        "작은 행동: 애매한 관계에 끌리는 순간을 한 줄로 기록해 보세요.",
      ],
      [
        { ...request, topicId: "feelings", questionId: "ignored-signals" },
        "사랑받고 싶은 마음이 신호를 크게 읽게 할 가능성이 있습니다. 실제 행동과 기대를 나누어 확인해야 합니다.",
        "작은 행동: 사랑받고 싶은 마음을 한 줄로 적어 보세요.",
      ],
    ] as const) {
      const selfReading = createValidText(3)
        .replace(originalOverall, selfInterpretation)
        .replace(originalAction, selfActionLine);
      expect(validateInstantReadingText(selfReading, selfRequest)?.text).toBe(
        selfReading,
      );

      for (const externalAttraction of [
        "그 사람은 애매한 관계에 끌릴 가능성이 있습니다. 실제 감정은 확인할 수 없습니다.",
        "나를 사랑한다고 그 사람은 말할 가능성이 있습니다. 실제 감정은 확인할 수 없습니다.",
        "나를 사랑하는 마음이 그 사람에게 있을 가능성이 있습니다. 실제 감정은 확인할 수 없습니다.",
        "사랑받고 싶은 마음은 그 사람에게 있을 가능성이 있습니다. 실제 감정은 확인할 수 없습니다.",
        "사랑받고 싶은 욕구가 상대에게 있을 가능성이 있습니다. 실제 감정은 확인할 수 없습니다.",
        "사랑받고 싶은 마음이 상대에게 조용한 밤마다 조금씩 더 크게 생겨날 가능성이 있습니다. 실제 행동은 따로 확인해야 합니다.",
        "애매한 관계에 끌리는 마음이 상대에게 조용한 순간마다 조금씩 더 크게 생겨날 가능성이 있습니다. 실제 행동은 따로 확인해야 합니다.",
        "사랑받고 싶은 마음은 상대방 쪽에서 커질 가능성이 있습니다. 실제 행동은 따로 확인해야 합니다.",
        "애매한 관계에 끌리는 마음은 상대방 쪽에서 커질 가능성이 있습니다. 실제 행동은 따로 확인해야 합니다.",
        "상대에게 생겨난 사랑받고 싶은 마음은 더 커질 가능성이 있습니다. 현실 행동은 따로 확인해야 합니다.",
        "상대방 쪽에서 커지는 사랑받고 싶은 마음일 가능성이 있습니다. 현실 행동은 따로 확인해야 합니다.",
      ]) {
        const externalReading = createValidText(3).replace(
          originalOverall,
          externalAttraction,
        );
        expect(
          validateInstantReadingText(externalReading, selfRequest),
        ).toBeUndefined();
      }
    }

    for (const [selfRequest, relationalSelfInterpretation] of [
      [
        { ...request, topicId: "feelings", questionId: "ignored-signals" },
        "사랑받고 싶은 마음이 상대와의 관계에서 커질 가능성이 있습니다. 이 마음은 현실에서 살펴야 합니다.",
      ],
      [
        { ...request, topicId: "feelings", questionId: "ignored-signals" },
        "사랑받고 싶은 마음을 살피면서 상대와의 경계를 확인할 가능성이 있습니다. 실제 행동도 확인해야 합니다.",
      ],
      [
        { ...request, topicId: "love", questionId: "drawn-to-ambiguity" },
        "애매한 관계에 끌리는 마음이 상대와의 관계에서 반복될 가능성이 있습니다. 이 마음은 현실에서 살펴야 합니다.",
      ],
      [
        { ...request, topicId: "love", questionId: "drawn-to-ambiguity" },
        "나는 애매한 관계에 끌리는 마음이 있습니다. 이 마음은 직접 살펴봐야 합니다.",
      ],
      [
        { ...request, topicId: "love", questionId: "drawn-to-ambiguity" },
        "나는 애매한 관계에 끌리는 마음이 있습니다. 이 마음은 직접 살펴보아야 합니다.",
      ],
    ] as const) {
      const relationalSelfReading = createValidText(3).replace(
        originalOverall,
        relationalSelfInterpretation,
      );
      expect(
        validateInstantReadingText(relationalSelfReading, selfRequest)?.text,
      ).toBe(relationalSelfReading);
    }

    const impressionRequest = {
      ...request,
      questionId: "how-they-see-me",
      topicId: "love",
    } as const;
    for (const unsafeExternalLoveAction of [
      "작은 행동: 타인이 나를 사랑하도록 유도해 보세요.",
      "작은 행동: 상대 측이 나를 사랑하도록 유도해 보세요.",
      "작은 행동: 그가 나를 사랑하도록 행동해 보세요.",
      "작은 행동: 타인에게 나를 사랑해 달라고 부탁해 보세요.",
    ]) {
      const unsafeAction = createValidText(3).replace(
        originalAction,
        unsafeExternalLoveAction,
      );
      expect(
        validateInstantReadingText(unsafeAction, impressionRequest),
      ).toBeUndefined();
    }
  });

  it("keeps explicit reader feelings while rejecting added subjectless attraction", () => {
    const selfRequest = {
      ...request,
      questionId: "ignored-signals",
      topicId: "feelings",
    } as const;
    const originalOverall =
      "새로운 가능성을 향한 움직임과 분명한 표현이 함께 필요하지만, 아직 확인하지 않은 부분은 현실의 대화로 살펴야 기대와 관찰을 구분할 수 있습니다.";
    const explicitReaderFeeling = createValidText(3).replace(
      originalOverall,
      "독자는 관계를 분명히 확인하고 싶은 마음이 있습니다. 현실에서 확인한 신호와 기대를 구분하는 태도도 함께 필요합니다.",
    );

    expect(
      validateInstantReadingText(explicitReaderFeeling, selfRequest)?.text,
    ).toBe(explicitReaderFeeling);

    for (const readerFeeling of [
      "내가 상대를 좋아하는 마음이 있습니다. 현실에서 확인한 신호와 기대를 구분하는 태도도 함께 필요합니다.",
      "독자의 감정은 호감입니다. 현실에서 확인한 신호와 기대를 구분하는 태도도 함께 필요합니다.",
      "독자에게는 상대를 좋아하는 마음이 있습니다. 현실에서 확인한 신호와 기대를 구분하는 태도도 함께 필요합니다.",
      "나에게는 그 사람을 좋아하는 마음이 있습니다. 현실에서 확인한 신호와 기대를 구분하는 태도도 함께 필요합니다.",
      "제 마음에는 상대를 좋아하는 감정이 있습니다. 현실에서 확인한 신호와 기대를 구분하는 태도도 함께 필요합니다.",
      "독자는 호감 상대가 보내는 신호를 더 확인하고 싶은 마음이 있습니다. 현실에서 확인한 신호와 기대를 구분하는 태도도 함께 필요합니다.",
      "독자는 연애 상대가 누구인지 궁금한 마음이 있습니다. 현실에서 확인한 신호와 기대를 구분하는 태도도 함께 필요합니다.",
      "독자는 연인 후보를 원하는 마음이 있습니다. 현실에서 확인한 신호와 기대를 구분하는 태도도 함께 필요합니다.",
      "독자는 자신이 연인 후보로 적합한지 고민하는 마음이 있습니다. 현실에서 확인한 신호와 기대를 구분하는 태도도 함께 필요합니다.",
      "나는 그 사람에게 연인 후보로 보이고 싶은 마음이 있습니다. 현실에서 확인한 신호와 기대를 구분하는 태도도 함께 필요합니다.",
      "그 사람에게 나는 연인 후보로 보이고 싶은 마음이 있습니다. 현실에서 확인한 신호와 기대를 구분하는 태도도 함께 필요합니다.",
      "나는 그 사람에게 끌린다고 말하고 싶은 마음이 있습니다. 현실에서 확인한 신호와 기대를 구분하는 태도도 함께 필요합니다.",
    ]) {
      const explicitReaderVariant = createValidText(3).replace(
        originalOverall,
        readerFeeling,
      );
      expect(
        validateInstantReadingText(explicitReaderVariant, selfRequest)?.text,
      ).toBe(explicitReaderVariant);
    }

    for (const addedFactualAttraction of [
      "연애적 관심은 분명히 있습니다. 현실에서 확인한 신호와 기대를 구분해야 합니다.",
      "상대는 독자에게 호감이 있습니다. 현실에서 확인한 신호와 기대를 구분해야 합니다.",
      "상대의 감정은 분명한 호감입니다. 현실에서 확인한 신호와 기대를 구분해야 합니다.",
      "독자는 마음을 정리하고 있지만 호감은 분명히 있습니다. 현실에서 확인한 신호와 기대를 구분해야 합니다.",
      "나는 고민하고 있으며 연애적 관심은 분명히 있습니다. 현실에서 확인한 신호와 기대를 구분해야 합니다.",
      "그 사람에게 독자는 연인입니다. 현실에서 확인한 신호와 기대를 구분해야 합니다.",
    ]) {
      const factualVariant = createValidText(3).replace(
        originalOverall,
        addedFactualAttraction,
      );
      expect(
        validateInstantReadingText(factualVariant, selfRequest),
      ).toBeUndefined();
    }

    const smallTestRequest = {
      ...request,
      questionId: "small-test",
      topicId: "relationship-flow",
    } as const;
    for (const laterExternalAttraction of [
      "독자는 고민하며 상대의 감정은 분명한 호감입니다. 현실 행동은 따로 확인해야 합니다.",
      "독자는 카드를 살피고 그 사람의 호감은 크게 커졌습니다. 현실 행동은 따로 확인해야 합니다.",
    ]) {
      const laterExternalReading = createValidText(3).replace(
        originalOverall,
        laterExternalAttraction,
      );
      expect(
        validateInstantReadingText(laterExternalReading, smallTestRequest),
      ).toBeUndefined();
    }
  });

  it("treats reality checks as grounding without factualizing attraction", () => {
    const originalUnknown =
      "아직 모르는 점: 현재 정보만으로는 서로 같은 기대와 관계의 속도를 원하는지 알 수 없습니다.";
    for (const groundedUnknown of [
      "아직 모르는 점: 실제 감정은 당사자와의 대화로 직접 확인해야 합니다.",
      "아직 모르는 점: 상대의 감정은 현실의 대화와 행동으로 확인해야 합니다.",
      "아직 모르는 점: 실제 마음은 직접 묻고 확인해야 합니다.",
    ]) {
      const groundedReading = createValidText(3).replace(
        originalUnknown,
        groundedUnknown,
      );
      expect(validateInstantReadingText(groundedReading, request)?.text).toBe(
        groundedReading,
      );
    }

    const factualUnknown = createValidText(3).replace(
      originalUnknown,
      "아직 모르는 점: 실제로 상대의 감정은 호감입니다.",
    );
    expect(validateInstantReadingText(factualUnknown, request)).toBeUndefined();

    const attractionRequest = {
      ...request,
      questionId: "interest-or-kindness",
      topicId: "feelings",
    } as const;
    for (const cardProofUnknown of [
      "아직 모르는 점: 상대의 호감은 타로 카드로 직접 확인해야 합니다.",
      "아직 모르는 점: 그 사람의 연애 감정은 이번 카드로 확인해 보세요.",
      "아직 모르는 점: 상대의 끌림은 카드 의미를 비교해 확인해야 합니다.",
    ]) {
      const cardProofReading = createValidText(3).replace(
        originalUnknown,
        cardProofUnknown,
      );
      expect(
        validateInstantReadingText(cardProofReading, attractionRequest),
      ).toBeUndefined();
    }
  });

  it("calibrates open external claims across Korean clause order and question forms", () => {
    const careerRequest = {
      ...request,
      questionId: "career-manager-view",
      topicId: "career-direction",
    } as const;
    const relationshipRequest = {
      ...request,
      questionId: "how-they-see-me",
      topicId: "love",
    } as const;
    const originalOverall =
      "새로운 가능성을 향한 움직임과 분명한 표현이 함께 필요하지만, 아직 확인하지 않은 부분은 현실의 대화로 살펴야 기대와 관찰을 구분할 수 있습니다.";
    const originalReflection =
      "지금 내가 기대와 실제 관찰을 구분하기 위해 가장 먼저 확인할 수 있는 것은 무엇인가요?";

    for (const unsafeCareerClaim of [
      "상사는 독자를 핵심 인재로 간주하고 다른 평가일 가능성도 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 취급하며 다른 평가일 가능성도 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 분류하는데 다른 평가일 가능성도 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 규정해도 다른 평가일 가능성도 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 매우 높이 치고 다른 평가일 가능성도 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 특별히 대접하며 다른 평가일 가능성도 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 중요한 축에 넣고 다른 평가일 가능성도 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 좋은 쪽에 놓는데 다른 평가일 가능성도 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 다른 가능성을 생각하며 독자를 핵심 인재로 간주합니다. 별도 해석일 가능성도 있습니다.",
      "상사는 여러 기준을 평가하고 독자를 핵심 인재로 취급합니다. 별도 해석일 가능성도 있습니다.",
      "상사는 다른 인상을 느끼면서 독자를 중요한 축에 놓습니다. 별도 해석일 가능성도 있습니다.",
      "독자를 상사는 핵심 인재로 간주합니다. 다른 평가일 가능성도 있습니다.",
      "독자에 대해 상사는 핵심 인재로 분류합니다. 다른 평가일 가능성도 있습니다.",
      "독자에게 상사는 큰 기대를 겁니다. 다른 평가일 가능성도 있습니다.",
      "상사는 독자를 핵심 인재로 보세요. 다른 평가일 가능성도 있습니다.",
      "팀장님은 독자를 성실한 직원으로 여기세요. 다른 평가일 가능성도 있습니다.",
      "직장 사람들은 독자를 핵심 인재로 간주합니다. 다른 평가일 가능성도 있습니다.",
      "조직 구성원은 독자를 핵심 인재로 간주합니다. 다른 평가일 가능성도 있습니다.",
      "상사는 독자를 핵심 인재로 간주하되 다른 평가일 가능성도 있습니다. 실제 평가는 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 간주하고도 다른 평가일 가능성도 있습니다. 실제 평가는 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 간주한 채 다른 평가일 가능성도 있습니다. 실제 평가는 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 간주한 대신 다른 평가일 가능성도 있습니다. 실제 평가는 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 간주하죠. 다른 평가일 가능성도 현실 피드백으로 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 간주합니다; 다음에는 무엇을 현실에서 확인할까요? 다른 가능성도 함께 살펴야 합니다.",
      "상사는 독자를 핵심 인재로 간주합니다, 다음에는 무엇을 현실에서 확인할까요? 다른 가능성도 함께 살펴야 합니다.",
      "직장 사람들은 독자에게 연애적 호감을 느낄 가능성이 있습니다. 실제 감정은 확인할 수 없습니다.",
      "조직 구성원은 독자에게 연애적 호감을 느낄 가능성이 있습니다. 실제 감정은 확인할 수 없습니다.",
      "상사는 연애적 호감을 느낄 가능성이 있습니다. 실제 감정은 확인할 수 없습니다.",
      "상사는 이성적인 관심을 보일 가능성이 있습니다. 실제 감정은 확인할 수 없습니다.",
      "상사가 누구인지는 현실 피드백으로 확인해야 합니다. 독자를 팀의 중심축으로 칭하죠. 다른 평가일 가능성도 있습니다.",
      "상사는 다른 의견도 검토합니다. 독자를 팀의 중심축으로 칭하죠. 다른 평가일 가능성도 있습니다.",
    ]) {
      const unsafeCareer = createValidText(3).replace(
        originalOverall,
        unsafeCareerClaim,
      );
      expect(
        validateInstantReadingText(unsafeCareer, careerRequest),
      ).toBeUndefined();
    }

    for (const safeCareerClaim of [
      "상사는 독자를 핵심 인재로 간주할 가능성이 있고 다른 평가일 가능성도 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 취급할 가능성이 있으며 다른 평가일 가능성도 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 분류할 가능성이 있는데 다른 평가일 가능성도 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 규정할 가능성이 있어도 다른 평가일 가능성도 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "독자를 상사는 핵심 인재로 간주할 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "직장 사람들은 독자를 핵심 인재로 간주할 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "조직 구성원은 독자를 핵심 인재로 간주할 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "다른 의견도 열려 있습니다. 독자를 팀의 중심축으로 칭할 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 다정하고 편한 사람으로 보고 있을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 재미있고 유능한 직원으로 볼 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 침착하고 유능한 직원으로 볼 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
    ]) {
      const safeCareer = createValidText(3).replace(
        originalOverall,
        safeCareerClaim,
      );
      expect(validateInstantReadingText(safeCareer, careerRequest)?.text).toBe(
        safeCareer,
      );
    }

    for (const unsafeRelationshipClaim of [
      "그분은 독자를 다정한 사람으로 보세요. 다른 인상일 가능성도 있습니다. 실제 인상은 직접 확인해야 합니다.",
      "독자를 그 사람은 특별 취급합니다. 다른 인상일 가능성도 있습니다. 실제 인상은 직접 확인해야 합니다.",
      "그 사람은 독자를 다정한 사람으로 간주합니다; 실제로는 어떤 인상인지 현실에서 확인할까요? 다른 가능성도 함께 살펴야 합니다.",
      "그 사람은 독자를 다정한 사람으로 간주합니다, 실제로는 어떤 인상인지 현실에서 확인할까요? 다른 가능성도 함께 살펴야 합니다.",
      "그 사람이 누구인지는 현실 대화로 확인해야 합니다. 독자를 특별한 존재로 칭하죠. 다른 인상일 가능성도 있습니다.",
      "카드는 다른 가능성을 시사하는 동시에 그 사람은 독자를 다정한 사람으로 간주합니다. 현실 근거는 따로 확인해야 합니다.",
    ]) {
      const unsafeRelationship = createValidText(3).replace(
        originalOverall,
        unsafeRelationshipClaim,
      );
      expect(
        validateInstantReadingText(unsafeRelationship, relationshipRequest),
      ).toBeUndefined();
    }

    const smallTestRequest = {
      ...request,
      questionId: "small-test",
      topicId: "relationship-flow",
    } as const;
    for (const factualExternalClaim of [
      "그 사람은 독자를 무책임한 사람으로 여깁니다. 작은 행동의 결과를 현실에서 확인해야 합니다.",
      "상대는 독자를 다정한 사람으로 확신합니다. 반복 행동은 현실에서 확인해야 합니다.",
      "상대는 독자를 발전 가능성이 큰 파트너로 간주합니다. 실제 인상은 직접 확인해야 합니다.",
      "타인은 독자를 매사에 믿을 만한 사람으로 간주합니다. 실제 인상은 직접 확인해야 합니다.",
      "그는 독자를 특별한 사람으로 여깁니다. 실제 인상은 직접 확인해야 합니다.",
      "그녀는 독자를 특별한 사람으로 여깁니다. 실제 인상은 직접 확인해야 합니다.",
      "그쪽은 독자를 특별한 사람으로 여깁니다. 실제 인상은 직접 확인해야 합니다.",
      "상대 측은 독자를 특별한 사람으로 여깁니다. 실제 인상은 직접 확인해야 합니다.",
      "다른 사람들은 독자를 특별한 사람으로 여깁니다. 실제 인상은 직접 확인해야 합니다.",
      "이성들은 독자를 매력적인 사람으로 여깁니다. 실제 인상은 직접 확인해야 합니다.",
      "그 사람의 눈에 독자는 특별한 사람입니다. 실제 인상은 직접 확인해야 합니다.",
      "그녀의 눈에 독자는 특별한 사람입니다. 실제 인상은 직접 확인해야 합니다.",
      "이성들의 눈에 독자는 매력적인 사람입니다. 실제 인상은 직접 확인해야 합니다.",
      "그 사람의 관점에서 독자는 믿음직한 사람입니다. 실제 인상은 직접 확인해야 합니다.",
      "그 사람의 평가는 독자가 특별한 사람이라는 것입니다. 실제 인상은 직접 확인해야 합니다.",
      "나는 그 사람에게 잘 보이고 싶은 마음이 있습니다. 상대는 독자를 특별한 사람으로 여깁니다. 실제 인상은 직접 확인해야 합니다.",
      "나는 그 사람에게 잘 보이고 싶은 마음이 있지만 현실의 여러 조건과 기대를 충분히 나누어 본 뒤 상대는 독자를 특별한 사람으로 여깁니다. 실제 인상은 직접 확인해야 합니다.",
      "나는 그 사람에게 잘 보이고 싶은 마음이 있고 카드의 두 의미를 차분히 구분한 다음 상대는 독자를 특별한 사람으로 여깁니다. 실제 인상은 직접 확인해야 합니다.",
      "독자의 이성적 이미지는 매력적입니다. 실제 인상은 직접 확인해야 합니다.",
      "독자는 이성들에게 매력적인 사람입니다. 실제 인상은 직접 확인해야 합니다.",
      "독자는 다른 사람들에게 따뜻한 사람입니다. 실제 인상은 직접 확인해야 합니다.",
      "독자는 그분께 매력적인 사람입니다. 실제 인상은 직접 확인해야 합니다.",
      "독자는 사람들에게 따뜻한 사람입니다. 실제 인상은 직접 확인해야 합니다.",
      "독자는 연인 후보일 가능성이 있습니다. 실제 관계는 직접 확인해야 합니다.",
      "독자는 누군가의 이상형일 가능성이 있습니다. 실제 관계는 직접 확인해야 합니다.",
      "독자는 이성에게 매력적인 사람일 가능성이 있습니다. 실제 인상은 직접 확인해야 합니다.",
      "이성들 사이에서 독자는 매력적인 사람입니다. 실제 인상은 직접 받은 말과 행동으로 확인해야 합니다.",
      "이성들이 볼 때 독자는 매력적인 사람입니다. 실제 인상은 직접 확인해야 합니다.",
      "다른 사람들이 생각할 때 독자는 따뜻한 사람입니다. 실제 인상은 직접 확인해야 합니다.",
      "이성들이 보기엔 독자는 매력적인 사람입니다. 실제 인상은 직접 확인해야 합니다.",
      "다른 사람들 눈엔 독자는 따뜻한 사람입니다. 실제 인상은 직접 확인해야 합니다.",
      "이성들 기준으론 독자는 매력적인 사람입니다. 실제 인상은 직접 확인해야 합니다.",
      "남들 눈에 독자는 특별한 사람입니다. 실제 인상은 직접 확인해야 합니다.",
      "다른 이들 눈에 독자는 차분한 사람입니다. 실제 인상은 직접 확인해야 합니다.",
      "그 사람 관점에서 특별한 사람이고 내 기대를 구분할 필요가 있습니다. 실제 인상은 직접 확인해야 합니다.",
      "그 사람의 관점에서 독자는 특별한 사람인데도 다른 모습일 가능성이 있습니다. 실제 인상은 직접 확인해야 합니다.",
      "그 사람의 관점에서 독자는 특별한 사람이고도 다른 모습일 가능성이 있습니다. 실제 인상은 직접 확인해야 합니다.",
      "그 사람의 관점에서 독자는 특별한 사람이거나 차분할 가능성이 있습니다. 실제 인상은 직접 확인해야 합니다.",
      "그 사람의 관점에서 독자는 특별한 사람인 채 다른 인상일 가능성이 있습니다. 실제 인상은 직접 확인해야 합니다.",
      "그 사람의 관점에서 독자는 특별한 사람이되 다른 모습일 가능성이 있습니다. 실제 인상은 직접 확인해야 합니다.",
    ]) {
      const factualExternalReading = createValidText(3).replace(
        originalOverall,
        factualExternalClaim,
      );
      expect(
        validateInstantReadingText(factualExternalReading, smallTestRequest),
      ).toBeUndefined();
    }

    for (const readerReflection of [
      "다른 사람의 관점에서 내 기대와 실제 행동을 구분할 필요가 있습니다. 실제 인상은 직접 확인해야 합니다.",
      "그 사람의 입장에서 관계의 속도를 다시 생각할 필요가 있습니다. 실제 인상은 직접 확인해야 합니다.",
      "그 사람 관점에서 내 기대와 실제 신호를 정리할 필요가 있습니다. 실제 인상은 직접 확인해야 합니다.",
    ]) {
      const safeReflectionReading = createValidText(3).replace(
        originalOverall,
        readerReflection,
      );
      expect(
        validateInstantReadingText(safeReflectionReading, smallTestRequest)
          ?.text,
      ).toBe(safeReflectionReading);
    }

    for (const [questionId, topicId] of [
      ["how-they-see-me", "love"],
      ["mutual-view", "feelings"],
    ] as const) {
      const unaskedIdealType = createValidText(3).replace(
        originalOverall,
        "독자는 누군가의 이상형일 가능성이 있습니다. 실제 관계는 직접 확인해야 합니다.",
      );
      expect(
        validateInstantReadingText(unaskedIdealType, {
          ...request,
          questionId,
          topicId,
        }),
      ).toBeUndefined();
    }

    for (const safeRelationshipClaim of [
      "그 사람은 독자를 재미있고 다정한 사람으로 볼 가능성이 있습니다. 실제 인상은 직접 확인해야 합니다.",
      "그 사람은 독자를 호기심 많고 다정한 사람으로 볼 가능성이 있습니다. 실제 인상은 직접 확인해야 합니다.",
      "다른 인상도 열려 있습니다. 독자를 특별한 존재로 칭할 가능성이 있습니다. 실제 인상은 직접 확인해야 합니다.",
      "차분한 태도가 그 사람의 눈길을 끌 수 있지만, 실제 인상은 직접 확인해야 합니다.",
      "독자의 말투가 그 사람의 눈길을 끌 가능성이 있습니다. 현실 반응은 직접 확인해야 합니다.",
      "카드상 그 사람은 독자를 다정한 사람으로 여기는 듯합니다. 다른 가능성도 열어 두고 실제 반응을 확인해야 합니다.",
      "그 사람에게 독자는 편안한 인상인 모양입니다. 다른 가능성도 현실에서 확인해야 합니다.",
      "독자는 그분께 매력적인 사람으로 보일 가능성이 있습니다. 실제 인상은 직접 확인해야 합니다.",
      "독자는 사람들에게 따뜻한 사람으로 보일 가능성이 있습니다. 실제 인상은 직접 확인해야 합니다.",
      "이성들 사이에서 독자는 매력적인 사람으로 보일 가능성이 있습니다. 실제 인상은 직접 확인해야 합니다.",
      "이성들이 볼 때 독자는 매력적인 사람으로 보일 가능성이 있습니다. 실제 인상은 직접 확인해야 합니다.",
      "다른 사람들이 생각할 때 독자는 따뜻한 사람으로 보일 가능성이 있습니다. 실제 인상은 직접 확인해야 합니다.",
      "이성들이 보기엔 독자는 매력적인 사람으로 보일 가능성이 있습니다. 실제 인상은 직접 확인해야 합니다.",
      "다른 사람들 눈엔 독자는 따뜻한 사람으로 보일 가능성이 있습니다. 실제 인상은 직접 확인해야 합니다.",
      "이성들 기준으론 독자는 매력적인 사람으로 보일 가능성이 있습니다. 실제 인상은 직접 확인해야 합니다.",
      "남들 눈에 독자는 특별한 사람으로 보일 가능성이 있습니다. 실제 인상은 직접 확인해야 합니다.",
      "다른 이들 눈에 독자는 차분한 사람으로 보일 가능성이 있습니다. 실제 인상은 직접 확인해야 합니다.",
    ]) {
      const safeRelationship = createValidText(3).replace(
        originalOverall,
        safeRelationshipClaim,
      );
      expect(
        validateInstantReadingText(safeRelationship, relationshipRequest)?.text,
      ).toBe(safeRelationship);
    }

    for (const cardAdvisory of [
      "1. 이 카드 의미는 독자에게 실제 반응과 기대를 구분하라고 권합니다.",
      "1. 첫 의미는 독자에게 경계를 돌아보라는 질문을 던집니다.",
      "1. 이 상징은 독자를 자기 기준으로 다시 데려옵니다.",
      "1. 카드의 열린 태도는 독자에게 서두르지 않는 선택을 제안합니다.",
      "1. 이 카드는 독자에게 실제 반응과 기대를 구분할 필요를 일깨웁니다.",
      "1. 첫 의미는 독자에게 두 해석 사이의 차이를 분명하게 보여 줍니다.",
      "1. 이 상징은 독자에게 지금 필요한 경계의 의미를 비춥니다.",
      "1. 카드의 흐름은 독자에게 확인되지 않은 기대를 경고합니다.",
      "1. 이 카드는 독자에게 자신의 관계 기준을 결정하라고 권합니다.",
      "1. 이 의미는 독자에게 상대의 인상을 사실로 단정하지 말라고 경고합니다.",
      "1. 이 상징은 독자에게 정답을 확정하기보다 현실 반응을 확인하라고 제안합니다.",
    ]) {
      const advisoryReading = createValidText(3).replace(
        "1. 새 가능성을 열어 두되 아직 확인하지 않은 기대를 사실처럼 단정하지 않는 태도를 살펴봅니다.",
        cardAdvisory,
      );
      expect(
        validateInstantReadingText(advisoryReading, relationshipRequest)?.text,
      ).toBe(advisoryReading);
    }

    for (const [unsafeCardClaim, unsafeCardRequest] of [
      [
        "1. 이 카드는 독자를 다정한 사람으로 확정하고 상대의 시선이 맞다고 증명합니다.",
        relationshipRequest,
      ],
      [
        "1. 이 상징은 독자를 특별한 존재로 단정하고 그 사람의 인상을 보장합니다.",
        relationshipRequest,
      ],
      [
        "1. 이 의미는 독자를 핵심 인재로 규정하고 상사의 평가가 옳다고 증명합니다.",
        careerRequest,
      ],
      [
        "1. 이 카드는 독자를 다정한 사람으로 결정하고 그 사람의 시선을 옳은 것으로 판정합니다.",
        relationshipRequest,
      ],
      [
        "1. 이 상징은 독자를 특별한 존재라고 못 박고 그 사람의 판단을 정답으로 만듭니다.",
        relationshipRequest,
      ],
    ] as const) {
      const unsafeCardReading = createValidText(3).replace(
        "1. 새 가능성을 열어 두되 아직 확인하지 않은 기대를 사실처럼 단정하지 않는 태도를 살펴봅니다.",
        unsafeCardClaim,
      );
      expect(
        validateInstantReadingText(unsafeCardReading, unsafeCardRequest),
      ).toBeUndefined();
    }

    for (const [verificationAction, verificationRequest] of [
      [
        "작은 행동: 상사가 독자를 어떻게 평가하는지 직접 물어보세요.",
        careerRequest,
      ],
      [
        "작은 행동: 동료들이 독자를 어떻게 보는지 한 명에게 물어보세요.",
        {
          ...request,
          questionId: "career-workplace-image",
          topicId: "career-direction",
        } as const,
      ],
      [
        "작은 행동: 그 사람이 독자를 어떻게 보는지 부담 없이 직접 물어보세요.",
        relationshipRequest,
      ],
    ] as const) {
      const verificationReading = createValidText(3).replace(
        "작은 행동: 부담이 적은 질문 하나를 골라 서로 확인할 수 있는 범위에서 짧게 대화해 보세요.",
        verificationAction,
      );
      expect(
        validateInstantReadingText(verificationReading, verificationRequest)
          ?.text,
      ).toBe(verificationReading);
    }

    for (const [safeQuestion, safeRequest] of [
      ["그 사람은 독자를 다정하다고 생각할까요?", relationshipRequest],
      ["그 사람은 독자를 편한 사람이라고 볼까요?", relationshipRequest],
      ["그 사람은 독자를 다정하다고 생각하나요?", relationshipRequest],
      ["그분은 독자를 편한 사람이라고 보시나요?", relationshipRequest],
      ["상사는 독자를 핵심 인재라고 생각할까요?", careerRequest],
      ["상사는 독자를 신뢰할 직원이라고 볼까요?", careerRequest],
      ["상사는 독자를 핵심 인재라고 생각하나요?", careerRequest],
      ["상사는 독자를 신뢰할 직원이라고 보시나요?", careerRequest],
      ["상사는 독자를 핵심 인재라고 생각하는 건가요?", careerRequest],
      ["상사는 독자를 핵심 인재라고 생각하는지요?", careerRequest],
      ["상사는 독자를 핵심 인재라고 생각하시는가요?", careerRequest],
      ["상사는 독자를 핵심 인재라고 생각하죠?", careerRequest],
      ["상사는 독자를 핵심 인재로 간주할까요?", careerRequest],
      [
        "상사는 독자를 핵심 인재로 간주할 가능성이 있는데 어떤 피드백을 확인할까요?",
        careerRequest,
      ],
    ] as const) {
      const safeReflection = createValidText(3).replace(
        originalReflection,
        safeQuestion,
      );
      expect(
        validateInstantReadingText(safeReflection, safeRequest)?.text,
      ).toBe(safeReflection);
    }

    for (const unsafeQuestion of [
      "상사는 독자를 핵심 인재로 간주했는데 어떤 피드백을 확인할까요?",
      "상사는 독자를 핵심 인재로 취급했으니 어떤 피드백을 확인할까요?",
      "상사는 독자를 핵심 인재로 분류했는데 무엇을 확인할까요?",
      "상사는 독자를 핵심 인재로 규정하니 어떤 근거를 확인할까요?",
      "상사는 독자를 핵심 인재로 간주합니다: 다음에 무엇을 확인할까요?",
      "상사는 독자를 핵심 인재로 간주합니다 — 다음에 무엇을 확인할까요?",
    ]) {
      const unsafeReflection = createValidText(3).replace(
        originalReflection,
        unsafeQuestion,
      );
      expect(
        validateInstantReadingText(unsafeReflection, careerRequest),
      ).toBeUndefined();
    }

    for (const unsafeQuestion of [
      "상대는 독자를 특별한 사람으로 간주합니다: 다음에 무엇을 확인할까요?",
      "상대는 독자를 특별한 사람으로 간주합니다 — 다음에 무엇을 확인할까요?",
    ]) {
      const unsafeReflection = createValidText(3).replace(
        originalReflection,
        unsafeQuestion,
      );
      expect(
        validateInstantReadingText(unsafeReflection, smallTestRequest),
      ).toBeUndefined();
    }
  });

  it("accepts calibrated workplace perception and rejects factual judgment in every section", () => {
    const managerRequest = {
      ...request,
      questionId: "career-manager-view",
      topicId: "career-direction",
    } as const;
    const originalOverall =
      "새로운 가능성을 향한 움직임과 분명한 표현이 함께 필요하지만, 아직 확인하지 않은 부분은 현실의 대화로 살펴야 기대와 관찰을 구분할 수 있습니다.";
    const originalUnknown =
      "아직 모르는 점: 현재 정보만으로는 서로 같은 기대와 관계의 속도를 원하는지 알 수 없습니다.";

    const calibrated = createValidText(3).replace(
      originalOverall,
      "카드상 관리자가 업무 준비도를 신뢰할 가능성에 무게가 실립니다. 실제 평가는 피드백으로 확인해야 합니다.",
    );
    expect(validateInstantReadingText(calibrated, managerRequest)?.text).toBe(
      calibrated,
    );

    const broadCareerRequest = {
      ...request,
      topicId: "career-direction",
    } as const;
    for (const [questionId, factualExternalClaim] of [
      [
        "career-manager-mismatch",
        "상사는 독자를 무능한 직원으로 여깁니다. 업무 관계의 어긋남을 현실 피드백으로 확인해야 합니다.",
      ],
      [
        "career-manager-mismatch",
        "관리자는 독자의 성과를 형편없다고 평가합니다. 업무 관계의 어긋남을 현실 피드백으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "상사는 독자를 핵심 인재로 확신합니다. 이동 결정은 현실 조건으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "상사는 독자를 성장 가능성이 큰 핵심 인재로 간주합니다. 실제 평가는 피드백으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "직속 책임자는 독자를 승진감으로 간주합니다. 실제 평가는 피드백으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "상사의 눈에 독자는 핵심 인재입니다. 실제 평가는 피드백으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "상사님의 눈에 독자는 핵심 인재입니다. 실제 평가는 피드백으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "상사의 관점에서 독자는 믿음직한 인재입니다. 실제 평가는 피드백으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "관리자분의 관점에서 독자는 믿음직한 인재입니다. 실제 평가는 피드백으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "상사의 평가는 독자가 핵심 인재라는 것입니다. 실제 평가는 피드백으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "독자의 업무 평판은 좋습니다. 이동 결정은 현실 조건으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "직장에서 독자의 이미지는 유능합니다. 이동 결정은 현실 조건으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "독자는 동료들에게 믿음직한 사람입니다. 이동 결정은 현실 조건으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "독자는 직장에서 핵심 인재입니다. 이동 결정은 현실 조건으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "독자는 상사께 믿음직한 직원입니다. 이동 결정은 현실 조건으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "독자는 직장 내에서 핵심 인재입니다. 이동 결정은 현실 조건으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "독자는 조직 안에서 믿음직한 사람입니다. 이동 결정은 현실 조건으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "팀원들 사이에서 독자는 믿음직한 사람입니다. 이동 결정은 현실 조건으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "동료들이 볼 때 독자는 믿음직한 사람입니다. 실제 평가는 피드백으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "상사가 판단할 때 독자는 핵심 인재입니다. 실제 평가는 피드백으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "상사가 보기엔 독자는 핵심 인재입니다. 실제 평가는 피드백으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "동료들 눈엔 독자는 믿음직한 사람입니다. 실제 평가는 피드백으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "동료 기준으론 독자는 믿음직한 사람입니다. 실제 평가는 피드백으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "직장 내 사람들이 독자를 유능하다고 평가합니다. 이동 결정은 현실 조건으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "윗사람이 독자를 핵심 인재라고 평가합니다. 이동 결정은 현실 조건으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "선배들이 독자를 유능한 직원이라고 생각합니다. 이동 결정은 현실 조건으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "상사의 관점에서 핵심 인재이고 업무 조건을 비교할 필요가 있습니다. 이동 결정은 현실 조건으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "상사의 관점에서 독자는 핵심 인재인데도 다른 평가일 가능성이 있습니다. 이동 결정은 현실 조건으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "상사의 관점에서 독자는 핵심 인재이거나 평가는 다를 가능성이 있습니다. 이동 결정은 현실 조건으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "회사 측은 독자를 핵심 인재라고 생각합니다. 이동 결정은 현실 조건으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "경영진은 독자를 유능한 직원이라고 평가합니다. 이동 결정은 현실 조건으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "인사 담당자는 독자를 좋은 후보라고 생각합니다. 이동 결정은 현실 조건으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "채용 담당자는 독자를 적합한 인재라고 판단합니다. 이동 결정은 현실 조건으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "사내에서 독자는 핵심 인재입니다. 이동 결정은 현실 조건으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "부서에서 독자는 유능한 직원입니다. 이동 결정은 현실 조건으로 확인해야 합니다.",
      ],
      [
        "career-stay-or-prepare",
        "업계에서 독자는 좋은 후보입니다. 이동 결정은 현실 조건으로 확인해야 합니다.",
      ],
    ] as const) {
      const careerRequest = {
        ...request,
        questionId,
        topicId: "career-direction",
      } as const;
      const factualExternalReading = createValidText(3).replace(
        originalOverall,
        factualExternalClaim,
      );
      expect(
        validateInstantReadingText(factualExternalReading, careerRequest),
      ).toBeUndefined();
    }
    for (const unaskedCareerAttraction of [
      "카드상 상사가 독자에게 연애적 호감을 느낄 가능성이 있습니다. 실제 감정은 확인할 수 없습니다.",
      "상사가 독자를 이성으로 볼 가능성이 있습니다. 실제 인상은 직접 확인해야 합니다.",
      "연애적 호감을 상사가 독자에게 느낄 가능성이 있습니다. 실제 감정은 확인할 수 없습니다.",
      "상사는 연애적 호감으로 독자를 볼 가능성이 있습니다. 실제 감정은 확인할 수 없습니다.",
      "독자에게 상사가 연애적 호감을 느낄 가능성이 있습니다. 실제 감정은 확인할 수 없습니다.",
      "상사는 독자에게 연애적 관심을 느낄 가능성이 있습니다. 실제 감정은 확인할 수 없습니다.",
      "상사는 독자에게 연애적 감정을 느낄 가능성이 있습니다. 실제 감정은 확인할 수 없습니다.",
      "상사는 독자에게 연애적 끌림을 느낄 가능성이 있습니다. 실제 감정은 확인할 수 없습니다.",
      "상사는 독자에게 이성적 호감을 느낄 가능성이 있습니다. 실제 감정은 확인할 수 없습니다.",
      "상사는 독자에게 이성적인 호감을 느낄 가능성이 있습니다. 실제 감정은 확인할 수 없습니다.",
      "상사는 독자의 연애적 매력을 느낄 가능성이 있습니다. 실제 감정은 확인할 수 없습니다.",
      "상사는 독자에게 애정을 느낄 가능성이 있습니다. 실제 반응은 확인해야 합니다.",
      "팀장은 독자를 향한 연정을 품을 가능성이 있습니다. 실제 반응은 확인해야 합니다.",
      "상사는 업무를 사랑하는 태도와 별개로 독자를 이성적 대상으로 볼 가능성이 있습니다. 실제 감정은 확인할 수 없습니다.",
      "상사는 사랑하는 일을 존중하면서 독자에게 애정을 느낄 가능성이 있습니다. 실제 감정은 확인할 수 없습니다.",
      "상사는 좋아하는 업무가 있어도 독자에게 연애적 호감을 느낄 가능성이 있습니다. 실제 감정은 확인할 수 없습니다.",
      "상사는 독자의 브랜드와 별개로 독자에게 호감을 느낄 가능성이 있습니다. 실제 감정은 확인할 수 없습니다.",
    ]) {
      for (const careerRequest of [managerRequest, broadCareerRequest]) {
        const attractionInterpretation = createValidText(3).replace(
          originalOverall,
          unaskedCareerAttraction,
        );
        expect(
          validateInstantReadingText(attractionInterpretation, careerRequest),
        ).toBeUndefined();

        const attractionSupporting = createValidText(3).replace(
          "1. 새 가능성을 열어 두되 아직 확인하지 않은 기대를 사실처럼 단정하지 않는 태도를 살펴봅니다.",
          `1. ${unaskedCareerAttraction}`,
        );
        expect(
          validateInstantReadingText(attractionSupporting, careerRequest),
        ).toBeUndefined();
      }
    }

    for (const nonRomanticSelfCareerLanguage of [
      "독자는 이성적으로 판단하고 피드백을 확인할 가능성이 있습니다. 실제 방향은 직접 확인해야 합니다.",
      "독자는 사랑하는 일을 찾고 피드백을 확인할 가능성이 있습니다. 실제 방향은 직접 확인해야 합니다.",
      "상사의 관점에서 업무의 조건과 책임 범위를 비교할 필요가 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "동료의 입장에서 협업 조건을 다시 살펴보는 태도가 필요합니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사의 관점에서 업무 조건을 고려할 필요가 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
    ]) {
      const nonRomanticInterpretation = createValidText(3).replace(
        originalOverall,
        nonRomanticSelfCareerLanguage,
      );
      expect(
        validateInstantReadingText(
          nonRomanticInterpretation,
          broadCareerRequest,
        )?.text,
      ).toBe(nonRomanticInterpretation);
    }

    for (const nonRomanticManagerLanguage of [
      "상사는 독자의 이성적인 판단을 강점으로 볼 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자가 일을 사랑하는 태도를 강점으로 볼 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자가 업무에 애정을 쏟을 가능성을 볼 수 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자가 애정을 담아 일할 가능성을 볼 수 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자가 애정 어린 태도로 업무를 대할 가능성을 볼 수 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자가 좋아하는 분야의 업무를 맡을 가능성을 볼 수 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자가 애정을 오래 쏟아 온 직무에서 성장할 가능성을 볼 수 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자의 디자인이 고객에게 호감을 줄 가능성이 있다고 볼 수 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자의 발표가 청중에게 호감을 줄 가능성이 있다고 볼 수 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자가 고객에게 사랑받는 브랜드를 만들 가능성이 있다고 볼 수 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자가 이 역할에 끌릴 가능성을 볼 수 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
    ]) {
      const nonRomanticInterpretation = createValidText(3).replace(
        originalOverall,
        nonRomanticManagerLanguage,
      );
      expect(
        validateInstantReadingText(nonRomanticInterpretation, managerRequest)
          ?.text,
      ).toBe(nonRomanticInterpretation);
    }

    for (const factualClaim of [
      "관리자는 나를 무능하다고 봅니다. 업무 평가도 이미 낮게 정해졌습니다.",
      "상사는 내 성과를 인정합니다. 앞으로 더 큰 역할을 기대합니다.",
    ]) {
      const factual = createValidText(3).replace(originalOverall, factualClaim);
      expect(
        validateInstantReadingText(factual, managerRequest),
      ).toBeUndefined();
    }

    const factualSupportingSection = createValidText(3).replace(
      "1. 새 가능성을 열어 두되 아직 확인하지 않은 기대를 사실처럼 단정하지 않는 태도를 살펴봅니다.",
      "1. 상사는 독자를 유능한 직원으로 봅니다.",
    );
    expect(
      validateInstantReadingText(factualSupportingSection, managerRequest),
    ).toBeUndefined();

    const factualPerspectiveSupportingSection = createValidText(3).replace(
      "1. 새 가능성을 열어 두되 아직 확인하지 않은 기대를 사실처럼 단정하지 않는 태도를 살펴봅니다.",
      "1. 상사가 보는 독자는 성실합니다.",
    );
    expect(
      validateInstantReadingText(
        factualPerspectiveSupportingSection,
        managerRequest,
      ),
    ).toBeUndefined();

    const openEndedPerspectiveSupportingSection = createValidText(3).replace(
      "1. 새 가능성을 열어 두되 아직 확인하지 않은 기대를 사실처럼 단정하지 않는 태도를 살펴봅니다.",
      "1. 상사가 보는 독자는 관련 경험이 아주 많습니다.",
    );
    expect(
      validateInstantReadingText(
        openEndedPerspectiveSupportingSection,
        managerRequest,
      ),
    ).toBeUndefined();

    const subjectlessFactualSupportingSection = createValidText(3).replace(
      "1. 새 가능성을 열어 두되 아직 확인하지 않은 기대를 사실처럼 단정하지 않는 태도를 살펴봅니다.",
      "1. 업무 평가는 이미 낮게 정해졌습니다.",
    );
    expect(
      validateInstantReadingText(
        subjectlessFactualSupportingSection,
        managerRequest,
      ),
    ).toBeUndefined();

    const explicitUncertainty = createValidText(3).replace(
      originalUnknown,
      "아직 모르는 점: 상사가 업무 준비도를 신뢰하는지는 실제 피드백 없이는 확인하기 어렵습니다.",
    );
    expect(
      validateInstantReadingText(explicitUncertainty, managerRequest)?.text,
    ).toBe(explicitUncertainty);

    const calibratedLowEvaluation = createValidText(3).replace(
      originalOverall,
      "카드상 업무 평가가 낮을 가능성이 높습니다. 실제 평가는 피드백으로 확인해야 합니다.",
    );
    expect(
      validateInstantReadingText(calibratedLowEvaluation, managerRequest)?.text,
    ).toBe(calibratedLowEvaluation);

    const calibratedRecognition = createValidText(3).replace(
      "1. 새 가능성을 열어 두되 아직 확인하지 않은 기대를 사실처럼 단정하지 않는 태도를 살펴봅니다.",
      "1. 성과가 인정받고 있을 가능성이 있습니다.",
    );
    expect(
      validateInstantReadingText(calibratedRecognition, managerRequest)?.text,
    ).toBe(calibratedRecognition);

    const factualRecognition = createValidText(3).replace(
      "1. 새 가능성을 열어 두되 아직 확인하지 않은 기대를 사실처럼 단정하지 않는 태도를 살펴봅니다.",
      "1. 성과는 충분히 인정받고 있습니다.",
    );
    expect(
      validateInstantReadingText(factualRecognition, managerRequest),
    ).toBeUndefined();

    for (const calibratedClaim of [
      "업무 평판이 좋게 읽힐 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사가 독자를 핵심 인재로 여길 수 있습니다. 실제 기대는 맡겨진 역할로 확인해야 합니다.",
      "카드 흐름상 상사는 독자를 핵심 인재로 평가하는 듯해요. 다른 가능성도 열어 두고 실제 피드백을 확인해야 합니다.",
      "독자는 유능하게 보일 가능성이 있습니다. 실제 평가는 업무 기록으로 확인해야 합니다.",
      "동료에게 독자는 협업하기 편한 사람으로 보일 가능성이 있습니다. 실제 인상은 직접 받은 말로 확인해야 합니다.",
      "독자는 상사께 믿음직한 직원으로 보일 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "독자는 직장 내에서 핵심 인재로 보일 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "독자는 조직 안에서 믿음직한 사람으로 보일 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "팀원들 사이에서 독자는 믿음직한 사람으로 보일 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "동료들이 볼 때 독자는 믿음직한 사람으로 보일 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사가 판단할 때 독자는 핵심 인재로 보일 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사가 보기엔 독자는 핵심 인재로 보일 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "동료들 눈엔 독자는 믿음직한 사람으로 보일 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "동료 기준으론 독자는 믿음직한 사람으로 보일 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "직장 내 사람들이 독자를 유능하다고 평가할 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "윗사람이 독자를 핵심 인재라고 평가할 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "선배들이 독자를 유능한 직원이라고 생각할 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "회사 측은 독자를 핵심 인재라고 생각할 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "경영진은 독자를 유능한 직원이라고 평가할 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "인사 담당자는 독자를 좋은 후보라고 생각할 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "채용 담당자는 독자를 적합한 인재라고 판단할 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "사내에서 독자는 핵심 인재로 보일 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "부서에서 독자는 유능한 직원으로 보일 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "업계에서 독자는 좋은 후보로 보일 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사 눈에 독자는 핵심 인재가 아닐 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 유능하다고 판단할 수 있습니다. 실제 판단은 피드백으로 확인해야 합니다.",
      "상사 눈에 독자는 성실할 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사 눈에 독자는 꼼꼼하게 보일 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사 눈에 독자는 유능하지 않을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사 눈에 독자는 믿음직하지 않게 보일 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사가 독자의 준비도를 높게 볼 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사 입장에서는 유능할 가능성이 크고 책임감도 강할 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사 입장에서는 유능할 가능성이 있어도 책임감도 강할 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 여긴다고 할 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 여기지 않는다고 할 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 핵심 인재라고 볼 가능성이 있고 준비가 부족하다고 볼 가능성도 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자에게 큰 기대를 걸었다고 말했을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자에게 성실한 직원이라고 말했을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자에게 책임감이 강하다고 말했을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 평가했을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "동료들은 독자를 편한 동료로 여겼을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "동료들은 독자를 편하고 믿음직한 동료로 여기고 있을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자에 관해 핵심 인재라고 평가했을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자의 업무가 빠르고 정확하다고 말했을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 나한테 성실하다고 말했을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사께서는 독자에게 성실하다고 말했을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "동료들은 독자에게 협업하기 편하다고 말했을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "회사에서는 독자를 핵심 인재라고 평가했을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "조직에서는 독자를 좋은 직원이라고 말했을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "팀에서는 독자를 협업하기 편하다고 평가했을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "팀장님은 독자에게 성실하다고 말했을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사분은 독자에게 책임감이 강하다고 말했을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 내게 성실하다고 말했을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 간주할 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 취급할 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 분류할 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 규정할 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 평할 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 대할 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 알고 있을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 여겨 왔을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 봐 왔을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 생각해 왔을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 평가해 왔을 가능성이 있습니다. 실제 평가는 피드백으로 확인해야 합니다.",
    ]) {
      const calibratedVariant = createValidText(3).replace(
        originalOverall,
        calibratedClaim,
      );
      expect(
        validateInstantReadingText(calibratedVariant, managerRequest)?.text,
      ).toBe(calibratedVariant);
    }

    for (const uncalibratedDirectReport of [
      "카드는 다른 가능성을 시사하는 가운데 상사는 독자를 핵심 인재로 간주합니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "카드는 다른 가능성을 시사하는 한편 상사는 독자를 핵심 인재로 간주합니다. 실제 평가는 피드백으로 확인해야 합니다.",
      "상사는 독자를 핵심 인재로 간주합니다.",
      "상사는 독자를 핵심 인재로 취급합니다.",
      "상사는 독자를 핵심 인재로 분류합니다.",
      "상사는 독자를 핵심 인재로 규정합니다.",
      "상사는 독자를 핵심 인재로 평합니다.",
      "상사는 독자를 핵심 인재로 대합니다.",
      "상사는 독자를 핵심 인재로 알고 있습니다.",
      "상사는 독자를 핵심 인재로 여겨 왔습니다.",
      "상사는 독자를 핵심 인재로 봐 왔습니다.",
      "상사는 독자를 핵심 인재로 생각해 왔습니다.",
      "상사는 독자를 핵심 인재로 평가해 왔습니다.",
    ]) {
      const uncalibratedVariant = createValidText(3).replace(
        originalOverall,
        `${uncalibratedDirectReport} 다른 가능성도 남아 있을 수 있습니다.`,
      );
      expect(
        validateInstantReadingText(uncalibratedVariant, managerRequest),
      ).toBeUndefined();
    }

    for (const factualClaim of [
      "카드상 신뢰할 가능성이 있습니다. 그러나 업무 평판은 이미 나쁩니다.",
      "카드상 신뢰할 가능성이 있으며 업무 평판은 나쁩니다.",
      "카드상 신뢰 가능성이 있고 상사는 독자를 핵심 인재로 여깁니다.",
      "상사는 이미 독자를 못 미더워합니다. 이런 판단은 정해져 있습니다.",
      "독자는 유능합니다. 업무 평가는 이미 높습니다.",
      "동료에게 독자는 협업하기 어렵습니다.",
      "상사 눈에 독자는 핵심 인재가 아닙니다.",
      "상사는 독자를 유능하다고 판단합니다.",
      "상사 눈에 독자는 성실합니다.",
      "상사 눈에 독자는 꼼꼼합니다.",
      "상사 눈에 독자는 유능하지 않습니다.",
      "상사 눈에 독자는 믿음직하지 않습니다.",
      "상사 눈에 독자는 업무 속도가 빠릅니다.",
      "독자는 책임감이 강합니다.",
      "카드상 준비도가 좋아 보일 가능성이 있습니다. 상사가 보기에는 관련 경험이 많고 책임감이 강합니다.",
      "카드상 준비도가 좋아 보일 가능성이 있습니다. 상사의 관점에서는 관련 경험이 많고 책임감이 강합니다.",
      "카드상 준비도가 좋아 보일 가능성이 있습니다. 상사 입장에서는 관련 경험이 많고 책임감이 강합니다.",
      "상사 입장에서는 유능할 가능성이고 책임감이 강합니다.",
      "상사 입장에서는 유능할 가능성이 크고 책임감이 강합니다.",
      "상사 입장에서는 책임감이 강하고 경험이 많을 가능성이 있습니다.",
      "상사 입장에서는 유능할 가능성이 있어도 책임감이 강합니다.",
      "카드상 여러 가능성이 열려 있습니다. 실제로 상사는 독자를 핵심 인재로 여긴다는 점을 확인합니다.",
      "카드상 여러 가능성이 열려 있습니다. 상사는 독자를 핵심 인재로 여긴다고 합니다.",
      "카드상 여러 가능성이 열려 있습니다. 상사는 독자를 핵심 인재로 여기지 않는다고 합니다.",
      "상사는 독자에게 큰 기대를 건다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "상사는 독자에게 믿음이 간다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "상사는 독자에게 큰 기대를 걸었다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "상사는 독자에게 신뢰를 느꼈다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "상사는 독자에게 핵심 인재라고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "상사는 독자에게 좋은 직원이라고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "상사는 독자에게 성실한 직원이라고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "상사는 독자에게 유능하다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "상사는 독자에게 책임감이 강하다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "상사는 독자에게 업무가 빠르다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "상사는 독자를 핵심 인재로 평가했습니다. 카드가 다른 가능성을 시사합니다.",
      "동료들은 독자를 편한 동료로 여겼습니다. 카드가 다른 가능성을 시사합니다.",
      "동료들은 독자를 편하고 믿음직한 동료로 여기고 있습니다. 카드가 다른 가능성을 시사합니다.",
      "상사는 독자에 관해 핵심 인재라고 평가했습니다. 카드가 다른 가능성을 시사합니다.",
      "상사는 독자의 업무가 빠르고 정확하다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "상사는 나한테 성실하다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "상사께서는 독자에게 성실하다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "관리자께서는 나한테 책임감이 강하다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "동료들은 독자에게 협업하기 편하다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "회사에서는 독자를 핵심 인재라고 평가했습니다. 카드가 다른 가능성을 시사합니다.",
      "조직에서는 독자를 좋은 직원이라고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "팀에서는 독자를 협업하기 편하다고 평가했습니다. 카드가 다른 가능성을 시사합니다.",
      "팀장님은 독자에게 성실하다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "상사분은 독자에게 책임감이 강하다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "상사는 내게 성실하다고 말했습니다. 카드가 다른 가능성을 시사합니다.",
      "상사는 독자를 핵심 인재라고 볼 가능성이 있고 준비가 부족하다고도 말했습니다. 두 해석은 모두 열려 있습니다.",
      "상사는 독자의 승진 가능성을 높게 봅니다.",
      "상사는 독자가 승진할 수 있다고 봅니다.",
    ]) {
      const factualVariant = createValidText(3).replace(
        originalOverall,
        factualClaim,
      );
      expect(
        validateInstantReadingText(factualVariant, managerRequest),
      ).toBeUndefined();
    }

    const factualParallelSupportingSection = createValidText(3).replace(
      "1. 새 가능성을 열어 두되 아직 확인하지 않은 기대를 사실처럼 단정하지 않는 태도를 살펴봅니다.",
      "1. 신뢰할 가능성이 있으며 업무 평판은 나쁩니다.",
    );
    expect(
      validateInstantReadingText(
        factualParallelSupportingSection,
        managerRequest,
      ),
    ).toBeUndefined();

    const safeGrounding = createValidText(3).replace(
      "열린 가능성과 능동적인 표현이 서로 힘을 보태는 동시에, 아픈 감정을 건너뛰면 속도가 현실보다 앞설 수 있다는 긴장이 가장 두드러집니다.",
      "카드가 보여 주는 가능성은 하나로 모입니다. 두 의미는 서로 다른 관점을 함께 살펴보게 합니다.",
    );
    expect(
      validateInstantReadingText(safeGrounding, managerRequest)?.text,
    ).toBe(safeGrounding);

    const calibratedWithReaderGrounding = createValidText(3).replace(
      originalOverall,
      "카드상 상사가 업무 준비도를 신뢰할 가능성에 무게가 실립니다. 독자는 두 카드의 차이를 확인합니다.",
    );
    expect(
      validateInstantReadingText(calibratedWithReaderGrounding, managerRequest)
        ?.text,
    ).toBe(calibratedWithReaderGrounding);

    const calibratedWithInlineRealityCheck = createValidText(3).replace(
      originalOverall,
      "상사 입장에서는 유능할 가능성이 있고 실제 평가는 피드백으로 확인해야 합니다.",
    );
    expect(
      validateInstantReadingText(
        calibratedWithInlineRealityCheck,
        managerRequest,
      )?.text,
    ).toBe(calibratedWithInlineRealityCheck);

    const readerAction = createValidText(3).replace(
      "작은 행동: 부담이 적은 질문 하나를 골라 서로 확인할 수 있는 범위에서 짧게 대화해 보세요.",
      "작은 행동: 상사에게 피드백을 부탁해 보세요.",
    );
    expect(validateInstantReadingText(readerAction, managerRequest)?.text).toBe(
      readerAction,
    );
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
    createValidText(3).replace(
      "서로 표현하는 속도가 달라서 같은 행동을 다르게 받아들이며 불확실성이 커졌을 수 있습니다.",
      "이번 선택으로 반드시 승진하게 됩니다. 연봉 상승도 확정될 것입니다.",
    ),
    createValidText(3).replace(
      "서로 표현하는 속도가 달라서 같은 행동을 다르게 받아들이며 불확실성이 커졌을 수 있습니다.",
      "이번 선택을 이어가면 승진할 것입니다. 이 결과는 이미 정해졌으니 그대로 밀어붙이세요.",
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
