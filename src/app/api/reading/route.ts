import { parseInstantReadingRequest } from "@/domain/tarot";
import { getTarotData } from "@/i18n/tarot-data";
import {
  InstantReadingResponseError,
  isInstantReadingRequestConsistent,
  requestInstantReading,
} from "@/server/instant-reading";
import { isInstantReadingEnabled } from "@/server/instant-reading-config";

export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "no-store",
} as const;
const maxRequestBytes = 4_096;

export async function POST(request: Request) {
  if (!isInstantReadingEnabled()) {
    return jsonResponse({ code: "not-found" }, 404);
  }

  const apiKey = process.env["GEMINI_API_KEY"]?.trim();
  if (!apiKey) {
    return jsonResponse({ code: "instant-reading-unavailable" }, 503);
  }

  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return jsonResponse({ code: "invalid-request" }, 415);
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxRequestBytes) {
    return jsonResponse({ code: "invalid-request" }, 413);
  }

  let requestText: string;
  try {
    requestText = await request.text();
  } catch {
    return jsonResponse({ code: "invalid-request" }, 400);
  }

  if (new TextEncoder().encode(requestText).length > maxRequestBytes) {
    return jsonResponse({ code: "invalid-request" }, 413);
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
      apiKey,
    });

    return jsonResponse({ reading }, 200);
  } catch (error) {
    if (error instanceof InstantReadingResponseError) {
      return jsonResponse({ code: "instant-reading-invalid" }, 502);
    }

    return jsonResponse({ code: "instant-reading-unavailable" }, 503);
  }
}

function jsonResponse(body: unknown, status: number) {
  return Response.json(body, {
    headers: noStoreHeaders,
    status,
  });
}
