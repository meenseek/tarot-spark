import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const originalEnabled = process.env["TAROT_INSTANT_READING_ENABLED"];
const originalQuestionEnabled =
  process.env["TAROT_INSTANT_READING_QUESTION_ENABLED"];
const originalKey = process.env["OPENAI_API_KEY"];
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
    delete process.env["TAROT_INSTANT_READING_QUESTION_ENABLED"];
    process.env["OPENAI_API_KEY"] = "test-token";
  });

  afterEach(() => {
    restoreEnv("TAROT_INSTANT_READING_ENABLED", originalEnabled);
    restoreEnv(
      "TAROT_INSTANT_READING_QUESTION_ENABLED",
      originalQuestionEnabled,
    );
    restoreEnv("OPENAI_API_KEY", originalKey);
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("fails closed before parsing or contacting OpenAI", async () => {
    process.env["TAROT_INSTANT_READING_ENABLED"] = "false";
    delete process.env["OPENAI_API_KEY"];
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const response = await POST(new Request("http://localhost/api/reading"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ code: "not-found" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns unavailable without credentials and never contacts a provider", async () => {
    delete process.env["OPENAI_API_KEY"];
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const response = await POST(createJsonRequest(validRequest));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      code: "instant-reading-unavailable",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats a blank key as unavailable without contacting the provider", async () => {
    process.env["OPENAI_API_KEY"] = "   ";
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const response = await POST(createJsonRequest(validRequest));
    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns one escaped-text contract and sends no private context", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        Response.json(createProviderPayload(createValidText())),
      );

    const response = await POST(createJsonRequest(validRequest));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ text: createValidText() });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.openai.com/v1/responses",
    );
    const providerBody = String(fetchMock.mock.calls[0]?.[1]?.body);
    expect(JSON.parse(providerBody)).toMatchObject({ store: false });
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

  it("does not send typed questions when the separate flag is off", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Unexpected provider contact"));
    const response = await POST(
      createJsonRequest({
        ...validRequest,
        userQuestion: "요즘 이 관계가 편안한가요?",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ code: "invalid-request" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the normalized question and returns a complete one-sentence reply", async () => {
    process.env["TAROT_INSTANT_READING_QUESTION_ENABLED"] = "true";
    const directReply =
      "카드만으로는 당신에게 호감이 있는 사람의 실제 인원수를 알 수 없어요.";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json(createProviderPayload(directReply)));
    const userQuestion =
      " 카드로\r\n나에게 호감이 있는 사람이 몇 명인지 알 수 있을까요? ";
    const response = await POST(
      createJsonRequest({
        ...validRequest,
        topicId: "relationship-flow",
        userQuestion,
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ text: directReply });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.store).toBe(false);
    expect(body.input).toContain(
      JSON.stringify(
        "카드로\n나에게 호감이 있는 사람이 몇 명인지 알 수 있을까요?",
      ),
    );
    expect(body.input).not.toContain(JSON.stringify(userQuestion));
  });

  it("returns the fallback for a typed reply encouraging self-harm", async () => {
    process.env["TAROT_INSTANT_READING_QUESTION_ENABLED"] = "true";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(createProviderPayload("목숨을 끊으세요.")),
    );
    const response = await POST(
      createJsonRequest({
        ...validRequest,
        topicId: "relationship-flow",
        userQuestion: "지금 어떤 마음을 살펴볼까요?",
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      code: "instant-reading-unavailable",
    });
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
    Response.json(createProviderPayload("invalid")),
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

function createProviderPayload(text: string) {
  return {
    status: "completed",
    output: [
      {
        type: "message",
        role: "assistant",
        status: "completed",
        content: [{ type: "output_text", text }],
      },
    ],
  };
}

function createValidText() {
  return `다가가고 싶은 마음, 지키고 싶은 선

당신에게는 설렘과 조심스러움이 함께 있어요. 새로운 만남을 향해 한 걸음 내딛고 싶지만, 좋아하는 마음만으로 자신의 속도를 놓치고 싶지는 않아요.

가볍게 시작하는 용기에 자신을 표현하는 힘이 더해져요. 여기에 상처를 경계하는 마음도 나란히 놓여 있어서, 모든 것을 한꺼번에 보여주기보다 편안한 만큼 가까워지는 쪽이 잘 어울립니다. 잘 보이려고 괜찮지 않은 것까지 괜찮다고 넘길 필요는 없어요.

지금은 큰 약속보다 서로 부담 없이 대화를 이어갈 수 있는지를 느껴보세요. 작은 표현에도 자신답게 웃을 수 있는 만남을 바라고 있어요.`;
}
