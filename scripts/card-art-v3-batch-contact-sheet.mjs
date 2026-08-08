import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const columns = 3;

export function getCardArtV3BatchContactSheetRecipe(sourceCount) {
  if (!Number.isInteger(sourceCount) || sourceCount < 2 || sourceCount > 8) {
    throw new Error("Batch contact sheet requires two to eight sources.");
  }
  const rows = Math.ceil(sourceCount / columns);
  return Object.freeze({
    id: "batch-contact-sheet-v1",
    tool: "sharp",
    toolVersion: "0.34.5",
    sourceCount,
    background: "#e8ddc6",
    columns,
    rows,
    order: "cardIds row-major",
    output: Object.freeze({
      format: "jpeg",
      quality: 92,
      chromaSubsampling: "4:4:4",
      progressive: true,
    }),
    full: Object.freeze({
      width: 896,
      height: 32 + rows * 392 + (rows - 1) * 12,
      tileWidth: 280,
      tileHeight: 392,
      margin: 16,
      columnGap: 12,
      rowGap: 12,
    }),
    mobile: Object.freeze({
      width: 456,
      height: 20 + rows * 196 + (rows - 1) * 8,
      tileWidth: 140,
      tileHeight: 196,
      margin: 10,
      columnGap: 8,
      rowGap: 8,
    }),
  });
}

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

async function renderLayout(sourceBuffers, layout, recipe) {
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
  return sharp({
    create: {
      width: layout.width,
      height: layout.height,
      channels: 3,
      background: recipe.background,
    },
  })
    .composite(
      tiles.map((input, index) => ({
        input,
        left:
          layout.margin +
          (index % recipe.columns) * (layout.tileWidth + layout.columnGap),
        top:
          layout.margin +
          Math.floor(index / recipe.columns) *
            (layout.tileHeight + layout.rowGap),
      })),
    )
    .jpeg(recipe.output)
    .toBuffer();
}

export async function renderCardArtV3BatchContactSheet({
  fullOutputPath = null,
  mobileOutputPath = null,
  sourcePaths,
  write = false,
}) {
  const recipe = getCardArtV3BatchContactSheetRecipe(sourcePaths?.length);
  for (const sourcePath of sourcePaths) {
    if (!existsSync(sourcePath)) {
      throw new Error(`Missing batch contact-sheet source ${sourcePath}.`);
    }
  }
  const sourceBuffers = await Promise.all(
    sourcePaths.map((sourcePath) => readFile(sourcePath)),
  );
  const [full, mobile] = await Promise.all([
    renderLayout(sourceBuffers, recipe.full, recipe),
    renderLayout(sourceBuffers, recipe.mobile, recipe),
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
  return {
    recipe,
    recipeFingerprintSha256: sha256(Buffer.from(stableStringify(recipe))),
    sourceSha256: sourceBuffers.map(sha256),
    full: {
      bytes: full.length,
      sha256: sha256(full),
      width: recipe.full.width,
      height: recipe.full.height,
    },
    mobile: {
      bytes: mobile.length,
      sha256: sha256(mobile),
      width: recipe.mobile.width,
      height: recipe.mobile.height,
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
    sources.length < 2 ||
    sources.length > 8 ||
    fullIndex === -1 ||
    mobileIndex === -1 ||
    !args[fullIndex + 1] ||
    !args[mobileIndex + 1]
  ) {
    throw new Error(
      "Usage: node scripts/card-art-v3-batch-contact-sheet.mjs --source <path> (two to eight times) --full <path> --mobile <path> [--write]",
    );
  }
  const result = await renderCardArtV3BatchContactSheet({
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
