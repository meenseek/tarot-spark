import { describe, expect, it, vi } from "vitest";
import type { InstantReadingRequest } from "@/domain/tarot";
import { getTarotData } from "@/i18n/tarot-data";
import {
  buildCloudflareInstantReadingBody,
  buildInstantReadingPrompt,
  getCloudflareInstantReadingUrl,
  instantReadingGenerationConfig,
  InstantReadingAbortedError,
  InstantReadingResponseError,
  InstantReadingTimeoutError,
  requestInstantReading,
} from "./instant-reading";
import { cloudflareInstantReadingModel } from "./instant-reading-config";

const tarotData = getTarotData("ko");
const request = {
  cards: [
    { cardId: "the-fool" },
    { cardId: "wands-queen" },
    { cardId: "swords-3" },
  ],
  spreadId: "quick",
  styleId: "balanced",
  topicId: "love",
} as const satisfies InstantReadingRequest;
const providerConfig = { accountId: "account/id", apiToken: "secret-token" };

describe("Cloudflare instant reading adapter", () => {
  it("builds one fixed, bounded request without private or card identifiers", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        result: { response: createValidText() },
        success: true,
      }),
    );

    await expect(
      requestInstantReading(tarotData, request, { fetchImpl, providerConfig }),
    ).resolves.toEqual({ text: createValidText() });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      `https://api.cloudflare.com/client/v4/accounts/account%2Fid/ai/run/${cloudflareInstantReadingModel}`,
      expect.objectContaining({
        headers: {
          Authorization: "Bearer secret-token",
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );

    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body));
    expect(body).toEqual(buildCloudflareInstantReadingBody(tarotData, request));
    expect(body).toMatchObject(instantReadingGenerationConfig);
    expect(JSON.stringify(body)).not.toContain("the-fool");
    expect(JSON.stringify(body)).not.toContain("바보");
    expect(JSON.stringify(body)).not.toContain("privateContext");
    expect(JSON.stringify(body)).not.toContain("secret-token");
    expect(JSON.stringify(body)).toContain("사전식 뜻풀이를 반복하지 마세요");
    expect(JSON.stringify(body)).toContain("기간·비용·경계");
    expect(JSON.stringify(body)).toContain("양자택일로 몰지 않는");
    expect(JSON.stringify(body)).toContain("입력에 없는 사건");
    expect(JSON.stringify(body)).toContain("이 행동을 멈추고 다시 판단");
    expect(JSON.stringify(body)).toContain("'내용'이라는 단어");
    expect(JSON.stringify(body)).toContain(
      "카드상 ... 가능성에 무게가 실립니다",
    );
    expect(JSON.stringify(body)).toContain(
      "관찰 행동이나 사용자의 대응이 아니라",
    );
  });

  it("uses the exact direct endpoint", () => {
    expect(getCloudflareInstantReadingUrl("abc")).toBe(
      `https://api.cloudflare.com/client/v4/accounts/abc/ai/run/${cloudflareInstantReadingModel}`,
    );
  });

  it("builds a prompt from reviewed meanings in draw order", () => {
    const prompt = buildInstantReadingPrompt(tarotData, request);
    const meanings = request.cards.map(
      ({ cardId }) => tarotData.cards.find(({ id }) => id === cardId)!.meaning,
    );
    expect(prompt.indexOf(meanings[0]!)).toBeLessThan(
      prompt.indexOf(meanings[1]!),
    );
    expect(prompt.indexOf(meanings[1]!)).toBeLessThan(
      prompt.indexOf(meanings[2]!),
    );
    expect(prompt).toContain("사전식 뜻풀이를 반복하지 마세요");
    expect(prompt).toContain("비예측적 해석 두 개");
    expect(prompt).toContain("기간·비용·경계 중 하나가 명시된");
    expect(prompt).toContain("현재 상태를 사실처럼 서술");
    expect(prompt).toContain("어느 해석의 비중을 바꿀지");
    expect(prompt).toContain("질문에 대한 상징적 답을 먼저 제시");
    expect(prompt).toContain("시선·호감이나 연애적 관심·망설임");
    expect(prompt).toContain("내용:'이라는 단어를 출력하지 마세요");
  });

  it.each([
    Response.json({ success: false, errors: [{ message: "rejected" }] }),
    Response.json({ success: true, result: {} }),
    new Response("not-json"),
    Response.json({
      result: { response: createValidText().replace("[가능성 B]", "[누락]") },
      success: true,
    }),
  ])("rejects a malformed provider response", async (response) => {
    await expect(
      requestInstantReading(tarotData, request, {
        fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(response),
        providerConfig,
      }),
    ).rejects.toBeInstanceOf(InstantReadingResponseError);
  });

  it("rejects a provider body before buffering beyond the byte cap", async () => {
    await expect(
      requestInstantReading(tarotData, request, {
        fetchImpl: vi
          .fn<typeof fetch>()
          .mockResolvedValue(new Response("x".repeat(40_000))),
        providerConfig,
      }),
    ).rejects.toBeInstanceOf(InstantReadingResponseError);
  });

  it("maps its own deadline separately from caller cancellation", async () => {
    const pendingFetch = vi.fn<typeof fetch>().mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );

    await expect(
      requestInstantReading(tarotData, request, {
        fetchImpl: pendingFetch,
        providerConfig,
        timeoutMs: 1,
      }),
    ).rejects.toBeInstanceOf(InstantReadingTimeoutError);

    const controller = new AbortController();
    const cancelled = requestInstantReading(tarotData, request, {
      fetchImpl: pendingFetch,
      providerConfig,
      signal: controller.signal,
      timeoutMs: 1_000,
    });
    controller.abort();
    await expect(cancelled).rejects.toBeInstanceOf(InstantReadingAbortedError);
  });
});

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
