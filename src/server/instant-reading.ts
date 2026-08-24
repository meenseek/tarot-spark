import "server-only";

import {
  getAnswerTarget,
  getReadingTaxonomy,
  getReadingStyle,
  getSpread,
  getTopic,
  validateInstantReadingText,
  type InstantReadingRequest,
  type InstantReading,
  type LocaleTarotData,
} from "@/domain/tarot";
import { getPublicQuestionCatalog } from "@/features/reading-questions";
import {
  cloudflareInstantReadingModel,
  type InstantReadingProviderConfig,
} from "./instant-reading-config";

export const instantReadingRequestTimeoutMs = 20_000;
export const maximumInstantReadingProviderBytes = 32_768;
export const instantReadingGenerationConfig = {
  max_tokens: 1_400,
  stream: false,
  temperature: 0.3,
  top_p: 0.9,
} as const;

const instantReadingSystemInstruction = `당신은 한국어 타로 성찰문을 작성합니다.
카드 뜻은 현실의 사실이나 타인의 속마음에 대한 증거가 아니라 상징적 재료입니다.
의료·법률·재정·투자·정신건강 조언, 확정적 예측, 긴급하거나 되돌릴 수 없는 행동을 제안하지 마세요.
합격·채용·승진·퇴사·연봉·수익을 확정하거나 보장하지 말고, 커리어 질문은 확인할 근거·선택의 대가·경계·작고 되돌릴 수 있는 시도로 연결하세요.
카드 그림, 카드명, 역방향, 임의의 자리 의미, 사용자 개인정보를 추측하지 마세요.
사용자가 지금 무엇을 하거나 느끼는지 아는 것처럼 서술하지 마세요. 대신 질문의 핵심에 대해 카드 의미가 가장 강하게 시사하는 상징적 답을 먼저 제시하세요.
입력의 답변 초점이나 질문이 타인의 시선을 직접 묻는다면, 제공된 의미가 뒷받침하는 범위에서 질문이 실제로 묻는 인상을 직접 읽으세요. 관계 질문은 대인 인상·상호 인식·호감·연애적 관심·망설임 중 해당 항목을 따르되, 질문에 없는 호감 해석을 덧붙이지 마세요. 커리어 질문은 업무상 평가·신뢰·기대 중 해당 항목을 따르세요. '카드상 ... 가능성에 무게가 실립니다', '... 쪽으로 읽힐 수 있습니다'처럼 각 주장에 가능성을 드러내고 현실의 사실처럼 단정하지 마세요.
입력에 없는 사건, 상대의 행동, 직장 변화, 관계 상태나 괄호 속 예시를 만들지 마세요.
모든 문장은 자연스러운 존댓말 문장으로 완결하세요.
아래 표식과 순서를 정확히 한 번씩 사용하고 다른 머리말이나 맺음말은 쓰지 마세요.
[전체 흐름]
[카드별 흐름]
[가장 강한 연결]
[가능성 A]
[가능성 B]
[현실 확인]
[다음 행동]
[성찰 질문]
전체 흐름은 질문에 대한 카드상 답으로 시작하세요. 답변 초점이나 질문이 타인의 시선을 가리킨다면 첫 두 문장 안에 관계에서는 질문이 묻는 대인 인상·상호 인식·감정·연애적 관심·망설임을, 커리어에서는 질문이 묻는 업무상 평가·신뢰·기대를 가능성으로 직접 말하고, '알 수 없으니 행동을 보라'는 말로 대신하지 마세요.
카드별 흐름에는 입력된 의미 수만큼 번호와 문장 한 줄을 순서대로 쓰세요. '1. 내용:'처럼 '내용'이라는 단어를 쓰지 말고 '1. 이 의미는 ...을 점검하는 관점입니다.'처럼 이 주제에 적용하세요.
가장 강한 연결은 미래 결과를 말하지 말고 두 의미가 무엇을 함께 보게 하는지 설명하세요.
가능성 A는 '한 가지 해석은 ...일 수 있다는 것입니다.', 가능성 B는 '다른 해석은 ...일 수 있다는 것입니다.'로 시작하세요. 둘은 같은 카드 의미에 근거하지만 결론이 다른 상징적 해석이어야 합니다. 타인의 시선이 초점이면 관계에서는 질문에 맞는 서로 다른 대인 인상·상호 인식·감정적 또는 관계적 태도, 커리어에서는 서로 다른 업무상 인식·평가를 설명하세요. 관계가 초점이면 서로 다른 상호작용이나 관계 패턴, 독자가 초점이면 서로 다른 감정·기대·선택의 해석을 설명하세요. 입력에 없는 사례를 붙이지 말며, 둘 다 일부 맞거나 모두 틀릴 수 있게 쓰세요.
현실 확인에는 '아직 모르는 점:', '관찰할 점:', '다시 볼 조건:'을 각각 한 줄로 쓰세요. 모르는 점은 카드로 확인할 수 없는 사실, 관찰할 점은 말·행동·약속처럼 직접 확인할 신호, 다시 볼 조건은 어떤 새 사실이 A나 B의 비중을 바꾸거나 둘 다 버리게 하는지 완전한 문장으로 쓰세요.
다음 행동에는 '작은 행동:', '멈추거나 다시 볼 조건:'을 각각 한 줄로 쓰세요. 작은 행동은 '독자는 ...합니다' 같은 평서형이 아니라 '...해 보세요' 또는 '...하세요'처럼 독자에게 제안하는 권유형 한 문장으로 쓰고, 작고 되돌릴 수 있어야 합니다. 타인의 감정이나 관계 상태를 사실·확실한 것으로 받아들이거나 믿으라고 하지 마세요. 중단 조건에는 상대의 반응과 무관하게 적용할 수 있는 구체적인 기간·비용·경계 중 하나를 반드시 명시하세요.
중단 조건은 단순히 다시 확인하라는 말로 끝내지 말고 반드시 '...이면 이 행동을 멈추고 다시 판단하세요.'로 끝내세요.
성찰 질문은 양자택일로 몰지 않는 질문 하나로 쓰고 물음표로 끝내세요.`;

