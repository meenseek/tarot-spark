import {
  readingStyleIds,
  spreadIds,
  tarotCardIds,
  topicIds,
  type ReadingStyleId,
  type SpreadId,
  type TarotCardId,
  type TopicId,
} from "./ids";
import { hasUnsupportedVisualClaim } from "./instant-reading-contract";

export const instantReadingRelationTypes = [
  "reinforcement",
  "tension",
  "progression",
  "integration",
] as const;

export const instantReadingSafetyViolationIds = [
  "hidden-feelings-certainty",
  "future-certainty",
  "professional-or-mental-health-advice",
  "irreversible-urgent-action",
  "self-harm-coercion-or-stalking",
  "unsupported-personalization",
  "unsupported-visual-claim",
  "invented-position-semantics",
  "reversed-card-interpretation",
  "court-card-person-literalization",
  "provider-owned-card-reference",
] as const;

export type InstantReadingRelationType =
  (typeof instantReadingRelationTypes)[number];
export type InstantReadingSafetyViolationId =
  (typeof instantReadingSafetyViolationIds)[number];

export type InstantReadingCardInput = {
  readonly cardId: TarotCardId;
};

export type InstantReadingRequest = {
  readonly topicId: TopicId;
  readonly spreadId: SpreadId;
  readonly styleId: ReadingStyleId;
  readonly cards: readonly InstantReadingCardInput[];
};

export type InstantReading = {
  readonly headline: string;
  readonly synthesis: string;
  readonly cardReadings: readonly {
    readonly cardId: TarotCardId;
    readonly interpretation: string;
  }[];
  readonly strongestConnection: {
    readonly relationType: InstantReadingRelationType;
    readonly cardIds: readonly TarotCardId[];
    readonly explanation: string;
  };
  readonly uncertainty: string;
  readonly nextStep: string;
  readonly reflection: string;
};

