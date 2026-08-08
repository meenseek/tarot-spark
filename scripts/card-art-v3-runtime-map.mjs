import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function buildCardArtV3RuntimeMap() {
  const [manifest, approvals] = await Promise.all([
    readFile(resolve("art/card-art-v3-manifest.json"), "utf8").then(JSON.parse),
    readFile(resolve("art/card-art-v3-approvals.json"), "utf8").then(
      JSON.parse,
    ),
  ]);
  const cardIds = Object.keys(manifest.cards ?? {});
  if (cardIds.length !== 78 || new Set(cardIds).size !== 78) {
    throw new Error("Runtime map requires exactly 78 unique manifest cards.");
  }

  const cards = Object.fromEntries(
    cardIds.map((cardId) => {
      const approval = approvals.records?.[cardId];
      if (approval?.status !== "approved" || !approval.assetSha256) {
        throw new Error(`Runtime map requires approved card ${cardId}.`);
      }
      return [
        cardId,
        {
          assetSha256: approval.assetSha256,
          src: `/cards/v3/${cardId}.jpg`,
        },
      ];
    }),
  );
  const runtimeMapSha256 = sha256(stableStringify(cards));
  return {
    cardCount: cardIds.length,
    cardIds,
    cards,
    runtimeMapSha256,
    version: "v3",
  };
}

async function main() {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf("--output");
  const outputPath =
    outputIndex === -1
      ? "art/card-art-v3-reviews/runtime-map-v3.json"
      : args[outputIndex + 1];
  if (!outputPath) {
    throw new Error("--output requires a path.");
  }
  const runtimeMap = await buildCardArtV3RuntimeMap();
  if (args.includes("--write")) {
    await writeFile(
      resolve(outputPath),
      `${JSON.stringify(runtimeMap, null, 2)}\n`,
    );
  }
  console.log(JSON.stringify(runtimeMap, null, 2));
}

const isEntryPoint = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;
if (isEntryPoint) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