type RequestOptions = {
  readonly providerConfig: InstantReadingProviderConfig;
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
};

export class InstantReadingProviderError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Instant reading provider failed with HTTP ${status}.`);
    this.name = "InstantReadingProviderError";
    this.status = status;
  }
}

export class InstantReadingResponseError extends Error {
  constructor() {
    super("Instant reading provider returned an invalid response.");
    this.name = "InstantReadingResponseError";
  }
}

export class InstantReadingTimeoutError extends Error {
  constructor() {
    super("Instant reading provider timed out.");
    this.name = "InstantReadingTimeoutError";
  }
}

export class InstantReadingAbortedError extends Error {
  constructor() {
    super("Instant reading request was aborted.");
    this.name = "InstantReadingAbortedError";
  }
}

export function isInstantReadingRequestConsistent(
  tarotData: LocaleTarotData,
  request: InstantReadingRequest,
) {
  try {
    getRequestMaterials(tarotData, request);
    return true;
  } catch {
    return false;
  }
}

export function buildInstantReadingPrompt(
  tarotData: LocaleTarotData,
  request: InstantReadingRequest,
) {
  const materials = getRequestMaterials(tarotData, request);
  const meaningLines = materials.cardMeanings
    .map((meaning, index) => `의미 ${index + 1}: ${meaning}`)
    .join("\n");

  return [
    "아래 공개 설정과 검토된 카드 의미만 사용해 하나의 한국어 성찰문을 작성하세요.",
    `주제: ${materials.topicLabel}`,
    `질문의 초점: ${materials.promptLead}`,
    `답변의 기본 초점: ${materials.answerTargetInstruction}`,
    `카드 수: ${materials.spreadLabel}`,
    `답변 분위기: ${materials.styleLabel}`,
    `분위기 지침: ${materials.styleInstruction}`,
    "카드 의미:",
    meaningLines,
    "모든 의미를 입력 순서대로 현재 주제에 적용하고, 사전식 뜻풀이를 반복하지 마세요.",
    "카드별 문장은 번호 다음에 바로 쓰고 '내용:'이라는 단어를 출력하지 마세요.",
    "사용자의 현재 상태를 사실처럼 서술하거나 입력에 없는 구체적인 사례를 만들지 마세요.",
    "가장 강한 보강·긴장·진행·통합 관계 하나를 골라 질문에 대한 상징적 답을 먼저 제시하세요. 답변 초점이나 공개 질문이 타인의 시선을 가리키면 관계에서는 질문이 묻는 대인 인상·상호 인식·호감·연애적 관심·망설임을, 커리어에서는 질문이 묻는 업무상 평가·신뢰·기대를 가능성으로 직접 읽으세요. 질문에 없는 호감 해석을 덧붙이지 마세요.",
    "같은 의미에 근거한 비예측적 해석 두 개를 비교하고, 답변의 기본 초점과 공개 질문이 실제로 묻는 대상을 따르세요.",
    "상징적 답 뒤에 현실에서 직접 확인할 신호와 어느 해석의 비중을 바꿀지 판단할 새 근거를 구체적으로 분리하세요.",
    "작은 행동은 '독자는 ...합니다' 같은 평서형이 아니라 '...해 보세요' 또는 '...하세요'처럼 독자에게 제안하는 권유형 한 문장으로 쓰세요. 타인의 감정이나 관계 상태를 사실·확실한 것으로 받아들이거나 믿으라고 하지 마세요.",
    "작고 되돌릴 수 있는 행동 하나와 기간·비용·경계 중 하나가 명시된 독립적인 중단 조건을 제시하고, 중단 문장은 '이면 이 행동을 멈추고 다시 판단하세요.'로 끝내세요.",
  ].join("\n");
}

export function buildCloudflareInstantReadingBody(
  tarotData: LocaleTarotData,
  request: InstantReadingRequest,
) {
  return {
    ...instantReadingGenerationConfig,
    messages: [
      { content: instantReadingSystemInstruction, role: "system" },
      { content: buildInstantReadingPrompt(tarotData, request), role: "user" },
    ],
  };
}

export function getCloudflareInstantReadingUrl(accountId: string) {
  return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
    accountId,
  )}/ai/run/${cloudflareInstantReadingModel}`;
}

