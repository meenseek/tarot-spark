import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

export const cardArtV3DeckContactSheetRecipe = Object.freeze({
  id: "deck-contact-sheet-13x6-v1",
  tool: "sharp",
  toolVersion: "0.34.5",
  background: "#e8ddc6",
  columns: 13,
  rows: 6,
  order: "manifest.cards insertion order, row-major",
  tileWidth: 140,
  tileHeight: 196,
  margin: 10,
  columnGap: 8,
  rowGap: 8,
  output: Object.freeze({
    format: "jpeg",
    quality: 92,
    chromaSubsampling: "4:4:4",
    progressive: true,
    width: 1936,
    height: 1236,
  }),
});

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

export async function renderCardArtV3DeckContactSheet({
  manifestPath = "art/card-art-v3-manifest.json",
  outputPath = "art/card-art-v3-reviews/final-deck-contact-sheet-v1.jpg",
  write = false,
} = {}) {
  const manifest = JSON.parse(await readFile(resolve(manifestPath), "utf8"));
  const cardIds = Object.keys(manifest.cards ?? {});
  if (cardIds.length !== 78 || new Set(cardIds).size !== 78) {
    throw new Error("Deck contact sheet requires exactly 78 unique cards.");
  }

  const sourcePaths = cardIds.map((cardId) =>
    resolve(manifest.cards[cardId].assetPath),
  );
  for (const sourcePath of sourcePaths) {
    if (!existsSync(sourcePath)) {
      throw new Error(`Missing deck contact-sheet source ${sourcePath}.`);
    }
  }

  const sourceBuffers = await Promise.all(
    sourcePaths.map((sourcePath) => readFile(sourcePath)),
  );
  const tiles = await Promise.all(
    sourceBuffers.map((buffer) =>
      sharp(buffer)
        .resize(
          cardArtV3DeckContactSheetRecipe.tileWidth,
          cardArtV3DeckContactSheetRecipe.tileHeight,
          { fit: "fill", kernel: sharp.kernel.lanczos3 },
        )
        .removeAlpha()
        .toColourspace("srgb")
        .toBuffer(),
    ),
  );
  const output = await sharp({
    create: {
      width: cardArtV3DeckContactSheetRecipe.output.width,
      height: cardArtV3DeckContactSheetRecipe.output.height,
      channels: 3,
      background: cardArtV3DeckContactSheetRecipe.background,
    },
  })
    .composite(
      tiles.map((input, index) => ({
        input,
        left:
          cardArtV3DeckContactSheetRecipe.margin +
          (index % cardArtV3DeckContactSheetRecipe.columns) *
            (cardArtV3DeckContactSheetRecipe.tileWidth +
              cardArtV3DeckContactSheetRecipe.columnGap),
        top:
          cardArtV3DeckContactSheetRecipe.margin +
          Math.floor(index / cardArtV3DeckContactSheetRecipe.columns) *
            (cardArtV3DeckContactSheetRecipe.tileHeight +
              cardArtV3DeckContactSheetRecipe.rowGap),
      })),
    )
    .jpeg(cardArtV3DeckContactSheetRecipe.output)
    .toBuffer();

  if (write) {
    await writeFile(resolve(outputPath), output);
  }

  return {
    cardIds,
    recipe: cardArtV3DeckContactSheetRecipe,
    recipeFingerprintSha256: sha256(
      Buffer.from(stableStringify(cardArtV3DeckContactSheetRecipe)),
    ),
    sourceSha256: sourceBuffers.map(sha256),
    output: {
      bytes: output.length,
      height: cardArtV3DeckContactSheetRecipe.output.height,
      path: outputPath,
      sha256: sha256(output),
      width: cardArtV3DeckContactSheetRecipe.output.width,
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf("--output");
  const result = await renderCardArtV3DeckContactSheet({
    outputPath:
      outputIndex === -1
        ? undefined
        : args[outputIndex + 1] ||
          "art/card-art-v3-reviews/final-deck-contact-sheet-v1.jpg",
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
