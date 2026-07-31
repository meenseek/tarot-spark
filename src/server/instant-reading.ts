import "server-only";

import {
  getReadingLens,
  getReadingStyle,
  getSpread,
  getSpreadPositions,
  getTopic,
  parseInstantReading,
  type DrawnCard,
  type InstantReadingRequest,
  type InstantReadingV1,
  type LocaleTarotData,
} from "@/domain/tarot";

export const instantReadingSchemaVersion = "instant-reading-v1";
export const instantReadingPromptVersion = "instant-reading-eval-v3";
export const geminiInteractionsApiVersion = "v1";
export const instantReadingRequestTimeoutMs = 12_000;

const defaultModel = "gemini-3.5-flash";
const generationConfig = {
  max_output_tokens: 1800,
  thinking_level: "low",
} as const;
const systemInstruction = [
  "당신은 타로 카드를 미래 예측이나 사실 확인이 아니라 자기 성찰을 위한 상징으로 읽습니다.",
  "제공된 카드, 자리, 주제, 말투 정보만 사용하고 사용자의 개인 상황을 추측하거나 만들어내지 마세요.",
  "상대의 숨은 생각이나 감정, 미래 결과를 안다고 말하지 마세요.",
  "의료, 법률, 재정, 투자, 정신 건강에 관한 진단이나 전문 조언을 하지 마세요.",
  "자해, 강압, 스토킹, 감시, 반복 연락을 행동 방법으로 제안하지 마세요.",
  "불안을 키우거나 결정을 재촉하지 말고, 작고 되돌릴 수 있는 행동만 제안하세요.",
  "자연스러운 한국어로 쓰세요. 번역투, 추상명사 나열, 상투적인 서론과 결론을 피하세요.",
  "'이 카드는'이라는 문장으로 각 단락을 기계적으로 반복하지 마세요.",
  "모델, AI, 프롬프트, JSON, 시스템 지침을 언급하지 마세요.",
  "고정 면책문은 화면에서 따로 제공되므로 답변 안에서 반복하지 마세요.",
].join("\n");

type RequestOptions = {
  readonly apiKey: string;
  readonly fetchImpl?: typeof fetch;
  readonly model?: string;
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

export function isInstantReadingRequestConsistent(
  tarotData: LocaleTarotData,
  request: InstantReadingRequest,
) {
  const { cards } = getRequestMaterials(tarotData, request);

  return (
    getReadingLens(tarotData.readingLenses, request.topicId, cards).id ===
    request.lensId
  );
}

export function buildInstantReadingPrompt(
  tarotData: LocaleTarotData,
  request: InstantReadingRequest,
) {
  const { cards, lens, readingStyle, spread, topic } = getRequestMaterials(
    tarotData,
    request,
  );
  const cardLines = cards.map(({ card, position }) =>
    [
      `- 자리 ID: ${position.id}`,
      `자리 이름: ${position.label}`,
      `카드 ID: ${card.id}`,
      `카드 이름: ${card.name}`,
      `핵심 의미: ${card.upright}`,
      `힘이 되는 면: ${card.light}`,
      `조심할 면: ${card.shadow}`,
      `지금 바꿀 수 있는 것: ${card.agency}`,
      `섣불리 단정하지 말 것: ${card.caution}`,
      `이 자리에서 읽을 방향: ${card.promptAngle}`,
    ].join(" / "),
  );
  const positionLengthGuide = cards.length === 3 ? "70~90자" : "45~60자";

  return [
    `주제: ${topic.label}`,
    `주제에서 살펴볼 점: ${topic.promptLead}`,
    `배열: ${spread.label}`,
    `답변 분위기: ${readingStyle.label}`,
    `말투 안내: ${readingStyle.instruction}`,
    `이번에 눈여겨볼 점: ${lens.label}`,
    `해석 안내: ${lens.instruction}`,
    "사용자가 따로 적은 개인 상황은 없으며, 개인 상황을 추측해서 채우면 안 됩니다.",
    "뽑힌 카드:",
    ...cardLines,
    "",
    "작성 기준:",
    "- 사용자에게 보이는 일곱 텍스트 영역을 합쳐 공백 포함 한국어 600~800자로 맞추고, 절대 900자를 넘기지 마세요.",
    `- headline 15~30자, synthesis 80~110자, 각 interpretation ${positionLengthGuide}, strongestConnection.explanation 60~90자, uncertainty 45~70자, nextStep 40~60자, reflection 30~50자를 목표로 쓰세요.`,
    "- 모든 카드와 자리를 빠짐없이 사용하고 입력된 순서를 지키세요.",
    "- positionReadings의 각 항목은 위 순서의 positionId와 cardId 쌍을 그대로 복사하세요. 다른 자리의 cardId를 반복하거나 바꾸면 안 됩니다.",
    "- strongestConnection.cardIds에는 위 카드 중 가장 뚜렷하게 연결되는 서로 다른 카드 두 장 이상만 넣으세요.",
    "- 카드 뜻을 따로 나열하지 말고, 카드들이 힘을 보태거나 부딪히거나 이어지는 흐름을 설명하세요.",
    "- uncertainty에는 카드만으로 알 수 없고 사용자가 직접 확인해야 하는 부분을 쓰세요.",
    "- 확인할 수 없는 개인 사정은 만들지 말고, 여러 상황에 적용할 수 있는 범위에서 구체적으로 쓰세요.",
    "- nextStep에는 작고 되돌릴 수 있는 행동 한 가지만 제시하세요.",
    "- reflection에는 앞선 내용을 되풀이하지 않는 구체적인 질문 한 개를 쓰세요.",
  ].join("\n");
}

export function buildGeminiInteractionBody(
  tarotData: LocaleTarotData,
  request: InstantReadingRequest,
  model = process.env["TAROT_READING_MODEL"]?.trim() || defaultModel,
) {
  const positionLengthDescription =
    request.cards.length === 3
      ? "이 자리와 카드가 전체 흐름에 보태는 의미를 한국어 70~90자로 작성"
      : "이 자리와 카드가 전체 흐름에 보태는 의미를 한국어 45~60자로 작성";
  const positionReadings = request.cards.map(({ cardId, positionId }) => ({
    type: "object",
    additionalProperties: false,
    properties: {
      positionId: { type: "string", enum: [positionId] },
      cardId: { type: "string", enum: [cardId] },
      interpretation: {
        type: "string",
        description: positionLengthDescription,
      },
    },
    required: ["positionId", "cardId", "interpretation"],
  }));

  return {
    model,
    input: buildInstantReadingPrompt(tarotData, request),
    system_instruction: systemInstruction,
    store: false,
    generation_config: generationConfig,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          headline: {
            type: "string",
            description: "리딩의 핵심을 짧고 자연스럽게 여는 한국어 제목",
          },
          synthesis: {
            type: "string",
            description: "모든 카드와 자리를 아우르는 한국어 요약",
          },
          positionReadings: {
            type: "array",
            prefixItems: positionReadings,
            minItems: request.cards.length,
            maxItems: request.cards.length,
          },
          strongestConnection: {
            type: "object",
            additionalProperties: false,
            properties: {
              relationType: {
                type: "string",
                enum: [
                  "reinforcement",
                  "tension",
                  "progression",
                  "integration",
                ],
              },
              cardIds: {
                type: "array",
                minItems: 2,
                maxItems: request.cards.length,
                items: {
                  type: "string",
                  enum: request.cards.map(({ cardId }) => cardId),
                },
              },
              explanation: {
                type: "string",
                description: "선택한 카드들이 가장 뚜렷하게 이어지는 이유",
              },
            },
            required: ["relationType", "cardIds", "explanation"],
          },
          uncertainty: {
            type: "string",
            description: "카드만으로 알 수 없거나 직접 확인해야 하는 부분",
          },
          nextStep: {
            type: "string",
            description: "사용자가 작고 되돌릴 수 있게 시도할 행동 한 가지",
          },
          reflection: {
            type: "string",
            description: "앞선 내용을 되풀이하지 않는 구체적인 질문 한 개",
          },
        },
        required: [
          "headline",
          "synthesis",
          "positionReadings",
          "strongestConnection",
          "uncertainty",
          "nextStep",
          "reflection",
        ],
      },
    },
  };
}

