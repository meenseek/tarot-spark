import {
  readingLensIds,
  readingStyleIds,
  spreadIds,
  tarotCardIds,
  topicIds,
  type ReadingLensId,
  type ReadingStyleId,
  type SpreadId,
  type SpreadPositionId,
  type TarotCardId,
  type TopicId,
} from "./ids";
import { spreadPositionIdsBySpread } from "./spreads";

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
] as const;

export type InstantReadingRelationType =
  (typeof instantReadingRelationTypes)[number];
export type InstantReadingSafetyViolationId =
  (typeof instantReadingSafetyViolationIds)[number];

export type InstantReadingCardInput = {
  readonly positionId: SpreadPositionId;
  readonly cardId: TarotCardId;
};

export type InstantReadingRequest = {
  readonly topicId: TopicId;
  readonly spreadId: SpreadId;
  readonly styleId: ReadingStyleId;
  readonly lensId: ReadingLensId;
  readonly cards: readonly InstantReadingCardInput[];
};

export type InstantReadingV1 = {
  readonly headline: string;
  readonly synthesis: string;
  readonly positionReadings: readonly {
    readonly positionId: SpreadPositionId;
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

const requestKeys = [
  "topicId",
  "spreadId",
  "styleId",
  "lensId",
  "cards",
] as const;
const cardInputKeys = ["positionId", "cardId"] as const;
const readingKeys = [
  "headline",
  "synthesis",
  "positionReadings",
  "strongestConnection",
  "uncertainty",
  "nextStep",
  "reflection",
] as const;
const positionReadingKeys = ["positionId", "cardId", "interpretation"] as const;
const connectionKeys = ["relationType", "cardIds", "explanation"] as const;
const technicalMarkerPattern =
  /```|#{1,6}\s|(^|\n)\s*[-*]\s|AI|인공지능|언어\s*모델|프롬프트|JSON|시스템\s*(지침|메시지)/iu;
const unsafeReadingPatternGroups = [
  {
    id: "hidden-feelings-certainty",
    patterns: [
      /(?:상대|그 사람)(?:은|는|이|가).{0,18}(?:분명|확실|틀림없이).{0,18}(?:마음|감정|사랑|후회|그리움).{0,12}(?:입니다|합니다|있습니다)(?:[.!?]|…)*$/iu,
      /(?:상대|그 사람)(?:은|는|이|가).{0,24}(?:사랑하|후회하|그리워하|원하|기다리|질투하|생각하)(?!는지|는지를|는지는).{0,24}(?:합니다|있습니다|원합니다|느낍니다|생각합니다|기다립니다|입니다|하세요)(?:[.!?]|…)*$/iu,
      /속마음은.{0,18}(?:사랑|후회|그리움|확실|분명|틀림없).{0,12}(?:입니다|합니다|있습니다)(?:[.!?]|…)*$/iu,
    ],
  },
  {
    id: "future-certainty",
    patterns: [
      /(?:반드시|확실히|틀림없이).{0,24}(?:재회|성공|합격|연락|만나|이루|결혼).{0,18}(?:옵니다|됩니다|합니다|이루어집니다|성사됩니다|것입니다|예정입니다|확신합니다)(?:[.!?]|…)*$/iu,
      /(곧|이번\s*(달|주)|다음\s*(달|주)|\d+\s*(일|주|개월)\s*(안|후)에).{0,36}(연락|재회|성공|합격|결혼|만나|이루).{0,24}(옵니다|됩니다|합니다|것입니다|예정입니다)/iu,
    ],
  },
  {
    id: "professional-or-mental-health-advice",
    patterns: [
      /(주식|코인|가상화폐|부동산|투자).{0,24}(매수|매도|사세요|파세요|팔고|투자).{0,24}(하세요|해야|권합니다|좋습니다|필요합니다)/iu,
      /(?:변호사|고소|소송|법적 대응).{0,18}(?:선임|제기|진행).{0,12}(?:하세요|해야|권합니다|필요합니다)(?:[.!?]|…)*$/iu,
      /(진단|처방|약|복용).{0,18}(받으세요|하세요|해야|권합니다|필요합니다)/iu,
      /(우울증|불안장애|정신 질환).{0,12}(입니다|으로 보입니다|진단됩니다)/iu,
    ],
  },
  {
    id: "irreversible-urgent-action",
    patterns: [
      /(당장|즉시|오늘 바로|지금 바로).{0,24}(연락|퇴사|투자|매수|매도|팔|사|찾아가|고소|선임|헤어지|결혼).{0,18}(하세요|해야|권합니다|좋습니다|필요합니다)/iu,
    ],
  },
  {
    id: "self-harm-coercion-or-stalking",
    patterns: [
      /(자해|자살|죽는 방법|몰래\s*(확인|감시)|계속\s*연락|따라가|미행).{0,24}(하세요|해야|해보세요|권합니다|좋습니다|필요합니다)/iu,
    ],
  },
  {
    id: "unsupported-personalization",
    patterns: [
      /(?:당신|사용자)(?:은|는|이|가)\s*(?:이미|분명|확실히|실제로).{0,28}(?:느끼|원하|생각하|겪|준비하|준비했|결정하|결정했).{0,18}(?:고 있습니다|었습니다|합니다|했습니다|중입니다|상태입니다|것입니다)(?:[.!?]|…)*$/iu,
      /(?:이미|분명|확실히|실제로).{0,24}(?:마음을\s*정리했(?!는지|는지는)|새로운\s*관계를\s*준비하|결정했|느끼고\s*있|원하고\s*있|생각하고\s*있|겪고\s*있).{0,32}(?:습니다|상태입니다|것입니다)(?:[.!?]|…)*$/iu,
    ],
  },
] as const satisfies readonly {
  readonly id: InstantReadingSafetyViolationId;
  readonly patterns: readonly RegExp[];
}[];
const safetyClauseBoundaryPattern =
  /하지만|그러나|그렇지만|다만|반면에?|않지만|없지만|아니지만|말고|않고|없고|피하고|대신/gu;

export function parseInstantReadingRequest(
  value: unknown,
): InstantReadingRequest | undefined {
  if (!isRecord(value) || !hasExactKeys(value, requestKeys)) {
    return undefined;
  }

  if (
    !isAllowedId(value["topicId"], topicIds) ||
    !isAllowedId(value["spreadId"], spreadIds) ||
    !isAllowedId(value["styleId"], readingStyleIds) ||
    !isAllowedId(value["lensId"], readingLensIds) ||
    !Array.isArray(value["cards"])
  ) {
    return undefined;
  }

  const topicId = value["topicId"];
  const spreadId = value["spreadId"];
  const styleId = value["styleId"];
  const lensId = value["lensId"];
  const cardValues = value["cards"];
  const expectedPositionIds = spreadPositionIdsBySpread[spreadId];
  if (cardValues.length !== expectedPositionIds.length) {
    return undefined;
  }

  const cards: InstantReadingCardInput[] = [];
  for (const [index, card] of cardValues.entries()) {
    const expectedPositionId = expectedPositionIds[index];

    if (
      !expectedPositionId ||
      !isRecord(card) ||
      !hasExactKeys(card, cardInputKeys) ||
      card["positionId"] !== expectedPositionId ||
      !isAllowedId(card["cardId"], tarotCardIds)
    ) {
      return undefined;
    }

    cards.push({
      cardId: card["cardId"],
      positionId: expectedPositionId,
    });
  }

  if (new Set(cards.map(({ cardId }) => cardId)).size !== cards.length) {
    return undefined;
  }

  return {
    cards,
    lensId,
    spreadId,
    styleId,
    topicId,
  };
}

export function parseInstantReading(
  value: unknown,
  request: InstantReadingRequest,
): InstantReadingV1 | undefined {
  if (!isRecord(value) || !hasExactKeys(value, readingKeys)) {
    return undefined;
  }

  if (
    !isNonEmptyString(value["headline"]) ||
    !isNonEmptyString(value["synthesis"]) ||
    !isNonEmptyString(value["uncertainty"]) ||
    !isNonEmptyString(value["nextStep"]) ||
    !isNonEmptyString(value["reflection"]) ||
    !Array.isArray(value["positionReadings"]) ||
    !isRecord(value["strongestConnection"])
  ) {
    return undefined;
  }

  const headline = value["headline"];
  const synthesis = value["synthesis"];
  const uncertainty = value["uncertainty"];
  const nextStep = value["nextStep"];
  const reflection = value["reflection"];
  const positionReadingValues = value["positionReadings"];
  const connection = value["strongestConnection"];

  if (positionReadingValues.length !== request.cards.length) {
    return undefined;
  }

  const positionReadings: InstantReadingV1["positionReadings"][number][] = [];
  for (const [index, expectedCard] of request.cards.entries()) {
    const positionReading = positionReadingValues[index];

    if (
      !positionReading ||
      !isRecord(positionReading) ||
      !hasExactKeys(positionReading, positionReadingKeys) ||
      positionReading["positionId"] !== expectedCard.positionId ||
      positionReading["cardId"] !== expectedCard.cardId ||
      !isNonEmptyString(positionReading["interpretation"])
    ) {
      return undefined;
    }

    positionReadings.push({
      cardId: expectedCard.cardId,
      interpretation: positionReading["interpretation"],
      positionId: expectedCard.positionId,
    });
  }

  if (
    !hasExactKeys(connection, connectionKeys) ||
    !isAllowedId(connection["relationType"], instantReadingRelationTypes) ||
    !Array.isArray(connection["cardIds"]) ||
    !isNonEmptyString(connection["explanation"])
  ) {
    return undefined;
  }

  const relationType = connection["relationType"];
  const explanation = connection["explanation"];
  const cardIds = connection["cardIds"];
  const requestCardIds = request.cards.map(({ cardId }) => cardId);
  if (
    cardIds.length < 2 ||
    cardIds.length > requestCardIds.length ||
    !cardIds.every((cardId): cardId is TarotCardId =>
      isAllowedId(cardId, tarotCardIds),
    ) ||
    new Set(cardIds).size !== cardIds.length ||
    cardIds.some((cardId) => !requestCardIds.includes(cardId))
  ) {
    return undefined;
  }

  const reading: InstantReadingV1 = {
    headline,
    nextStep,
    positionReadings,
    reflection,
    strongestConnection: {
      cardIds,
      explanation,
      relationType,
    },
    synthesis,
    uncertainty,
  };
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

export function getInstantReadingVisibleText(reading: InstantReadingV1) {
  return [
    reading.headline,
    reading.synthesis,
    ...reading.positionReadings.map(({ interpretation }) => interpretation),
    reading.strongestConnection.explanation,
    reading.uncertainty,
    reading.nextStep,
    reading.reflection,
  ].join("\n");
}

export function getInstantReadingSafetyViolation(
  reading: InstantReadingV1,
): InstantReadingSafetyViolationId | undefined {
  const clauses = getInstantReadingVisibleText(reading)
    .split(/(?<=[.!?])|\n/gu)
    .flatMap((sentence) => sentence.split(safetyClauseBoundaryPattern))
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  for (const clause of clauses) {
    const violation = unsafeReadingPatternGroups.find(({ patterns }) =>
      patterns.some((pattern) => pattern.test(clause)),
    );
    if (violation) {
      return violation.id;
    }
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
) {
  const actualKeys = Object.keys(value);

  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every((key) => key in value)
  );
}

function isAllowedId<const AllowedId extends string>(
  value: unknown,
  allowedIds: readonly AllowedId[],
): value is AllowedId {
  return (
    typeof value === "string" &&
    (allowedIds as readonly string[]).includes(value)
  );
}