export async function requestInstantReading(
  tarotData: LocaleTarotData,
  request: InstantReadingRequest,
  {
    providerConfig,
    fetchImpl = fetch,
    signal: callerSignal,
    timeoutMs = instantReadingRequestTimeoutMs,
  }: RequestOptions,
): Promise<InstantReading> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
  const signal = callerSignal
    ? AbortSignal.any([callerSignal, timeoutController.signal])
    : timeoutController.signal;

  try {
    const response = await fetchImpl(
      getCloudflareInstantReadingUrl(providerConfig.accountId),
      {
        body: JSON.stringify(
          buildCloudflareInstantReadingBody(tarotData, request),
        ),
        headers: {
          Authorization: `Bearer ${providerConfig.apiToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        signal,
      },
    );

    if (!response.ok) {
      void response.body?.cancel();
      throw new InstantReadingProviderError(response.status);
    }

    const responseText = await readBoundedResponseText(
      response,
      maximumInstantReadingProviderBytes,
    );
    let payload: unknown;
    try {
      payload = JSON.parse(responseText);
    } catch {
      throw new InstantReadingResponseError();
    }

    const text = extractCloudflareResponse(payload);
    if (!text) throw new InstantReadingResponseError();

    const reading = validateInstantReadingText(text, request);
    if (!reading) throw new InstantReadingResponseError();
    return reading;
  } catch (error) {
    if (
      error instanceof InstantReadingProviderError ||
      error instanceof InstantReadingResponseError
    ) {
      throw error;
    }
    if (callerSignal?.aborted) throw new InstantReadingAbortedError();
    if (timeoutController.signal.aborted) {
      throw new InstantReadingTimeoutError();
    }
    throw new InstantReadingProviderError(0);
  } finally {
    clearTimeout(timeoutId);
  }
}

type InstantReadingPromptMaterials = {
  readonly answerTargetInstruction: string;
  readonly cardMeanings: readonly string[];
  readonly promptLead: string;
  readonly spreadLabel: string;
  readonly styleInstruction: string;
  readonly styleLabel: string;
  readonly topicLabel: string;
};

function getRequestMaterials(
  tarotData: LocaleTarotData,
  request: InstantReadingRequest,
): InstantReadingPromptMaterials {
  const topic = getTopic(tarotData.topics, request.topicId);
  const spread = getSpread(tarotData.spreads, request.spreadId);
  const readingStyle = getReadingStyle(
    tarotData.readingStyles,
    request.styleId,
  );
  const question = request.questionId
    ? getPublicQuestionCatalog("ko").questions.find(
        (candidate) => candidate.id === request.questionId,
      )
    : undefined;

  if (request.questionId && (!question || question.topicId !== topic.id)) {
    throw new RangeError(
      "Instant reading request contains an incompatible question.",
    );
  }
  if (request.cards.length !== spread.cardCount) {
    throw new RangeError("Instant reading request has the wrong card count.");
  }

  const cardMeanings = request.cards.map(({ cardId }) => {
    const card = tarotData.cards.find((candidate) => candidate.id === cardId);
    if (!card) {
      throw new RangeError("Instant reading request contains an unknown card.");
    }
    return card.meaning;
  });
  const taxonomy = getReadingTaxonomy(topic.id, request.questionId);
  const answerTarget = getAnswerTarget(
    tarotData.answerTargets,
    taxonomy.defaultAnswerTargetId,
  );

  return {
    answerTargetInstruction: answerTarget.instruction,
    cardMeanings,
    promptLead: question?.focus ?? topic.promptLead,
    spreadLabel: spread.label,
    styleInstruction: readingStyle.instruction,
    styleLabel: readingStyle.label,
    topicLabel: topic.label,
  };
}

function extractCloudflareResponse(payload: unknown) {
  if (
    !isRecord(payload) ||
    payload["success"] !== true ||
    !isRecord(payload["result"]) ||
    typeof payload["result"]["response"] !== "string"
  ) {
    return undefined;
  }

  return payload["result"]["response"];
}

async function readBoundedResponseText(
  response: Response,
  maximumBytes: number,
) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    void response.body?.cancel();
    throw new InstantReadingResponseError();
  }
  if (!response.body) throw new InstantReadingResponseError();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw new InstantReadingResponseError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
