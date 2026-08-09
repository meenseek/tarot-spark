import "server-only";

import {
  buildInstantReadingContractPrompt,
  buildInstantReadingResponseSchema,
  getReadingStyle,
  getSpread,
  getTopic,
  instantReadingGenerationConfig,
  instantReadingSystemInstruction,
  parseInstantReadingProviderResponse,
  type InstantReadingPromptMaterials,
  type InstantReadingRequest,
  type InstantReading,
  type LocaleTarotData,
} from "@/domain/tarot";
import { getRelationshipQuestionCatalog } from "@/features/relationship-questions";

export const geminiInteractionsApiVersion = "v1";
export const instantReadingRequestTimeoutMs = 12_000;

const defaultModel = "gemini-3.5-flash";

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
  return buildInstantReadingContractPrompt(
    getRequestMaterials(tarotData, request),
  );
}

export function buildGeminiInteractionBody(
  tarotData: LocaleTarotData,
  request: InstantReadingRequest,
  model = process.env["TAROT_READING_MODEL"]?.trim() || defaultModel,
) {
  return {
    model,
    input: buildInstantReadingPrompt(tarotData, request),
    system_instruction: instantReadingSystemInstruction,
    store: false,
    generation_config: instantReadingGenerationConfig,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: buildInstantReadingResponseSchema(request.cards.length),
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
): Promise<InstantReading> {
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

  if (!response.ok) throw new InstantReadingProviderError(response.status);

  let providerPayload: unknown;
  try {
    providerPayload = await response.json();
  } catch {
    throw new InstantReadingResponseError();
  }

  if (
    isRecord(providerPayload) &&
    typeof providerPayload["status"] === "string" &&
    providerPayload["status"] !== "completed"
  ) {
    throw new InstantReadingResponseError();
  }

  const text = extractInteractionText(providerPayload);
  if (!text) throw new InstantReadingResponseError();

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new InstantReadingResponseError();
  }

  const reading = parseInstantReadingProviderResponse(value, request);
  if (!reading) throw new InstantReadingResponseError();
  return reading;
}

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
    ? getRelationshipQuestionCatalog("ko").questions.find(
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

  const cards = request.cards.map(({ cardId }) => {
    const card = tarotData.cards.find((candidate) => candidate.id === cardId);
    if (!card) {
      throw new RangeError("Instant reading request contains an unknown card.");
    }
    return { meaning: card.meaning };
  });

  return {
    cards,
    promptLead: topic.promptLead,
    ...(question ? { questionFocus: question.focus } : {}),
    spreadLabel: spread.label,
    styleInstruction: readingStyle.instruction,
    styleLabel: readingStyle.label,
    topicLabel: topic.label,
  };
}

function extractInteractionText(payload: unknown) {
  if (!isRecord(payload) || !Array.isArray(payload["steps"])) return undefined;

  for (const step of payload["steps"].toReversed()) {
    if (
      !isRecord(step) ||
      step["type"] !== "model_output" ||
      !Array.isArray(step["content"])
    ) {
      continue;
    }
    const text = step["content"]
      .filter(
        (content) =>
          isRecord(content) &&
          content["type"] === "text" &&
          typeof content["text"] === "string",
      )
      .map((content) => content["text"] as string)
      .join("");
    if (text) return text;
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
