import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const recipe = Object.freeze({
  colorSpace: "srgb",
  fit: "cover",
  height: 980,
  id: "sharp-cover-v1",
  jpeg: Object.freeze({
    chromaSubsampling: "4:4:4",
    mozjpeg: true,
    quality: 88,
  }),
  sharpVersion: "0.34.5",
  width: 700,
});
const ledgerRecipe = Object.freeze({
  chromaSubsampling: "4:4:4",
  colorSpace: "sRGB",
  fit: "cover",
  height: 980,
  id: "sharp-cover-v1",
  jpegQuality: 88,
  tool: "sharp",
  toolVersion: "0.34.5",
  width: 700,
});
const allowedPositions = new Set([
  "attention",
  "centre",
  "north",
  "northeast",
  "northwest",
  "south",
  "southeast",
  "southwest",
]);

export async function normalizeCardArtV3({
  inputPath,
  outputPath,
  position = "attention",
  replace = false,
}) {
  const input = resolve(inputPath);
  const output = resolve(outputPath);
  if (!existsSync(input)) throw new Error(`Missing input image ${input}.`);
  if (existsSync(output) && !replace) {
    throw new Error(
      `Refusing to overwrite ${output}; pass --replace explicitly.`,
    );
  }
  if (!allowedPositions.has(position)) {
    throw new Error(`Unsupported crop position "${position}".`);
  }
  await mkdir(dirname(output), { recursive: true });
  const temporaryOutput = `${output}.tmp-${process.pid}`;
  try {
    await sharp(input)
      .rotate()
      .toColourspace(recipe.colorSpace)
      .resize(recipe.width, recipe.height, {
        fit: recipe.fit,
        position,
      })
      .jpeg(recipe.jpeg)
      .toFile(temporaryOutput);
    const metadata = await sharp(temporaryOutput).metadata();
    if (
      metadata.format !== "jpeg" ||
      metadata.width !== recipe.width ||
      metadata.height !== recipe.height ||
      metadata.space !== recipe.colorSpace
    ) {
      throw new Error(
        "Normalized image does not satisfy the v3 JPEG contract.",
      );
    }
    await rename(temporaryOutput, output);
  } catch (error) {
    await unlink(temporaryOutput).catch(() => undefined);
    throw error;
  }
  const [inputBuffer, outputBuffer] = await Promise.all([
    readFile(input),
    readFile(output),
  ]);
  return {
    cropPosition: position,
    finalBytes: outputBuffer.length,
    finalSha256: sha256(outputBuffer),
    inputSha256: sha256(inputBuffer),
    outputPath: output,
    recipe,
    recipeFingerprintSha256: sha256(stableStringify(ledgerRecipe)),
    recipeId: ledgerRecipe.id,
  };
}

function getArg(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

async function main() {
  const args = process.argv.slice(2);
  const inputPath = getArg(args, "--input");
  const outputPath = getArg(args, "--output");
  if (!inputPath || !outputPath) {
    throw new Error(
      "Usage: pnpm art:v3:normalize -- --input <path> --output <path> [--position attention|centre|north|northeast|northwest|south|southeast|southwest] [--replace]",
    );
  }
  const record = await normalizeCardArtV3({
    inputPath,
    outputPath,
    position: getArg(args, "--position") ?? "attention",
    replace: args.includes("--replace"),
  });
  console.log(JSON.stringify(record, null, 2));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

export { recipe as cardArtV3NormalizationRecipe };