const requestKeys = ["topicId", "spreadId", "styleId", "cards"] as const;
const cardInputKeys = ["cardId"] as const;
const readingKeys = [
  "headline",
  "synthesis",
  "cardReadings",
  "strongestConnection",
  "uncertainty",
  "nextStep",
  "reflection",
] as const;
const cardReadingKeys = ["interpretation"] as const;
const connectionKeys = ["relationType", "cardIndexes", "explanation"] as const;
const apiCardReadingKeys = ["cardId", "interpretation"] as const;
const apiConnectionKeys = ["relationType", "cardIds", "explanation"] as const;
const technicalMarkerPattern =
  /```|#{1,6}\s|(^|\n)\s*[-*]\s|AI|인공지능|언어\s*모델|프롬프트|JSON|시스템\s*(지침|메시지)/iu;
const providerOwnedCardReferencePatterns = [
  /카드/u,
  /(?<![가-힣])(?:완드|소드|펜타클)(?:(?:은|는|이|가|의|을|를|와|과|로|으로|처럼|라는|이라는|이라고|으로서))?(?![가-힣])/u,
  /(?<![가-힣])컵\s*(?:에이스|[2-9]|10|페이지|나이트|퀸|킹)(?:(?:은|는|이|가|의|을|를|와|과|로|으로|에게|에게서))?(?![가-힣])/u,
  /(?<![가-힣])컵(?:(?:은|는|이|가|의|을|를|와|과|로|으로|처럼|라는|이라는|이라고|으로서))?(?![가-힣]).{0,24}(?:타로|상징|뜻|의미|그림|이미지|감정)/u,
  /(?:타로|상징|뜻|의미|그림|이미지|감정).{0,24}(?<![가-힣])컵(?:(?:은|는|이|가|의|을|를|와|과|로|으로|처럼|라는|이라는|이라고|으로서))?(?![가-힣])/u,
  /\b(?:tarot\s+)?cards?\b|\b(?:wands|cups|swords|pentacles)\b/iu,
] as const;
const unsafeReadingPatternGroups = [
  {
    id: "hidden-feelings-certainty",
    patterns: [
      /(?:상대|그 사람)(?:은|는|이|가).{0,18}(?:분명|확실|틀림없이).{0,18}(?:마음|감정|사랑|후회|그리움)/iu,
      /속마음은.{0,18}(?:사랑|후회|그리움|확실|분명|틀림없)/iu,
    ],
  },
  {
    id: "future-certainty",
    patterns: [
      /(?:반드시|확실히|틀림없이).{0,24}(?:재회|성공|합격|연락|만나|이루|결혼)/iu,
      /(?:곧|이번\s*(?:달|주)|다음\s*(?:달|주)|\d+\s*(?:일|주|개월)\s*(?:안|후)에).{0,36}(?:연락|재회|성공|합격|결혼|만나|이루)/iu,
    ],
  },
  {
    id: "professional-or-mental-health-advice",
    patterns: [
      /(?:주식|코인|가상화폐|부동산|투자).{0,24}(?:매수|매도|사세요|파세요|투자)/iu,
      /(?:변호사|고소|소송|법적 대응).{0,18}(?:선임|제기|진행)/iu,
      /(?:진단|처방|약|복용).{0,18}(?:받으세요|하세요|해야|권합니다)/iu,
      /(?:우울증|불안장애|정신 질환).{0,12}(?:입니다|으로 보입니다|진단됩니다)/iu,
    ],
  },
  {
    id: "irreversible-urgent-action",
    patterns: [
      /(?:당장|즉시|오늘 바로|지금 바로).{0,24}(?:연락|퇴사|투자|매수|매도|찾아가|고소|헤어지|결혼)/iu,
    ],
  },
  {
    id: "self-harm-coercion-or-stalking",
    patterns: [
      /(?:자해|자살|죽는 방법|몰래\s*(?:확인|감시)|계속\s*연락|미행)/iu,
      /(?:상대|그\s*사람|연인|전\s*애인)(?:의|을|를)?\s*(?:뒤|동선|위치).{0,12}(?:몰래\s*)?(?:따라가|뒤따라가)/u,
      /(?:상대|그\s*사람|연인|전\s*애인)(?:의|을|를)?.{0,12}몰래.{0,8}(?:따라가|뒤따라가)/u,
    ],
  },
  {
    id: "unsupported-personalization",
    patterns: [
      /(?:당신|사용자)(?:은|는|이|가)\s*(?:이미|분명|확실히|실제로).{0,28}(?:느끼|원하|생각하|겪|준비하|결정하)/iu,
    ],
  },
  {
    id: "invented-position-semantics",
    patterns: [
      /불씨|그림자|다음\s*걸음/u,
      /(?:과거|현재|미래|원인|장애물|조언|핵심|숨은\s*영향)\s*(?:→|=)\s*(?:(?:완드|컵|소드|펜타클)\s*(?:에이스|[2-9]|10|페이지|나이트|퀸|킹)|바보|마법사|여사제|여황제|황제|교황|연인|전차|힘|은둔자|운명의\s*수레바퀴|정의|매달린\s*사람|죽음|절제|악마|탑|별|달|태양|심판|세계)/u,
      /(?:과거|미래|원인|장애물|조언)\s*(?:의\s*)?자리/u,
      /(?:과거|미래|원인|장애물|조언|핵심|숨은\s*영향)\s*(?:의\s*)?역할/u,
      /(?:첫|두|세|네|다섯|여섯)\s*번째\s*(?:자리|위치)/u,
      /(?:(?:\d+\s*(?:번|번째)|첫(?:째|\s*번째)?|둘째|두\s*번째|셋째|세\s*번째|넷째|네\s*번째|다섯째|다섯\s*번째|여섯째|여섯\s*번째)(?:\s*(?:카드|장))?|카드\s*\d+|(?:맨\s*앞|끝|왼쪽|왼편|가운데|중앙|중간|오른쪽|오른편|마지막)\s*(?:카드|장)|(?:처음|첫\s*번째로)\s*뽑힌\s*카드)\s*(?:은|는|이|가|의|를|에서|에는|:|,|\/|\||—|-)/u,
      /(?:불씨|그림자|다음\s*걸음|과거|현재|미래|원인|장애물|조언|핵심|시작|결론|숨은\s*영향)\s*(?::|\/|\||→|=|—|-)\s*(?:(?:완드|컵|소드|펜타클)\s*(?:에이스|[2-9]|10|페이지|나이트|퀸|킹)|바보|마법사|여사제|여황제|황제|교황|연인|전차|힘|은둔자|운명의\s*수레바퀴|정의|매달린\s*사람|죽음|절제|악마|탑|별|달|태양|심판|세계)(?!\s*의\s*의미)/u,
      /(?:(?:완드|컵|소드|펜타클)\s*(?:에이스|[2-9]|10|페이지|나이트|퀸|킹)|바보|마법사|여사제|여황제|황제|교황|연인|전차|힘|은둔자|운명의\s*수레바퀴|정의|매달린\s*사람|죽음|절제|악마|탑|별|달|태양|심판|세계)\s*(?:(?:카드는|카드가)\s*(?:과거|현재|미래|원인|장애물|조언|핵심|시작|결론)(?:을|를|의\s*역할을)?\s*(?:뜻|의미|나타내|말|담당)|(?:은|는|이|가)\s*(?:과거|현재|미래|원인|장애물|조언|핵심|시작|결론)(?:(?:을|를)\s*(?:뜻|의미|나타내|말|담당)|\s*(?:카드|역할|자리))|(?::|\/|\||→|=|—|-)\s*(?:과거|현재|미래|원인|장애물|조언|핵심|시작|결론))/u,
      /\b(?:spark|shadow|next step)\s+(?:position|slot)\b/iu,
      /\b(?:past|present|future|cause|obstacle|advice)\s+(?:position|slot)\b/iu,
      /\b(?:first|second|third|fourth|fifth|sixth)\s+card.{0,40}\b(?:past|present|future|cause|obstacle|advice)\b/iu,
    ],
  },
  {
    id: "reversed-card-interpretation",
    patterns: [
      /(?:역방향|역위치|리버스|정위치)/u,
      /(?:카드|(?:완드|컵|소드|펜타클)\s*(?:에이스|[2-9]|10|페이지|나이트|퀸|킹)|바보|마법사|여사제|여황제|황제|교황|연인|전차|힘|은둔자|운명의\s*수레바퀴|정의|매달린\s*사람|죽음|절제|악마|탑|별|달|태양|심판|세계).{0,24}(?:역방향|역위치|리버스|뒤집(?:힌|어|어서)|거꾸로|반대\s*방향|반대로|역으로|정방향과\s*반대)/u,
      /(?:역방향|역위치|리버스|뒤집(?:힌|어|어서)|거꾸로|반대\s*방향|반대로|역으로|정방향과\s*반대).{0,24}(?:카드|의미|뜻|해석|읽|보)/u,
      /뒤집어서\s*보면\s*(?:의미가\s*)?달라/u,
      /반대\s*(?:의미|뜻)(?:로|으로)?.{0,12}(?:읽|해석|보)/u,
      /정방향(?:이|은)\s*아닌.{0,12}(?:읽|해석|의미|뜻)/u,
      /정위치(?:가|는|도)?\s*아닌.{0,12}(?:읽|해석|의미|뜻)/u,
      /정방향\s*외(?:의|에)?\s*.{0,12}(?:읽|해석|의미|뜻)/u,
      /\b(?:reversed|reversal|upside[- ]down)\b/iu,
    ],
  },
  {
    id: "court-card-person-literalization",
    patterns: [
      /\b(?:Page|Knight|Queen|King)\b/u,
      /(?<![가-힣])(?:(?:완드|컵|소드|펜타클)(?:의|\s)*)?(?:페이지|나이트|퀸|킹)(?:\s*카드)?(?:은|는|이|가|을|를|에게(?:서)?).{0,36}(?:(?:실제|특정)\s*(?:여성|남성|여자|남자|인물|사람)|(?:상대방의\s*)?(?:어머니|아버지|연인)(?:\s*같은\s*(?:인물|사람))?|젊은\s*(?:사람|인물)|젊은이|아이|나이\s*많은\s*(?:사람|인물)|연상의\s*(?:여성|남성|사람|인물)|(?:여성|남성|여자|남자|소년|소녀))(?:(?:은|는|이|가|을|를|으로|로)?\s*(?:뜻|가리(?:키|킵)|나타(?:내|냅)|말|읽|해석)|이다|입니다|이에요|예요|인\s*셈)/u,
      /(?<![가-힣])(?:(?:완드|컵|소드|펜타클)(?:의|\s)*)?(?:페이지|나이트|퀸|킹)(?:\s*카드)?(?:은|는|이|가|을|를|에게(?:서)?).{0,36}(?:(?:실제|특정)\s*(?:여성|남성|여자|남자|인물|사람)|(?:어린|젊은|중년|나이\s*많은|연상의)\s*(?:여성|남성|여자|남자|인물|사람)|어머니|아버지|소년|소녀|아이|젊은이).{0,18}(?:일\s*수|떠올리|연상|연결|볼\s*수)/u,
      /(?<![가-힣])(?:(?:완드|컵|소드|펜타클)(?:의|\s)*)?(?:페이지|나이트|퀸|킹)(?:\s*카드)?(?:은|는|이|가|을|를|에게(?:서)?).{0,36}(?:(?:실제|특정)\s*)?(?:여성|남성|여자|남자|여인|인물|사람|어린\s*인물|어린\s*사람|청년|중년|노인|어머니|아버지|소년|소녀|아이|젊은이).{0,18}(?:일\s*가능성|일\s*수|관련|암시|가리키|가리킵|떠올리|연상|연결|볼\s*수)/u,
      /(?<![가-힣])(?:(?:완드|컵|소드|펜타클)(?:의|\s)*)?(?:페이지|나이트|퀸|킹)(?:\s*카드)?(?:은|는|이|가|을|를|에게(?:서)?).{0,36}(?:여성상|남성상|여성|남성|여자|남자|여인|어린\s*인물|어린\s*존재|청년|중년|노인|어머니|아버지|소년|소녀|아이|젊은이)(?:으?로\s*볼\s*수|\s*캐릭터(?:이|입)|\s*같은\s*존재.{0,8}(?:상징|나타(?:내|냅)|입니다)|의\s*모습.{0,8}(?:상징|나타(?:내|냅)|볼\s*수)|.{0,8}표현)/u,
      /(?<![가-힣])(?:페이지|나이트|퀸|킹)(?:은|는|이|가|을|를|에게(?:서)?).{0,36}(?:여성상|남성상|여성|남성|여자|남자|여인|어린\s*(?:인물|존재|세대)|청년(?:\s*인물)?|중년|노인|어머니|아버지|소년|소녀|아이|젊은이).{0,18}(?:뜻|상징|나타(?:내|냅)|해석|표현)/u,
      /\b(?:page|knight|queen|king)(?: of (?:wands|cups|swords|pentacles))?\b.{0,24}\b(?:means|represents|indicates|is)\b.{0,16}\b(?:a )?(?:woman|man|girl|boy|person)\b/iu,
    ],
  },
] as const satisfies readonly {
  readonly id: Exclude<
    InstantReadingSafetyViolationId,
    "provider-owned-card-reference" | "unsupported-visual-claim"
  >;
  readonly patterns: readonly RegExp[];
}[];

export function parseInstantReadingRequest(
  value: unknown,
): InstantReadingRequest | undefined {
  if (!isRecord(value) || !hasExactKeys(value, requestKeys)) return undefined;
  if (
    !isAllowedId(value["topicId"], topicIds) ||
    !isAllowedId(value["spreadId"], spreadIds) ||
    !isAllowedId(value["styleId"], readingStyleIds) ||
    !Array.isArray(value["cards"])
  ) {
    return undefined;
  }

  const expectedCount = value["spreadId"] === "quick" ? 3 : 6;
  if (value["cards"].length !== expectedCount) return undefined;

  const cards: InstantReadingCardInput[] = [];
  for (const input of value["cards"]) {
    if (
      !isRecord(input) ||
      !hasExactKeys(input, cardInputKeys) ||
      !isAllowedId(input["cardId"], tarotCardIds)
    ) {
      return undefined;
    }
    cards.push({ cardId: input["cardId"] });
  }
  if (new Set(cards.map(({ cardId }) => cardId)).size !== cards.length) {
    return undefined;
  }

  return {
    cards,
    spreadId: value["spreadId"],
    styleId: value["styleId"],
    topicId: value["topicId"],
  };
}

export function parseInstantReadingProviderResponse(
  value: unknown,
  request: InstantReadingRequest,
): InstantReading | undefined {
  if (!isRecord(value) || !hasExactKeys(value, readingKeys)) return undefined;
  if (
    !isNonEmptyString(value["headline"]) ||
    !isNonEmptyString(value["synthesis"]) ||
    !isNonEmptyString(value["uncertainty"]) ||
    !isNonEmptyString(value["nextStep"]) ||
    !isNonEmptyString(value["reflection"]) ||
    !Array.isArray(value["cardReadings"]) ||
    !isRecord(value["strongestConnection"]) ||
    value["cardReadings"].length !== request.cards.length
  ) {
    return undefined;
  }

  const cardReadings: InstantReading["cardReadings"][number][] = [];
  for (const [index, expectedCard] of request.cards.entries()) {
    const cardReading = value["cardReadings"][index];
    if (
      !isRecord(cardReading) ||
      !hasExactKeys(cardReading, cardReadingKeys) ||
      !isNonEmptyString(cardReading["interpretation"])
    ) {
      return undefined;
    }
    cardReadings.push({
      cardId: expectedCard.cardId,
      interpretation: cardReading["interpretation"],
    });
  }

  const connection = value["strongestConnection"];
  if (
    !hasExactKeys(connection, connectionKeys) ||
    !isAllowedId(connection["relationType"], instantReadingRelationTypes) ||
    !Array.isArray(connection["cardIndexes"]) ||
    !isNonEmptyString(connection["explanation"])
  ) {
    return undefined;
  }
  const cardIndexes = connection["cardIndexes"];
  if (
    cardIndexes.length < 2 ||
    cardIndexes.length > request.cards.length ||
    !cardIndexes.every((cardIndex): cardIndex is number =>
      isAllowedCardIndex(cardIndex, request.cards.length),
    ) ||
    new Set(cardIndexes).size !== cardIndexes.length
  ) {
    return undefined;
  }

  const reading: InstantReading = {
    cardReadings,
    headline: value["headline"],
    nextStep: value["nextStep"],
    reflection: value["reflection"],
    strongestConnection: {
      cardIds: cardIndexes.map(
        (cardIndex) => request.cards[cardIndex - 1]!.cardId,
      ),
      explanation: connection["explanation"],
      relationType: connection["relationType"],
    },
    synthesis: value["synthesis"],
    uncertainty: value["uncertainty"],
  };
  return validateInstantReading(reading);
}

export function parseInstantReading(
  value: unknown,
  request: InstantReadingRequest,
): InstantReading | undefined {
  if (!isRecord(value) || !hasExactKeys(value, readingKeys)) return undefined;
  if (
    !isNonEmptyString(value["headline"]) ||
    !isNonEmptyString(value["synthesis"]) ||
    !isNonEmptyString(value["uncertainty"]) ||
    !isNonEmptyString(value["nextStep"]) ||
    !isNonEmptyString(value["reflection"]) ||
    !Array.isArray(value["cardReadings"]) ||
    !isRecord(value["strongestConnection"]) ||
    value["cardReadings"].length !== request.cards.length
  ) {
    return undefined;
  }

  const cardReadings: InstantReading["cardReadings"][number][] = [];
  for (const [index, expectedCard] of request.cards.entries()) {
    const cardReading = value["cardReadings"][index];
    if (
      !isRecord(cardReading) ||
      !hasExactKeys(cardReading, apiCardReadingKeys) ||
      cardReading["cardId"] !== expectedCard.cardId ||
      !isNonEmptyString(cardReading["interpretation"])
    ) {
      return undefined;
    }
    cardReadings.push({
      cardId: expectedCard.cardId,
      interpretation: cardReading["interpretation"],
    });
  }

  const connection = value["strongestConnection"];
  if (
    !hasExactKeys(connection, apiConnectionKeys) ||
    !isAllowedId(connection["relationType"], instantReadingRelationTypes) ||
    !Array.isArray(connection["cardIds"]) ||
    !isNonEmptyString(connection["explanation"])
  ) {
    return undefined;
  }
  const requestCardIds = request.cards.map(({ cardId }) => cardId);
  if (
    connection["cardIds"].length < 2 ||
    connection["cardIds"].length > requestCardIds.length ||
    !connection["cardIds"].every((cardId): cardId is TarotCardId =>
      isAllowedId(cardId, tarotCardIds),
    ) ||
    new Set(connection["cardIds"]).size !== connection["cardIds"].length ||
    connection["cardIds"].some((cardId) => !requestCardIds.includes(cardId))
  ) {
    return undefined;
  }

  return validateInstantReading({
    cardReadings,
    headline: value["headline"],
    nextStep: value["nextStep"],
    reflection: value["reflection"],
    strongestConnection: {
      cardIds: connection["cardIds"],
      explanation: connection["explanation"],
      relationType: connection["relationType"],
    },
    synthesis: value["synthesis"],
    uncertainty: value["uncertainty"],
  });
}

function validateInstantReading(reading: InstantReading) {
  const visibleText = getInstantReadingVisibleText(reading);
  const visibleLength = [...visibleText].length;
  if (
    visibleLength < 500 ||
    visibleLength > 900 ||
    technicalMarkerPattern.test(visibleText) ||
    getInstantReadingSafetyViolation(reading)
  ) {
    return undefined;
  }

  return reading;
}

function isAllowedCardIndex(
  value: unknown,
  cardCount: number,
): value is number {
  return (
    Number.isInteger(value) && Number(value) >= 1 && Number(value) <= cardCount
  );
}

export function getInstantReadingVisibleText(reading: InstantReading) {
  return [
    reading.headline,
    reading.synthesis,
    ...reading.cardReadings.map(({ interpretation }) => interpretation),
    reading.strongestConnection.explanation,
    reading.uncertainty,
    reading.nextStep,
    reading.reflection,
  ].join("\n");
}

export function getInstantReadingSafetyViolation(
  reading: InstantReading,
): InstantReadingSafetyViolationId | undefined {
  const visibleText = getInstantReadingVisibleText(reading);
  if (hasUnsupportedVisualClaim(visibleText)) return "unsupported-visual-claim";

  for (const { id, patterns } of unsafeReadingPatternGroups) {
    if (patterns.some((pattern) => pattern.test(visibleText))) return id;
  }
  if (
    providerOwnedCardReferencePatterns.some((pattern) =>
      pattern.test(visibleText),
    )
  ) {
    return "provider-owned-card-reference";
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => key in value);
}

function isAllowedId<const Id extends string>(
  value: unknown,
  ids: readonly Id[],
): value is Id {
  return (
    typeof value === "string" && (ids as readonly string[]).includes(value)
  );
}