export async function requestInstantReading(
  tarotData: LocaleTarotData,
  request: InstantReadingRequest,
  {
    apiKey,
    fetchImpl = fetch,
    model = process.env["TAROT_READING_MODEL"]?.trim() || defaultModel,
    timeoutMs = instantReadingRequestTimeoutMs,
  }: RequestOptions,
): Promise<InstantReadingV1> {
  const response = await fetchImpl(
    `https://generativelanguage.googleapis.com/${geminiInteractionsApiVersion}/interactions`,
    {
      body: JSON.stringify(
        buildGeminiInteractionBody(tarotData, request, model),
      ),
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      method: "POST",
      signal: AbortSignal.timeout(timeoutMs),
    },
  );

  if (!response.ok) {
    throw new InstantReadingProviderError(response.status);
  }

  let providerPayload: unknown;
  try {
    providerPayload = await response.json();
  } catch {
    throw new InstantReadingResponseError();
  }

  const text = extractInteractionText(providerPayload);
  if (!text) {
    throw new InstantReadingResponseError();
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new InstantReadingResponseError();
  }

  const reading = parseInstantReading(value, request);
  if (!reading) {
    throw new InstantReadingResponseError();
  }

  return reading;
}

function getRequestMaterials(
  tarotData: LocaleTarotData,
  request: InstantReadingRequest,
) {
  const topic = getTopic(tarotData.topics, request.topicId);
  const spread = getSpread(tarotData.spreads, request.spreadId);
  const readingStyle = getReadingStyle(
    tarotData.readingStyles,
    request.styleId,
  );
  const lens = tarotData.readingLenses.find(
    (candidate) => candidate.id === request.lensId,
  );
  const positions = getSpreadPositions(spread, tarotData.spreadPositions);
  const cards: DrawnCard[] = request.cards.map((input, index) => {
    const position = positions[index];
    const card = tarotData.cards.find(
      (candidate) => candidate.id === input.cardId,
    );

    if (!position || position.id !== input.positionId || !card) {
      throw new RangeError(
        "Instant reading request contains unknown tarot data.",
      );
    }

    return { card, position };
  });

  if (!lens) {
    throw new RangeError("Instant reading request contains an unknown lens.");
  }

  return { cards, lens, readingStyle, spread, topic };
}

function extractInteractionText(payload: unknown) {
  if (!isRecord(payload) || !Array.isArray(payload["steps"])) {
    return undefined;
  }

  for (const step of payload["steps"].toReversed()) {
    if (
      !isRecord(step) ||
      step["type"] !== "model_output" ||
      !Array.isArray(step["content"])
    ) {
      continue;
    }

    for (const content of step["content"].toReversed()) {
      if (
        isRecord(content) &&
        content["type"] === "text" &&
        typeof content["text"] === "string"
      ) {
        return content["text"];
      }
    }
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
