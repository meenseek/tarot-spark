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
  getPublicQuestionDefinition,
  isPublicQuestionId,
  type PublicQuestionId,
  type ReadingTaxonomy,
} from "./taxonomy";

export type InstantReadingCardInput = {
  readonly cardId: TarotCardId;
};

export type InstantReadingRequest = {
  readonly topicId: TopicId;
  readonly spreadId: SpreadId;
  readonly styleId: ReadingStyleId;
  readonly cards: readonly InstantReadingCardInput[];
  readonly questionId?: PublicQuestionId;
};

export type InstantReading = {
  readonly text: string;
};

export function isInstantReadingTaxonomyEligible(
  taxonomy: ReadingTaxonomy,
): boolean {
  return taxonomy.domainId === "relationship" || taxonomy.domainId === "career";
}

const requestKeys = ["topicId", "spreadId", "styleId", "cards"] as const;
const requestKeysWithQuestion = [...requestKeys, "questionId"] as const;
const cardInputKeys = ["cardId"] as const;
const responseKeys = ["text"] as const;
const technicalPattern =
  /```|<\/?[a-z][^>]*>|\bJSON\b|프롬프트|시스템\s*메시지|언어\s*모델|인공지능|\bAI\b/iu;
const exposedReadingMethodPattern =
  /(?:이|뽑힌|주어진|첫(?:\s*번째)?|두\s*번째|세\s*번째|네\s*번째|다섯\s*번째|여섯\s*번째|다음|이어지는|마지막)\s*카드|(?:첫\s*번째|두\s*번째|세\s*번째|네\s*번째|다섯\s*번째|여섯\s*번째|다음|이어지는|마지막)\s*(?:뜻|의미)|(?:이|이번)\s*리딩/u;
const worksheetPattern =
  /^\s*(?:\[(?:전체 흐름|카드별 흐름|가장 강한 연결|가능성 [AB]|현실 확인|다음 행동|성찰 질문)\]|(?:가능성 [AB]|아직 모르는 점|관찰할 점|다시 볼 조건|작은 행동|멈추거나 다시 볼 조건)\s*:|(?:\d+[.)]|[-*•])\s)/mu;
const verifiedPrivateFactPattern =
  /(?:카드|타로)(?:로|가|는|에서)[^.!?！？\n]{0,40}(?:실제\s*(?:마음|감정|생각|(?:업무\s*)?평가|판단|기대|신뢰)|속마음)[^.!?！？\n]{0,20}(?:확인했|알아냈|증명|사실입니다)|(?:실제\s*(?:마음|감정|생각|(?:업무\s*)?평가|판단|기대|신뢰)|속마음)[^.!?！？\n]{0,24}(?:카드|타로)(?:로|가)[^.!?！？\n]{0,16}(?:확인|증명)/u;
const explicitMindVerificationPattern =
  /(?:속마음|실제\s*(?:마음|감정|생각|(?:업무\s*)?평가|판단|기대|신뢰)|(?:사랑|좋아)[^.!?！？\n]{0,12}사실)[^.!?！？\n]{0,36}(?:확인(?:했|됐|되었|해\s*줬|한\s*(?:결과|사실))|증명(?:했|됐|해))/u;
const affirmativeTarotProofPattern =
  /(?:카드|타로)(?:로|가|는|에서)[^.!?！？\n]{0,40}(?:마음|감정|생각|(?:업무\s*)?평가|판단|기대|신뢰)[^.!?！？\n]{0,20}(?:확인(?:했습니다|했어요|해\s*줬(?:습니다|어요))|알아냈(?:습니다|어요)|(?:증명|입증)(?:합니다|해요|했습니다|했어요|됐습니다|됐어요))(?=\s*(?:[,.!?！？]|$))/u;
const refusalOverridePattern =
  /(?:거절|연락하지\s*말라는|싫다는)[^.!?！？\n]{0,20}(?:무시|상관없이|관계없이)[^.!?！？\n]{0,24}(?:연락|찾아가)[^.!?！？\n]{0,12}(?:보세요|하세요|해야|권합니다)/u;

const inventedPositionPattern =
  /(?:첫(?:\s*번째)?|두\s*번째|세\s*번째|네\s*번째|다섯\s*번째|여섯\s*번째|[1-6]번)\s*(?:카드|자리)[^.!?！？\n]{0,20}(?:과거|현재|미래|원인|장애물|조언)(?:의\s*)?(?:를|을|자리|위치|입니다|이에요|예요)/u;
const coercionPattern =
  /(?:거절|싫다고|답이\s*없)[^.!?！？\n]{0,16}(?:해도|했어도|했지만|어도)[^.!?！？\n]{0,24}(?:계속|반복|다시)[^.!?！？\n]{0,16}(?:연락(?:해\s*보세요|하세요|해야|해도\s*(?:돼요|됩니다))|찾아가(?:\s*보세요|세요|야))|(?:동의\s*없이|몰래)[^.!?！？\n]{0,24}(?:추적|비밀번호|계정|위치|사진|감시)[^.!?！？\n]{0,20}(?:하세요|해\s*보세요|해야)/u;
const certainOutcomePattern =
  /(?:합격|승진|채용|재회|결혼)(?:합니다|하게\s*됩니다|할\s*(?:겁니다|거예요))|(?:합격|승진|채용|재회|결혼|연락|수익)[^.!?！？\n]{0,20}이미\s*(?:결정|정해)[^.!?！？\n]{0,12}(?:습니다|예요)/u;

const datedContactPredictionPattern =
  /(?:상대|그\s*사람)(?:은|는|가|이)?\s*(?:내일|모레|(?:이번|다음)\s*(?:주|달|월)|\d+\s*(?:일|주|달)\s*(?:뒤|후))(?:에|에는|에도|쯤|안에)?\s*(?:(?:먼저|다시|당신에게)\s*){0,2}연락(?:합니다|해요|할\s*(?:겁니다|거예요)|하게\s*됩니다)/u;
const timeBeforeActorContactPredictionPattern =
  /(?:내일|모레|(?:이번|다음)\s*(?:주|달|월)|\d+\s*(?:일|주|달)\s*(?:뒤|후))(?:에|에는|에도|쯤|안에)?\s*(?:상대|그\s*사람)(?:은|는|가|이)?\s*(?:(?:먼저|다시|당신에게)\s*){0,2}연락(?:합니다|해요|할\s*(?:겁니다|거예요)|하게\s*됩니다)/u;
const legalActionDirectivePattern =
  /(?:(?:합의서|계약서|계약)[^.!?！？\n]{0,32}(?:서명|날인|체결)|변호사[^.!?！？\n]{0,24}선임|(?:고소|소송|법적\s*합의)[^.!?！？\n]{0,24}(?:제기|진행|시작))(?:하세요|해야\s*(?:합니다|해요)|하는\s*것이\s*(?:정답입니다|좋습니다|좋아요)|(?:을|를)\s*권합니다)(?=\s*(?:[.!?！？]|$))/u;

const urgentChoicePattern =
  /(?:당장|즉시|오늘\s*바로|지금\s*바로)[^.!?！？\n]{0,24}(?:찾아가|헤어지|퇴사|투자|결혼)[^.!?！？\n]{0,12}(?:하세요|해야|해요|권합니다)/u;

const medicationNounEndSource = String.raw`(?=(?:은|는|이|가|을|를|의|도|만|부터|까지|으로)?(?:\s|$|[,.!?]|중단|변경|조절|증량|감량|복용|투약|먹|드))`;
const ordinaryYakNounSource = String.raw`(?:[가-힣]*(?:(?:예약|청약)(?:제)?|요약|활약)|절약|기약|도약|비약|서약|언약|공약|조약|협약|계약|특약|제약|집약|축약)`;
const medicationNounSource = String.raw`(?<![가-힣])(?!${ordinaryYakNounSource}${medicationNounEndSource})[가-힣]*약(?:물|제)?${medicationNounEndSource}`;
const borrowingDirectivePattern =
  /(?:대출|차입|빚|돈|자금)[^.!?！？\n]{0,32}(?:받아\s*보세요|받으세요|받아야|내\s*보세요|내세요|빌려\s*보세요|빌리세요|신청하세요|(?:받는|내는|빌리는)\s*(?:게|것이)\s*(?:좋|낫))/u;

const medicationChangePattern = new RegExp(
  String.raw`(?:복용|처방약|약물|${medicationNounSource})[^.!?！？\n]{0,64}(?:끊으세요|줄이세요|늘리세요|멈추세요|바꾸세요|끊어\s*보세요|줄여\s*보세요|늘려\s*보세요|멈춰\s*보세요|바꿔\s*보세요|(?:중단|변경|조절|감량|증량)(?:하세요|해\s*보세요))`,
  "u",
);

const unsafePatterns = [
  /(?:반드시|틀림없이|확실히).{0,32}(?:연락|재회|성공|합격|결혼|일어납니다|됩니다)/u,
  /(?:반드시|틀림없이|확실히).{0,32}(?:승진|채용|퇴사|연봉|수익)/u,
  /(?:합격|승진|채용|퇴사|연봉|수익).{0,24}(?:보장|확정|할\s*것입니다|될\s*것입니다|하게\s*됩니다|오를\s*것입니다|이미\s*정해졌)/u,
  /(?:상대|그 사람).{0,24}(?:분명히|확실히)(?!\s*(?:알|확인할)\s*수\s*없|\s*보고\s*판단하려는\s*마음이\s*있(?:어요|습니다)(?:[.!?！？]|$)).{0,24}(?:사랑|후회|그리워|(?:마음|감정)(?:(?:이|은|도)?\s*(?:(?:이미|아직|여전히|전혀|조금도|더는|완전히)\s*){0,2}(?:있|없|남|생|향|커|깊|강|식|사라|떠|끝|정리)|(?:을|를)\s*(?:갖|가지|품|접|정리)))/u,
  /(?:다시\s*만나|재회|연락|결혼|합격|성공|돌아오).{0,20}(?:게\s*됩니다|하게\s*됩니다|할\s*것입니다|될\s*것입니다|이\s*옵니다|이\s*올\s*것입니다)/u,
  /우울증|불안\s*장애|공황\s*장애|양극성\s*장애|조울증|주의력\s*결핍|\bADHD\b|정신\s*질환|정신병|성격\s*장애|외상\s*후\s*스트레스|\bPTSD\b/iu,
  /(?:약물|항우울제|정신과|심리\s*치료|상담\s*치료|병원|전문의).{0,24}(?:가세요|받으세요|하세요|해야|필요합니다|권합니다)/u,
  /(?:주식|코인|가상화폐|부동산|투자).{0,24}(?:매수|매도|사세요|파세요|투자하세요)/u,
  /(?:주식|종목|코인|가상화폐|부동산|투자).{0,32}(?:사는|파는|매수|매도|투자).{0,20}(?:정답|해야|권합니다|좋습니다)/u,
  new RegExp(
    String.raw`(?:진단|처방|복용|${medicationNounSource}|수술|치료|병원).{0,32}(?:하는\s*것이\s*(?:정답|좋습니다)|받으세요|하세요|해야|권합니다|필요합니다)`,
    "u",
  ),
  /약(?:물|제)?(?:을|를|은|는|도|만)?\s*(?:(?:지금|오늘|먼저|계속|바로|꼭|반드시|다시|한\s*번)\s*){0,2}(?:먹(?:으세요|어\s*보세요|지\s*마세요)|드(?:세요|시(?:세요|지\s*마세요))|복용(?:하세요|해\s*보세요|하지\s*마세요))/u,
  /(?:진단|처방|복용|고소|소송).{0,24}(?:받으세요|하세요|해야|권합니다|진행하세요)/u,
  /자해|자살|죽는 방법|몰래\s*(?:확인|감시)|미행|강제로/u,
  /역방향|역위치|리버스|뒤집힌\s*카드/u,
  /카드\s*(?:그림|이미지)|그림에서|이미지에서|보이는\s*인물/u,
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
    isPublicQuestionId(value["questionId"])
      ? value["questionId"]
      : undefined;

  if (
    ("questionId" in value && !questionId) ||
    (questionId &&
      getPublicQuestionDefinition(questionId).topicId !== value["topicId"])
  ) {
    return undefined;
  }

  let taxonomy: ReadingTaxonomy;
  try {
    taxonomy = getReadingTaxonomy(value["topicId"], questionId);
  } catch {
    return undefined;
  }
  if (!isInstantReadingTaxonomyEligible(taxonomy)) return undefined;

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
  if (!parseInstantReadingRequest(request)) return undefined;
  const text = input.replace(/\r\n?/gu, "\n").trim();
  const length = [...text].length;
  const range =
    request.spreadId === "quick"
      ? { min: 120, max: 1_600 }
      : { min: 220, max: 2_400 };
  const letters = text.match(/[A-Za-z가-힣]/gu) ?? [];
  const korean = text.match(/[가-힣]/gu) ?? [];

  if (
    length < range.min ||
    length > range.max ||
    korean.length < 60 ||
    korean.length / Math.max(letters.length, 1) < 0.55 ||
    technicalPattern.test(text) ||
    exposedReadingMethodPattern.test(text) ||
    worksheetPattern.test(text) ||
    unsafePatterns.some((pattern) => pattern.test(text)) ||
    verifiedPrivateFactPattern.test(text) ||
    explicitMindVerificationPattern.test(text) ||
    affirmativeTarotProofPattern.test(text) ||
    medicationChangePattern.test(text) ||
    borrowingDirectivePattern.test(text) ||
    refusalOverridePattern.test(text) ||
    certainOutcomePattern.test(text) ||
    datedContactPredictionPattern.test(text) ||
    timeBeforeActorContactPredictionPattern.test(text) ||
    legalActionDirectivePattern.test(text) ||
    inventedPositionPattern.test(text) ||
    coercionPattern.test(text) ||
    urgentChoicePattern.test(text)
  ) {
    return undefined;
  }

  // The genre is established by the reading UI and shared writing instructions.
  // Quality, question relevance and symbolism need content review, not a grammar
  // that forces every emotional clause into the same uncertainty formula.
  return { text };
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
