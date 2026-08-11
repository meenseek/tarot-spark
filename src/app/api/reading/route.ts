import { parseInstantReadingRequest } from "@/domain/tarot";
import { getTarotData } from "@/i18n/tarot-data";
import {
  isInstantReadingRequestConsistent,
  requestInstantReading,
} from "@/server/instant-reading";
import {
  getInstantReadingProviderConfig,
  isInstantReadingEnabled,
} from "@/server/instant-reading-config";

export const runtime = "nodejs";
export const maxDuration = 30;

const noStoreHeaders = {
  "Cache-Control": "no-store",
} as const;
const maximumRequestBytes = 4_096;
const requestReadTimeoutMs = 5_000;

export async function POST(request: Request) {
  if (!isInstantReadingEnabled()) {
    return jsonResponse({ code: "not-found" }, 404);
  }

  const providerConfig = getInstantReadingProviderConfig();
  if (!providerConfig) {
    return jsonResponse({ code: "instant-reading-unavailable" }, 503);
  }

  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return jsonResponse({ code: "invalid-request" }, 415);
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumRequestBytes) {
    return jsonResponse({ code: "invalid-request" }, 413);
  }

  let requestText: string;
  try {
    requestText = await readBoundedRequestText(
      request,
      maximumRequestBytes,
      requestReadTimeoutMs,
    );
  } catch (error) {
    if (error instanceof RequestTooLargeError) {
      return jsonResponse({ code: "invalid-request" }, 413);
    }
    if (error instanceof RequestReadTimeoutError) {
      return jsonResponse({ code: "invalid-request" }, 408);
    }
    if (error instanceof RequestAbortedError) {
      return jsonResponse({ code: "instant-reading-unavailable" }, 499);
    }
    return jsonResponse({ code: "invalid-request" }, 400);
  }

  let value: unknown;
  try {
    value = JSON.parse(requestText);
  } catch {
    return jsonResponse({ code: "invalid-request" }, 400);
  }

  const readingRequest = parseInstantReadingRequest(value);
  if (!readingRequest) {
    return jsonResponse({ code: "invalid-request" }, 400);
  }

  const tarotData = getTarotData("ko");
  if (!isInstantReadingRequestConsistent(tarotData, readingRequest)) {
    return jsonResponse({ code: "invalid-request" }, 400);
  }

  try {
    const reading = await requestInstantReading(tarotData, readingRequest, {
      providerConfig,
      signal: request.signal,
    });
    return jsonResponse({ text: reading.text }, 200);
  } catch {
    return jsonResponse({ code: "instant-reading-unavailable" }, 503);
  }
}

async function readBoundedRequestText(
  request: Request,
  maximumBytes: number,
  timeoutMs: number,
) {
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let timedOut = false;
  let aborted = request.signal.aborted;
  const cancelForAbort = () => {
    aborted = true;
    void reader.cancel();
  };
  const timeoutId = setTimeout(() => {
    timedOut = true;
    void reader.cancel();
  }, timeoutMs);
  request.signal.addEventListener("abort", cancelForAbort, { once: true });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw new RequestTooLargeError();
      }
      chunks.push(value);
    }
    if (aborted) throw new RequestAbortedError();
    if (timedOut) throw new RequestReadTimeoutError();
  } finally {
    clearTimeout(timeoutId);
    request.signal.removeEventListener("abort", cancelForAbort);
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

function jsonResponse(body: unknown, status: number) {
  return Response.json(body, {
    headers: noStoreHeaders,
    status,
  });
}

class RequestTooLargeError extends Error {}
class RequestReadTimeoutError extends Error {}
class RequestAbortedError extends Error {}
