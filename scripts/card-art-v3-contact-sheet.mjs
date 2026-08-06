import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

export const cardArtV3CourtContactSheetRecipe = Object.freeze({
  id: "court-contact-sheet-3x2-v1",
  tool: "sharp",
  toolVersion: "0.34.5",
  background: "#e8ddc6",
  columns: 3,
  rows: 2,
  order: "cardIds row-major",
  output: Object.freeze({
    format: "jpeg",
    quality: 92,
    chromaSubsampling: "4:4:4",
    progressive: true,
  }),
  full: Object.freeze({
    width: 896,
    height: 828,
    tileWidth: 280,
    tileHeight: 392,
    margin: 16,
    columnGap: 12,
    rowGap: 12,
  }),
  mobile: Object.freeze({
    width: 456,
    height: 420,
    tileWidth: 140,
    tileHeight: 196,
    margin: 10,
    columnGap: 8,
    rowGap: 8,
  }),
});

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
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

async function renderLayout(sourceBuffers, layout) {
  const tiles = await Promise.all(
    sourceBuffers.map((buffer) =>
      sharp(buffer)
        .resize(layout.tileWidth, layout.tileHeight, {
          fit: "fill",
          kernel: sharp.kernel.lanczos3,
        })
        .removeAlpha()
        .toColourspace("srgb")
        .toBuffer(),
    ),
  );
  const composites = tiles.map((input, index) => ({
    input,
    left:
      layout.margin +
      (index % cardArtV3CourtContactSheetRecipe.columns) *
        (layout.tileWidth + layout.columnGap),
    top:
      layout.margin +
      Math.floor(index / cardArtV3CourtContactSheetRecipe.columns) *
        (layout.tileHeight + layout.rowGap),
  }));
  return sharp({
    create: {
      width: layout.width,
      height: layout.height,
      channels: 3,
      background: cardArtV3CourtContactSheetRecipe.background,
    },
  })
    .composite(composites)
    .jpeg(cardArtV3CourtContactSheetRecipe.output)
    .toBuffer();
}

export async function renderCardArtV3CourtContactSheet({
  fullOutputPath = null,
  mobileOutputPath = null,
  sourcePaths,
  write = false,
}) {
  if (!Array.isArray(sourcePaths) || sourcePaths.length !== 6) {
    throw new Error(
      "Court contact sheet requires exactly six ordered sources.",
    );
  }
  for (const sourcePath of sourcePaths) {
    if (!existsSync(sourcePath)) {
      throw new Error(`Missing court contact-sheet source ${sourcePath}.`);
    }
  }
  const sourceBuffers = await Promise.all(
    sourcePaths.map((sourcePath) => readFile(sourcePath)),
  );
  const [full, mobile] = await Promise.all([
    renderLayout(sourceBuffers, cardArtV3CourtContactSheetRecipe.full),
    renderLayout(sourceBuffers, cardArtV3CourtContactSheetRecipe.mobile),
  ]);
  if (write) {
    if (!fullOutputPath || !mobileOutputPath) {
      throw new Error("Writing contact sheets requires both output paths.");
    }
    await Promise.all([
      writeFile(fullOutputPath, full),
      writeFile(mobileOutputPath, mobile),
    ]);
  }
  const sourceSha256 = sourceBuffers.map(sha256);
  return {
    recipeFingerprintSha256: sha256(
      Buffer.from(stableStringify(cardArtV3CourtContactSheetRecipe)),
    ),
    sourceSha256,
    full: {
      bytes: full.length,
      sha256: sha256(full),
      width: cardArtV3CourtContactSheetRecipe.full.width,
      height: cardArtV3CourtContactSheetRecipe.full.height,
    },
    mobile: {
      bytes: mobile.length,
      sha256: sha256(mobile),
      width: cardArtV3CourtContactSheetRecipe.mobile.width,
      height: cardArtV3CourtContactSheetRecipe.mobile.height,
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const sources = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--source") sources.push(resolve(args[index + 1]));
  }
  const fullIndex = args.indexOf("--full");
  const mobileIndex = args.indexOf("--mobile");
  if (
    sources.length !== 6 ||
    fullIndex === -1 ||
    mobileIndex === -1 ||
    !args[fullIndex + 1] ||
    !args[mobileIndex + 1]
  ) {
    throw new Error(
      "Usage: node scripts/card-art-v3-contact-sheet.mjs --source <path> (six times) --full <path> --mobile <path> [--write]",
    );
  }
  const result = await renderCardArtV3CourtContactSheet({
    fullOutputPath: resolve(args[fullIndex + 1]),
    mobileOutputPath: resolve(args[mobileIndex + 1]),
    sourcePaths: sources,
    write: args.includes("--write"),
  });
  console.log(JSON.stringify(result, null, 2));
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
