import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const originalEnabled = process.env["TAROT_INSTANT_READING_ENABLED"];
const originalAccount = process.env["CLOUDFLARE_ACCOUNT_ID"];
const originalToken = process.env["CLOUDFLARE_API_TOKEN"];
const validRequest = {
  cards: [
    { cardId: "the-fool" },
    { cardId: "wands-queen" },
    { cardId: "swords-3" },
  ],
  spreadId: "quick",
  styleId: "balanced",
  topicId: "love",
};

describe("POST /api/reading", () => {
  beforeEach(() => {
    process.env["TAROT_INSTANT_READING_ENABLED"] = "true";
    process.env["CLOUDFLARE_ACCOUNT_ID"] = "test-account";
    process.env["CLOUDFLARE_API_TOKEN"] = "test-token";
  });

  afterEach(() => {
    restoreEnv("TAROT_INSTANT_READING_ENABLED", originalEnabled);
    restoreEnv("CLOUDFLARE_ACCOUNT_ID", originalAccount);
    restoreEnv("CLOUDFLARE_API_TOKEN", originalToken);
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("fails closed before parsing or contacting Cloudflare", async () => {
    process.env["TAROT_INSTANT_READING_ENABLED"] = "false";
    delete process.env["CLOUDFLARE_ACCOUNT_ID"];
    delete process.env["CLOUDFLARE_API_TOKEN"];
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const response = await POST(new Request("http://localhost/api/reading"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ code: "not-found" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns unavailable without credentials and never contacts a provider", async () => {
    delete process.env["CLOUDFLARE_API_TOKEN"];
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const response = await POST(createJsonRequest(validRequest));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      code: "instant-reading-unavailable",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns one escaped-text contract and sends no private context", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        result: { response: createValidText() },
        success: true,
      }),
    );

    const response = await POST(createJsonRequest(validRequest));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ text: createValidText() });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const providerBody = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(providerBody).not.toContain("privateContext");
    expect(providerBody).not.toContain("the-fool");
    expect(providerBody).not.toContain("test-token");
  });

  it("rejects self readings without contacting the provider", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    for (const body of [
      { ...validRequest, topicId: "money-life" },
      {
        ...validRequest,
        questionId: "money-want-or-need",
        topicId: "money-life",
      },
    ]) {
      const response = await POST(createJsonRequest(body));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ code: "invalid-request" });
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    { body: "{}", contentType: "text/plain", status: 415 },
    { body: "not-json", contentType: "application/json", status: 400 },
    {
      body: JSON.stringify({ ...validRequest, privateContext: "민감한 내용" }),
      contentType: "application/json",
      status: 400,
    },
    {
      body: JSON.stringify({
        ...validRequest,
        cards: [
          validRequest.cards[0],
          validRequest.cards[0],
          validRequest.cards[2],
        ],
      }),
      contentType: "application/json",
      status: 400,
    },
  ])(
    "rejects invalid input without a provider call",
    async ({ body, contentType, status }) => {
      const fetchMock = vi.spyOn(globalThis, "fetch");
      const response = await POST(
        new Request("http://localhost/api/reading", {
          body,
          headers: { "Content-Type": contentType },
          method: "POST",
        }),
      );

      expect(response.status).toBe(status);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("rejects declared and streamed oversized bodies", async () => {
    const declared = await POST(
      new Request("http://localhost/api/reading", {
        body: "{}",
        headers: {
          "Content-Length": "5000",
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );
    expect(declared.status).toBe(413);

    const streamed = await POST(
      new Request("http://localhost/api/reading", {
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("x".repeat(5_000)));
            controller.close();
          },
        }),
        duplex: "half",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      } as RequestInit & { duplex: "half" }),
    );
    expect(streamed.status).toBe(413);
  });

  it("bounds a stalled request body read", async () => {
    vi.useFakeTimers();
    const request = new Request("http://localhost/api/reading", {
      body: new ReadableStream({ pull() {} }),
      duplex: "half",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    } as RequestInit & { duplex: "half" });

    const pending = POST(request);
    await vi.advanceTimersByTimeAsync(5_100);
    expect((await pending).status).toBe(408);
  });

  it.each([
    new Response("quota", { status: 429 }),
    Response.json({ success: true, result: { response: "invalid" } }),
    new Response("x".repeat(40_000)),
  ])(
    "collapses provider failures into one unavailable response",
    async (providerResponse) => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(providerResponse);
      const response = await POST(createJsonRequest(validRequest));

      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        code: "instant-reading-unavailable",
      });
    },
  );
});

function createJsonRequest(body: unknown) {
  return new Request("http://localhost/api/reading", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function createValidText() {
  return `[전체 흐름]
새로운 가능성과 분명한 표현이 함께 필요하지만 확인하지 않은 부분은 현실의 대화로 살펴야 기대와 관찰을 구분할 수 있습니다.
[카드별 흐름]
1. 새로운 시도를 열어 두되 아직 확인하지 않은 기대를 사실처럼 단정하지 않는 태도를 살펴봅니다.
2. 표현할 수 있는 선택과 자원을 구체적으로 사용하면 원하는 경계를 더 분명히 전할 수 있습니다.
3. 아픈 감정을 서둘러 지우기보다 실제로 확인한 행동과 해석을 나누어 바라볼 필요가 있습니다.
[가장 강한 연결]
열린 가능성과 능동적인 표현이 서로 힘을 보태지만 감정을 건너뛰면 속도가 현실보다 앞설 수 있다는 긴장이 두드러집니다.
[가능성 A]
서로 표현하는 속도가 달라서 같은 행동을 다르게 받아들이며 불확실성이 커졌을 수 있습니다.
[가능성 B]
기대가 실제로 확인한 신호보다 앞서서 관계의 빈칸을 스스로 채우고 있을 수 있습니다.
[현실 확인]
아직 모르는 점: 현재 정보만으로는 서로 같은 기대와 관계의 속도를 원하는지 알 수 없습니다.
관찰할 점: 다음 대화에서 질문에 대한 답과 이후 행동이 일정하게 이어지는지 살펴보세요.
다시 볼 조건: 말과 행동이 계속 어긋나면 두 가능성을 모두 내려놓고 다시 살펴보세요.
[다음 행동]
작은 행동: 부담이 적은 질문 하나를 골라 서로 확인할 수 있는 범위에서 짧게 대화해 보세요.
멈추거나 다시 볼 조건: 대화가 반복해서 경계를 넘거나 일상에 큰 비용을 만들면 이 행동을 멈추고 다시 판단하세요.
[성찰 질문]
지금 내가 기대와 실제 관찰을 구분하기 위해 가장 먼저 확인할 수 있는 것은 무엇인가요?`;
}
