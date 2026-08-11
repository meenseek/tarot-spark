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
import {
  getReadingTaxonomy,
  getRelationshipQuestionDefinition,
  isRelationshipQuestionId,
  type RelationshipQuestionId,
} from "./taxonomy";

export type InstantReadingCardInput = {
  readonly cardId: TarotCardId;
};

export type InstantReadingRequest = {
  readonly topicId: TopicId;
  readonly spreadId: SpreadId;
  readonly styleId: ReadingStyleId;
  readonly cards: readonly InstantReadingCardInput[];
  readonly questionId?: RelationshipQuestionId;
};

export type InstantReading = {
  readonly text: string;
};

export const instantReadingMarkers = [
  "[전체 흐름]",
  "[카드별 흐름]",
  "[가장 강한 연결]",
  "[가능성 A]",
  "[가능성 B]",
  "[현실 확인]",
  "[다음 행동]",
  "[성찰 질문]",
] as const;

const realityLabels = [
  "아직 모르는 점:",
  "관찰할 점:",
  "다시 볼 조건:",
] as const;
const actionLabels = ["작은 행동:", "멈추거나 다시 볼 조건:"] as const;
const requestKeys = ["topicId", "spreadId", "styleId", "cards"] as const;
const requestKeysWithQuestion = [...requestKeys, "questionId"] as const;
const cardInputKeys = ["cardId"] as const;
const responseKeys = ["text"] as const;
const technicalPattern =
  /```|<\/?[a-z][^>]*>|\bJSON\b|프롬프트|시스템\s*메시지|언어\s*모델|인공지능|\bAI\b/iu;
const hiddenFeelingSubjectPattern = /(?:상대(?:방)?|그\s*사람)/u;
const hiddenFeelingClaimPattern =
  /(?:사랑|호감|관심|망설임|연애\s*대상|그리움|그리워|후회|좋아|마음|감정)(.{0,24}?)(?:있습니다|없습니다|합니다|느낍니다|원합니다|봅니다|여깁니다|생각합니다|남아\s*있습니다|읽힙니다|있어요|없어요|해요|느껴요|원해요|봐요|여겨요|생각해요|남아\s*있어요|읽혀요|것입니다|거예요)/gu;
const possibleFeelingPattern =
  /(?:가능성|수\s*있|읽힐|읽힙|읽혀|시사|기울|보일|보입|것\s*같)/u;
const uncertainFeelingPattern =
  /(?:수\s*없|알기?\s*어(?:렵|려)|확인.{0,8}어(?:렵|려)|확정.{0,8}(?:않|못|없)|단정.{0,8}(?:않|못|없)|모르)/u;
const contrastPattern = /(?:지만|으나|반면|다만|그러나|하지만|는데)/u;
const unsafePatterns = [
  /(?:반드시|틀림없이|확실히).{0,32}(?:연락|재회|성공|합격|결혼|일어납니다|됩니다)/u,
  /(?:상대|그 사람).{0,24}(?:분명히|확실히).{0,24}(?:사랑|후회|그리워|마음|감정)/u,
  /(?:다시\s*만나|재회|연락|결혼|합격|성공|돌아오).{0,20}(?:게\s*됩니다|하게\s*됩니다|할\s*것입니다|될\s*것입니다|이\s*옵니다|이\s*올\s*것입니다|합니다|옵니다)/u,
  /우울증|불안\s*장애|공황\s*장애|양극성\s*장애|조울증|주의력\s*결핍|\bADHD\b|정신\s*질환|정신병|성격\s*장애|외상\s*후\s*스트레스|\bPTSD\b/iu,
  /(?:약물|항우울제|정신과|심리\s*치료|상담\s*치료|병원|전문의).{0,24}(?:가세요|받으세요|하세요|해야|필요합니다|권합니다)/u,
  /(?:주식|코인|가상화폐|부동산|투자).{0,24}(?:매수|매도|사세요|파세요|투자하세요)/u,
  /(?:주식|종목|코인|가상화폐|부동산|투자).{0,32}(?:사는|파는|매수|매도|투자).{0,20}(?:정답|해야|권합니다|좋습니다)/u,
  /(?:고소|소송|신고|합의|계약|변호사).{0,32}(?:하는\s*것이\s*(?:정답|좋습니다)|하세요|해야|권합니다|진행하세요|시작하세요)/u,
  /(?:진단|처방|복용|약|수술|치료|병원).{0,32}(?:하는\s*것이\s*(?:정답|좋습니다)|받으세요|하세요|해야|권합니다|필요합니다)/u,
  /(?:진단|처방|복용|변호사|고소|소송).{0,24}(?:받으세요|하세요|해야|권합니다|진행하세요)/u,
  /(?:당장|즉시|오늘 바로|지금 바로).{0,24}(?:연락|퇴사|투자|찾아가|헤어지|결혼)/u,
  /자해|자살|죽는 방법|몰래\s*(?:확인|감시)|미행|강제로/u,
  /역방향|역위치|리버스|뒤집힌\s*카드/u,
  /카드\s*(?:그림|이미지)|그림에서|이미지에서|보이는\s*인물/u,
  /(?:과거|현재|미래|원인|장애물|조언)\s*(?:의\s*)?(?:자리|위치)/u,
] as const;

export function parseInstantReadingRequest(
  value: unknown,
): InstantReadingRequest | undefined {
  if (
    !isRecord(value) ||
    (!hasExactKeys(value, requestKeys) &&
      !hasExactKeys(value, requestKeysWithQuestion))
  ) {
    return undefined;
  }

  if (
    !isAllowedId(value["topicId"], topicIds) ||
    !isAllowedId(value["spreadId"], spreadIds) ||
    !isAllowedId(value["styleId"], readingStyleIds) ||
    !Array.isArray(value["cards"])
  ) {
    return undefined;
  }

  const questionId =
    "questionId" in value &&
    typeof value["questionId"] === "string" &&
    isRelationshipQuestionId(value["questionId"])
      ? value["questionId"]
      : undefined;

  if (
    ("questionId" in value && !questionId) ||
    (questionId &&
      getRelationshipQuestionDefinition(questionId).topicId !==
        value["topicId"])
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
    ...(questionId ? { questionId } : {}),
  };
}

export function parseInstantReadingResponse(
  value: unknown,
  request: InstantReadingRequest,
): InstantReading | undefined {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, responseKeys) ||
    typeof value["text"] !== "string"
  ) {
    return undefined;
  }

  return validateInstantReadingText(value["text"], request);
}

export function validateInstantReadingText(
  input: string,
  request: InstantReadingRequest,
): InstantReading | undefined {
  const text = input.replace(/\r\n?/gu, "\n").trim();
  const totalLength = [...text].length;
  const range =
    request.spreadId === "quick"
      ? { max: 2_000, min: 420 }
      : { max: 3_000, min: 650 };

  if (
    totalLength < range.min ||
    totalLength > range.max ||
    technicalPattern.test(text) ||
    unsafePatterns.some((pattern) => pattern.test(text)) ||
    !hasKoreanMajority(text)
  ) {
    return undefined;
  }

  const markerMatches = text.match(/\[[^\]\n]{1,40}\]/gu) ?? [];
  if (
    markerMatches.length !== instantReadingMarkers.length ||
    !instantReadingMarkers.every(
      (marker, index) => markerMatches[index] === marker,
    )
  ) {
    return undefined;
  }

  const sections = splitSections(text);
  if (!sections) return undefined;

  const overall = sections.get("[전체 흐름]");
  const cards = sections.get("[카드별 흐름]");
  const connection = sections.get("[가장 강한 연결]");
  const firstHypothesis = sections.get("[가능성 A]");
  const secondHypothesis = sections.get("[가능성 B]");
  const reality = sections.get("[현실 확인]");
  const action = sections.get("[다음 행동]");
  const reflection = sections.get("[성찰 질문]");

  const interpretationSections = [overall, firstHypothesis, secondHypothesis];
  const supportingSections = [cards, connection, reality, action, reflection];
  let taxonomy;
  try {
    taxonomy = getReadingTaxonomy(request.topicId, request.questionId);
  } catch {
    return undefined;
  }
  const isRelationshipReading = taxonomy.domainId === "relationship";
  const requiresPossibleAnswer =
    taxonomy.defaultAnswerTargetId === "other-person";
  if (
    (isRelationshipReading &&
      interpretationSections.some(
        (section) =>
          !section ||
          (requiresPossibleAnswer && !possibleFeelingPattern.test(section)) ||
          hasUnsafeHiddenFeelingClaim(section, false, false),
      )) ||
    supportingSections.some(
      (section) => section && hasUnsafeHiddenFeelingClaim(section, true, true),
    )
  ) {
    return undefined;
  }

  if (
    !hasBoundedLength(overall, 40, 420) ||
    !hasBoundedLength(connection, 30, 360) ||
    !hasBoundedLength(firstHypothesis, 25, 320) ||
    !hasBoundedLength(secondHypothesis, 25, 320) ||
    normalizeComparison(firstHypothesis) ===
      normalizeComparison(secondHypothesis) ||
    !hasBoundedLength(reflection, 15, 240) ||
    !/[?？]$/u.test(reflection)
  ) {
    return undefined;
  }

  if (!cards || !hasValidCardLines(cards, request.cards.length)) {
    return undefined;
  }

  if (
    !reality ||
    !hasExactLabelledLines(reality, realityLabels, 15, 280) ||
    !action ||
    !hasExactLabelledLines(action, actionLabels, 15, 280)
  ) {
    return undefined;
  }

  return { text };
}

function hasUnsafeHiddenFeelingClaim(
  value: string,
  allowExplicitUncertainty: boolean,
  requireExplicitSubject: boolean,
) {
  const sentences = value.split(/[.!?！？\n]+/u);
  const hasSectionPossibility = possibleFeelingPattern.test(value);

  return sentences.some((sentence) => {
    if (requireExplicitSubject && !hiddenFeelingSubjectPattern.test(sentence)) {
      return false;
    }

    for (const match of sentence.matchAll(hiddenFeelingClaimPattern)) {
      const assertion = match[0];
      const finalClause = assertion.split(contrastPattern).at(-1) ?? assertion;
      const isPossible = possibleFeelingPattern.test(finalClause);
      const isExplicitlyUncertain = uncertainFeelingPattern.test(finalClause);
      const mayUseUncertainty =
        allowExplicitUncertainty || hasSectionPossibility;
      if (!isPossible && !(mayUseUncertainty && isExplicitlyUncertain)) {
        return true;
      }
    }

    return false;
  });
}

function splitSections(text: string) {
  const lines = text.split("\n");
  const sections = new Map<(typeof instantReadingMarkers)[number], string>();
  let activeMarker: (typeof instantReadingMarkers)[number] | undefined;
  let content: string[] = [];

  const flush = () => {
    if (!activeMarker) return;
    const value = content.join("\n").trim();
    if (!value || sections.has(activeMarker)) return false;
    sections.set(activeMarker, value);
    return true;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if ((instantReadingMarkers as readonly string[]).includes(line)) {
      if (activeMarker && !flush()) return undefined;
      activeMarker = line as (typeof instantReadingMarkers)[number];
      content = [];
      continue;
    }
    if (!activeMarker) return undefined;
    content.push(line);
  }

  if (!flush() || sections.size !== instantReadingMarkers.length) {
    return undefined;
  }
  return sections;
}

function hasValidCardLines(value: string, expectedCount: number) {
  const lines = value.split("\n").filter(Boolean);
  if (lines.length !== expectedCount) return false;

  return lines.every((line, index) => {
    const match = /^(\d+)\.\s+(.+)$/u.exec(line);
    return (
      match?.[1] === String(index + 1) && hasBoundedLength(match[2], 15, 300)
    );
  });
}

function hasExactLabelledLines(
  value: string,
  labels: readonly string[],
  minimum: number,
  maximum: number,
) {
  const lines = value.split("\n").filter(Boolean);
  if (lines.length !== labels.length) return false;

  return lines.every((line, index) => {
    const label = labels[index]!;
    return (
      line.startsWith(label) &&
      hasBoundedLength(line.slice(label.length).trim(), minimum, maximum)
    );
  });
}

function hasKoreanMajority(value: string) {
  const letters = value.match(/[A-Za-z가-힣]/gu) ?? [];
  const korean = value.match(/[가-힣]/gu) ?? [];
  return (
    korean.length >= 80 && korean.length / Math.max(letters.length, 1) >= 0.55
  );
}

function hasBoundedLength(
  value: string | undefined,
  minimum: number,
  maximum: number,
): value is string {
  if (!value) return false;
  const length = [...value].length;
  return length >= minimum && length <= maximum;
}

function normalizeComparison(value: string) {
  return value.toLocaleLowerCase("ko-KR").replace(/[\p{P}\p{S}\s]+/gu, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
