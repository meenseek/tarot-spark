// @vitest-environment node

import { IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { Socket } from "node:net";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { fetchInternalImage } = require("next/dist/server/image-optimizer");
const { serveStatic } = require("next/dist/server/serve-static");

async function fetchLocalImage(card, disconnect, maximumBytes = 1_048_576) {
  const socket = new Socket();
  if (disconnect === "before") socket.destroy();
  const request = new IncomingMessage(socket);
  request.method = "GET";
  request.url = "/_next/image";
  const response = new ServerResponse(request);
  const image = fileURLToPath(
    new URL(`../public/cards/${card}.jpg`, import.meta.url),
  );
  let timeout;

  try {
    return await Promise.race([
      fetchInternalImage(
        `/cards/${card}.jpg`,
        request,
        response,
        maximumBytes,
        async (internalRequest, internalResponse) => {
          expect(internalRequest.socket).toBe(socket);
          if (disconnect === "during") socket.destroy();
          await Promise.race([
            serveStatic(internalRequest, internalResponse, image),
            internalResponse.hasStreamed,
          ]);
        },
      ),
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Internal image response did not finish")),
          1_000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
    socket.destroy();
  }
}

it.each([
  ["the-lovers", "none"],
  ["swords-3", "before"],
  ["the-chariot", "during"],
])(
  "serves exact local image bytes when the caller disconnects %s/%s",
  async (card, disconnect) => {
    const result = await fetchLocalImage(card, disconnect);
    const expected = await readFile(
      new URL(`../public/cards/${card}.jpg`, import.meta.url),
    );

    expect(result.buffer.equals(expected)).toBe(true);
    expect(result.contentType).toBe("image/jpeg");
  },
);

it("preserves the internal image response size limit", async () => {
  await expect(fetchLocalImage("cups-5", "none", 1)).rejects.toMatchObject({
    statusCode: 413,
  });
});
