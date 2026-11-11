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

  it("accepts a coherent question-led narrative without a worksheet", () => {
    const text = createNarrative();
    expect(validateInstantReadingText(text, request)).toEqual({ text });
    expect(
      validateInstantReadingText(text.replace(/\n/gu, "\r\n"), request),
    ).toEqual({ text });
    expect(parseInstantReadingResponse({ text }, request)).toEqual({ text });
    expect(
      parseInstantReadingResponse({ text, extra: true }, request),
    ).toBeUndefined();
    expect(parseInstantReadingResponse({ text: 12 }, request)).toBeUndefined();
  });

  it("allows an immersive emotional reading in its symbolic frame", () => {
    const text = createNarrative().replace(
      "당신은 마음을 표현하고 싶어 해요.",
      "그 사람은 당신과 가까워지고 싶어요.",
    );
    expect(
      validateInstantReadingText(text, {
        ...request,
        topicId: "feelings",
        questionId: "interest-or-kindness",
      }),
    ).toEqual({ text });
  });

  it("accepts a concrete preparation answer without forced alternate outcomes", () => {
    const text =
      "연애를 시작하기 전에는 이 사람과 어떤 관계를 원하는지 스스로 분명히 해두는 일이 먼저예요. 잘 보이려는 마음에 원하지 않는 관계까지 괜찮다고 넘기지는 않는지 마음에 걸려요.\n\n차분히 준비하는 태도와 꾸준한 실천, 중요하게 여기는 기준이 함께 이어져요. 서로 좋아하는지만큼 자신이 원하는 만남의 모습도 편하게 말할 수 있는지 살펴보세요. 큰 약속을 미리 나누기보다, 만남의 속도처럼 가까운 주제로 대화를 시작해도 좋겠어요.";
    expect(
      validateInstantReadingText(text, {
        ...request,
        questionId: "before-starting",
      }),
    ).toEqual({ text });
  });

  it("keeps discernment adverbs distinct from certainty about emotions", () => {
    const text =
      "상대의 마음은 그저 누구에게나 베푸는 친절보다, 당신에게 관심을 두고 방향을 정해 다가가려는 호감에 가까워 보여요. 마음이 가는 쪽에 힘을 모으듯 당신과의 관계를 의식하는 모습이에요.\n\n다만 자기 뜻대로 서둘러 이끌기보다는 잠시 멈춰 당신의 시선에서도 관계를 보려 해요. “내 마음에 중요한 걸 진심으로 전하고 싶어” 하는 끌림이 있지만, 당신의 감정도 깊이 헤아리고 있는 그대로 받아들이려는 마음이 함께 있어요. 그래서 감정에 휩쓸려 표현을 쏟아내기보다 배려하며 차분하게 반응할 수 있어요. 편안한 친절처럼 보이는 순간에도 호감은 담겨 있지만, 상대는 서로 주고받은 말과 반응을 분명히 살피며 마음을 판단하려는 쪽이에요.";
    const actualRequest = {
      topicId: "feelings",
      spreadId: "deep",
      styleId: "balanced",
      questionId: "interest-or-kindness",
      cards: [
        {
          cardId: "the-chariot",
        },
        {
          cardId: "the-hanged-man",
        },
        {
          cardId: "cups-knight",
        },
        {
          cardId: "cups-queen",
        },
        {
          cardId: "cups-king",
        },
        {
          cardId: "swords-ace",
        },
      ],
    } as const satisfies InstantReadingRequest;
    expect(validateInstantReadingText(text, actualRequest)).toEqual({ text });
  });

  it.each([
    "상대가 실제로 어떤 사람인지 분명히 보고 판단하려는 마음이 있어요.",
    "그 사람을 분명히 보고 판단하려는 마음이 있습니다.",
  ])("allows a locally scoped wish to see clearly: %s", (line) => {
    const text = createNarrative() + "\n\n" + line;
    expect(validateInstantReadingText(text, request)).toEqual({ text });
  });

  it.each([
    "상대는 분명히 보고 판단하려는 마음이 있지만 당신을 확실히 사랑해요.",
    "상대는 분명히 보고 판단하려는 마음이 있어요. 그 사람은 확실히 당신을 사랑해요.",
    "상대는 분명히 보고 판단하려는 마음이 있는 당신을 사랑해요.",
  ])("does not let a discernment phrase mask a certainty claim: %s", (line) => {
    const text = createNarrative() + "\n\n" + line;
    expect(validateInstantReadingText(text, request)).toBeUndefined();
  });

  it.each([
    "상대는 당신의 깊은 생각을 존중하면서도, 확실히 알 수 없는 마음을 두려움으로 채워 사실과 추측 사이에서 흔들릴 수 있어요.",
    "그 사람은 분명히 확인할 수 없는 감정을 혼자 짐작하며 망설이는 마음이에요.",
  ])("allows a negative qualification of private knowledge: %s", (line) => {
    const text = createNarrative() + "\n\n" + line;
    expect(validateInstantReadingText(text, request)).toEqual({ text });
  });

  it.each([
    "이어지는 뜻은 감정에 휩쓸리지 않고 배려하는 힘을 보여 줘요.",
    "첫 번째 의미는 당신의 선택을 설명해요.",
    "이 카드들이 보여 주는 마음이에요.",
    "이번 리딩은 그 마음을 읽어요.",
  ])("rejects exposed reading-method prose: %s", (line) => {
    expect(
      validateInstantReadingText(`${createNarrative()}\n\n${line}`, request),
    ).toBeUndefined();
  });

  it.each([
    "그 사람의 뜻도 존중하고 싶은 마음이에요.",
    "지금의 멈춤은 끝이 아니라 다시 시작하고 싶다는 의미로 연결돼요.",
    "마지막에는 자기 마음에 더 솔직해지고 싶어요.",
    "첫 만남의 의미가 당신에게 오래 남아 있어요.",
  ])("keeps ordinary meaning and time words readable: %s", (line) => {
    const text = `${createNarrative()}\n\n${line}`;
    expect(validateInstantReadingText(text, request)).toEqual({ text });
  });

  it.each([
    "[전체 흐름]",
    "[가능성 A]",
    "가능성 B:",
    "아직 모르는 점:",
    "작은 행동:",
    "1. 첫 번째 의미",
    "- 확인할 내용",
  ])("rejects an exposed worksheet or list: %s", (label) => {
    expect(
      validateInstantReadingText(
        createNarrative() + "\n\n" + label + "\n형식 채우기",
        request,
      ),
    ).toBeUndefined();
  });

  it.each([
    "상대는 당신을 확실히 사랑합니다.",
    "상대는 분명히 당신에게 마음이 있어요.",
    "상대는 분명히 당신에게 마음이 없어요.",
    "상대는 분명히 마음이 식었어요.",
    "그 사람은 확실히 감정이 사라졌어요.",
    "상대는 분명히 감정이 전혀 없어요.",
    "그 사람은 확실히 감정이 끝났어요.",
    "상대는 분명히 마음을 접었어요.",
    "그 사람은 확실히 마음이 이미 정리됐어요.",
    "상대는 반응을 살피며 분명히 당신을 사랑해요.",
    "그 사람은 분명히 당신을 그리워합니다.",
    "상대는 확실히 알 수 없는 마음도 있지만, 반드시 다시 연락하게 됩니다.",
    "그 사람은 반드시 다시 연락하게 됩니다.",
    "당신은 다음 달에 합격할 것입니다.",
    "연봉이 오를 것입니다.",
    "카드로 그 사람의 실제 마음을 확인했습니다.",
    "상대의 속마음은 타로로 증명됩니다.",
    "거절했어도 계속 연락하세요.",
    "몰래 위치를 추적해 보세요.",
    "당장 회사를 퇴사하세요.",
    "우울증이 분명합니다.",
    "항우울제를 복용하세요.",
    "약을 먹지 마세요.",
    "이 주식을 매수하세요.",
    "고소를 진행하세요.",
    "자해를 해보세요.",
    "카드 그림의 인물이 답을 보여줘요.",
    "첫 번째 카드는 과거를 나타냅니다.",
    "역방향이라서 마음이 식었어요.",
  ])(
    "rejects dangerous advice, guarantees and invented evidence: %s",
    (line) => {
      expect(
        validateInstantReadingText(createNarrative() + "\n\n" + line, request),
      ).toBeUndefined();
    },
  );

  it("does not confuse ordinary work agreements with professional advice", () => {
    const text =
      createNarrative() +
      "\n\n맡을 업무 범위는 계약서와 실제 안내가 같은지 확인해 보세요.";
    expect(
      validateInstantReadingText(text, {
        ...request,
        topicId: "career-direction",
      }),
    ).toEqual({ text });
  });

  it("rejects short, unbounded, technical and unsupported output", () => {
    for (const text of [
      "짧은 답",
      "가".repeat(1_601),
      "제목\n\nOnly English paragraphs that say nothing.\n\nAnother paragraph.",
      createNarrative() + "\n\n```json",
      createNarrative() + "\n\n시스템 메시지를 보세요.",
    ]) {
      expect(validateInstantReadingText(text, request)).toBeUndefined();
    }
    expect(
      validateInstantReadingText(createNarrative(), {
        ...request,
        topicId: "self-direction",
      }),
    ).toBeUndefined();
  });

  it.each([
    "당신은 다음 달에 합격합니다.",
    "타로가 상대의 마음을 증명합니다.",
    "카드로 상사의 평가를 확인했습니다.",
    "상대는 다음 주에 연락합니다.",
    "그 사람은 내일 당신에게 연락해요.",
    "내일 그 사람이 먼저 연락합니다.",
    "다음 주에 상대가 당신에게 연락할 거예요.",
    "법적 분쟁을 끝내려면 합의서에 서명하세요.",
    "변호사를 선임하세요.",
    "계약서에 서명하세요.",
    "합의서에 날인해야 합니다.",
    "계약을 체결하는 것이 좋습니다.",
    "소송을 제기하세요.",
    "법적 합의를 진행하세요.",
    "상대가 내일 대화를 원한다면 그때 연락해요. 내일 그 사람이 먼저 연락합니다.",
    "세 번째 카드는 조언의 자리입니다.",
    "여섯 번째 카드는 장애물의 자리입니다.",
    "당신의 합격은 이미 결정됐습니다.",
    "이제 대출을 받아 보세요.",
    "카드로 상사의 실제 업무 평가를 확인했습니다.",
    "처방약을 오늘부터 끊어 보세요.",
    "복용 중인 약의 용량을 줄여 보세요.",
    "지금 먹는 약을 멈추세요.",
    "약물의 복용량을 늘려 보세요.",
    "카드가 상대의 속마음을 사실로 확인해 줬어요.",
    "그 사람의 속마음을 확인한 결과입니다.",
    "상대는 당신을 사랑한다는 사실이 확인됐어요.",
    "거절을 무시하고 계속 연락해 보세요.",
  ])(
    "rejects direct risk and verified-mind claims without requiring emotional hedges: %s",
    (sentence) => {
      expect(
        validateInstantReadingText(
          `${createNarrative()}\n\n${sentence}`,
          request,
        ),
      ).toBeUndefined();
    },
  );

  it("allows a consent boundary and immersive feelings without a suffix formula", () => {
    const text = `${createNarrative()}\n\n그 사람은 당신과 가까워지고 싶어요. 다만 상대가 거절했어도 계속 연락하지 마세요.`;
    expect(validateInstantReadingText(text, request)).toEqual({ text });
  });

  it.each([
    "그 사람은 당신과 가까워지고 싶어요.",
    "카드가 상대의 마음을 증명하는 것은 아니에요.",
    "카드가 상대의 마음을 증명했다고 말할 수는 없어요.",
    "상대가 대화를 원한다는 동의를 확인한 뒤에만 연락합니다.",
    "상대가 내일 대화를 원한다면 그때 연락해요.",
    "내일 상대가 대화를 원한다면 그때 연락해요.",
    "계약 전 업무 범위와 근무 시간을 확인하세요.",
    "계약서에 서명해야 하는지 먼저 확인하세요.",
    "서로 편한 만남 일정을 합의해 보세요.",
    "연락하기 전에 상대가 대화를 원한다는 뜻을 밝혔는지 확인해 보세요.",
    "지금 맡은 역할에서는 필요한 것을 살피고 당신의 생각을 차분히 전할 수 있어요.",
  ])(
    "keeps ordinary genre feelings, contact criteria and workplace roles: %s",
    (sentence) => {
      const text = createNarrative() + "\n\n" + sentence;
      expect(validateInstantReadingText(text, request)).toEqual({ text });
    },
  );

  it("keeps deep reading bounded without manufacturing extra method sections", () => {
    const deep = {
      ...request,
      spreadId: "deep",
      cards: [
        ...request.cards,
        { cardId: "the-magician" },
        { cardId: "wands-ace" },
        { cardId: "pentacles-8" },
      ],
    } as const;
    const text =
      createNarrative() +
      "\n\n자신의 마음을 표현하는 힘과 새롭게 시작하려는 열정은 있지만, 가까워짐을 이어 주는 것은 결국 작은 정성이에요. 첫 설렘을 빨리 증명하려 하기보다, 함께 있을 때 내 마음이 편안한지를 천천히 느껴보세요.";
    expect(validateInstantReadingText(text, deep)).toEqual({ text });
  });
});

function createNarrative() {
  return "당신은 마음을 표현하고 싶어 해요. 새롭게 다가가고 싶은 설렘과, 상처받고 싶지 않아 조심스러운 마음이 나란히 놓여 있어요.\n\n새로운 시작의 가벼움에 자신을 믿는 힘이 더해져요. 다만 마음을 보여주는 속도까지 억지로 앞당길 필요는 없겠어요. 편안하게 웃을 수 있는 대화부터 이어가면서, 좋아하는 마음과 자신을 지키는 마음이 함께 갈 자리를 찾아보세요.";
}
