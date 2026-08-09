import { afterEach, describe, expect, it, vi } from "vitest";
import type { InstantReadingRequest } from "@/domain/tarot";
import { POST } from "./route";

const originalEnabled = process.env["TAROT_INSTANT_READING_ENABLED"];
const originalApiKey = process.env["GEMINI_API_KEY"];
const originalModel = process.env["TAROT_READING_MODEL"];

describe("instant reading route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    restoreEnv("TAROT_INSTANT_READING_ENABLED", originalEnabled);
    restoreEnv("GEMINI_API_KEY", originalApiKey);
    restoreEnv("TAROT_READING_MODEL", originalModel);
  });

  it("stays closed by default without contacting the provider", async () => {
    delete process.env["TAROT_INSTANT_READING_ENABLED"];
    process.env["GEMINI_API_KEY"] = "test-key";
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const response = await POST(createRequest(createValidRequest()));

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects free-form context and extra request keys", async () => {
    enableRoute();
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const response = await POST(
      createRequest({
        ...createValidRequest(),
        userContext: "민감한 개인 상황",
      }),
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends only allowlisted tarot data and returns a validated reading", async () => {
    enableRoute();
    process.env["TAROT_READING_MODEL"] = "test-model";
    const readingRequest = createValidRequest();
    const reading = createValidReading(readingRequest);
    const serializedReading = JSON.stringify(createProviderReading(reading));
    const splitAt = Math.floor(serializedReading.length / 2);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        status: "completed",
        steps: [
          {
            content: [
              { text: serializedReading.slice(0, splitAt), type: "text" },
              { text: serializedReading.slice(splitAt), type: "text" },
            ],
            type: "model_output",
          },
        ],
      }),
    );

    const response = await POST(createRequest(readingRequest));
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(responseBody).toEqual({ reading });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [providerUrl, providerInit] = fetchMock.mock.calls[0] ?? [];
    expect(providerUrl).toBe(
      "https://generativelanguage.googleapis.com/v1/interactions",
    );
    expect(providerInit?.headers).toEqual({
      "Content-Type": "application/json",
      "x-goog-api-key": "test-key",
    });

    const providerBody = JSON.parse(String(providerInit?.body)) as Record<
      string,
      unknown
    >;
    expect(providerBody["model"]).toBe("test-model");
    expect(providerBody["store"]).toBe(false);
    expect(JSON.stringify(providerBody)).not.toContain("userContext");
    expect(JSON.stringify(providerBody)).not.toContain("민감한 개인 상황");
    expect(JSON.stringify(providerBody)).not.toContain("wands-queen");
    expect(JSON.stringify(providerBody)).not.toContain('"cardId"');
    expect(JSON.stringify(providerBody)).not.toContain('"cardIds"');
    expect(JSON.stringify(providerBody)).not.toContain("바보");
    expect(JSON.stringify(providerBody)).not.toContain("완드 퀸");
    expect(JSON.stringify(providerBody)).not.toContain("소드 3");
    expect(JSON.stringify(providerBody)).toContain("제공된 정방향 핵심 의미:");
  });

  it("hides provider quota failures behind the fallback response", async () => {
    enableRoute();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("provider quota detail", { status: 429 }),
    );

    const response = await POST(createRequest(createValidRequest()));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      code: "instant-reading-unavailable",
    });
  });

  it("rejects provider output that breaks the reading contract", async () => {
    enableRoute();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        steps: [
          {
            content: [
              {
                text: JSON.stringify({ headline: "불완전한 응답" }),
                type: "text",
              },
            ],
            type: "model_output",
          },
        ],
      }),
    );

    const response = await POST(createRequest(createValidRequest()));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      code: "instant-reading-invalid",
    });
  });

  it("rejects an incomplete provider interaction", async () => {
    enableRoute();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        status: "incomplete",
        steps: [],
      }),
    );

    const response = await POST(createRequest(createValidRequest()));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      code: "instant-reading-invalid",
    });
  });

  it("rejects a malformed provider response envelope", async () => {
    enableRoute();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{broken", {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );

    const response = await POST(createRequest(createValidRequest()));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      code: "instant-reading-invalid",
    });
  });

  it("rejects structurally valid but unsafe provider output", async () => {
    enableRoute();
    const readingRequest = createValidRequest();
    const reading = createValidReading(readingRequest);
    const providerReading = createProviderReading(reading);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        steps: [
          {
            content: [
              {
                text: JSON.stringify({
                  ...providerReading,
                  synthesis: `반드시 3일 안에 연락이 옵니다. ${reading.synthesis}`,
                }),
                type: "text",
              },
            ],
            type: "model_output",
          },
        ],
      }),
    );

    const response = await POST(createRequest(readingRequest));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      code: "instant-reading-invalid",
    });
  });
});

function enableRoute() {
  process.env["TAROT_INSTANT_READING_ENABLED"] = "true";
  process.env["GEMINI_API_KEY"] = "test-key";
}

function createValidRequest(): InstantReadingRequest {
  return {
    cards: [
      { cardId: "the-fool" },
      { cardId: "wands-queen" },
      { cardId: "swords-3" },
    ],
    spreadId: "quick",
    styleId: "balanced",
    topicId: "love",
  };
}

function createRequest(body: unknown) {
  return new Request("https://tarot-spark.example/api/reading", {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

function createValidReading(request: InstantReadingRequest) {
  const sentence =
    "서두르기보다 지금 확인할 수 있는 선택과 경계를 차분히 살펴보는 흐름입니다. ";

  return {
    headline: "멈춤과 움직임 사이의 선택",
    synthesis: sentence.repeat(3),
    cardReadings: request.cards.map(({ cardId }) => ({
      cardId,
      interpretation: sentence.repeat(2),
    })),
    strongestConnection: {
      cardIds: [request.cards[0]!.cardId, request.cards[1]!.cardId],
      explanation: sentence.repeat(2),
      relationType: "progression",
    },
    alternatives: [
      `표현의 속도 차이가 불확실성을 키웠을 수 있습니다. ${sentence}`,
      `기대가 실제 신호보다 앞섰을 수 있습니다. ${sentence}`,
    ],
    realityCheck: {
      unknown: sentence.repeat(2),
      observableDiscriminator: sentence.repeat(2),
      revisionCondition: sentence.repeat(2),
    },
    nextStep: {
      action: sentence,
      stopOrReviewCondition: sentence,
    },
    reflection: "지금 가장 부담 없이 확인할 수 있는 선택은 무엇인가요?",
  } as const;
}

function createProviderReading(reading: ReturnType<typeof createValidReading>) {
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
  } as const;
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
