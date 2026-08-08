import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");

export const foolRepairRecipe = Object.freeze({
  id: "the-fool-local-restoration-001",
  cardId: "the-fool",
  tool: "Sharp",
  toolVersion: "0.34.5",
  mode: "deterministic-local-restoration",
  source: Object.freeze({
    path: "public/cards/the-fool.jpg",
    sha256:
      "98c44ed92620968fef950f40b3b33c634f6dac5762de02c267eccf6edbdd78f8",
  }),
  mask: Object.freeze({
    center: Object.freeze({ x: 565, y: 10 }),
    radius: Object.freeze({ x: 35, y: 39 }),
    featherStart: 0.7,
  }),
  donorOffsets: Object.freeze([-92, -68, -48, 48, 68, 92]),
  scope:
    "Remove only the clipped floating star ornament and its isolated dots at the top edge; preserve every decoded source pixel outside the reviewed sky mask.",
});

export async function renderFoolLocalRestoration() {
  const sourcePath = resolve(repositoryRoot, foolRepairRecipe.source.path);
  const sourceBytes = await readFile(sourcePath);
  if (sha256(sourceBytes) !== foolRepairRecipe.source.sha256) {
    throw new Error("The Fool source SHA-256 does not match the frozen recipe.");
  }
  const { data, info } = await sharp(sourceBytes)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const source = Buffer.from(data);
  const output = Buffer.from(data);
  const mask = buildMask(info.width, info.height);

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = mask[y * info.width + x] / 255;
      if (alpha === 0) continue;
      const pixelOffset = (y * info.width + x) * info.channels;
      const donor = getMedianDonor({
        channels: info.channels,
        height: info.height,
        source,
        width: info.width,
        x,
        y,
      });
      for (let channel = 0; channel < 3; channel += 1) {
        output[pixelOffset + channel] = Math.round(
          source[pixelOffset + channel] * (1 - alpha) +
            donor[channel] * alpha,
        );
      }
    }
  }

  let changedInside = 0;
  let changedOutside = 0;
  for (let pixel = 0; pixel < info.width * info.height; pixel += 1) {
    const pixelOffset = pixel * info.channels;
    const changed = [0, 1, 2].some(
      (channel) => source[pixelOffset + channel] !== output[pixelOffset + channel],
    );
    if (!changed) continue;
    if (mask[pixel] === 0) changedOutside += 1;
    else changedInside += 1;
  }

  const [outputPng, maskPng] = await Promise.all([
    sharp(output, { raw: info }).png().toBuffer(),
    sharp(mask, {
      raw: { width: info.width, height: info.height, channels: 1 },
    })
      .png()
      .toBuffer(),
  ]);
  return {
    outputPng,
    maskPng,
    outputSha256: sha256(outputPng),
    maskSha256: sha256(maskPng),
    sourceSha256: sha256(sourceBytes),
    changedInside,
    changedOutside,
    width: info.width,
    height: info.height,
    toolVersion: sharp.versions.sharp,
    recipeDefinitionSha256: sha256(JSON.stringify(foolRepairRecipe)),
  };
}

function buildMask(width, height) {
  const mask = Buffer.alloc(width * height);
  const { center, featherStart, radius } = foolRepairRecipe.mask;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = (x - center.x) / radius.x;
      const dy = (y - center.y) / radius.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= featherStart) mask[y * width + x] = 255;
      else if (distance < 1) {
        const progress = (distance - featherStart) / (1 - featherStart);
        mask[y * width + x] = Math.round(
          (255 * (1 + Math.cos(Math.PI * progress))) / 2,
        );
      }
    }
  }
  return mask;
}

function getMedianDonor({ channels, height, source, width, x, y }) {
  const samples = [];
  for (const xOffset of foolRepairRecipe.donorOffsets) {
    for (const yOffset of [-2, 0, 2]) {
      const donorX = Math.max(0, Math.min(width - 1, x + xOffset));
      const donorY = Math.max(0, Math.min(height - 1, y + yOffset));
      const offset = (donorY * width + donorX) * channels;
      samples.push([
        source[offset],
        source[offset + 1],
        source[offset + 2],
      ]);
    }
  }
  return [0, 1, 2].map((channel) => {
    const values = samples
      .map((sample) => sample[channel])
      .sort((left, right) => left - right);
    return values[Math.floor(values.length / 2)];
  });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseArguments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--check") values.check = true;
    else if (argument === "--output") values.outputPath = resolve(argv[++index]);
    else if (argument === "--mask-output")
      values.maskOutputPath = resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return values;
}

async function main() {
  const { check, maskOutputPath, outputPath } = parseArguments(
    process.argv.slice(2),
  );
  const rendered = await renderFoolLocalRestoration();
  if (!check) {
    if (!outputPath || !maskOutputPath) {
      throw new Error("--output and --mask-output are required without --check.");
    }
    const expectedOutput = resolve(
      repositoryRoot,
      "art/card-art-v3-raw/legacy-retouch/the-fool-candidate-001.png",
    );
    const expectedMask = resolve(
      repositoryRoot,
      "art/card-art-v3-controls/the-fool-local-restoration-mask-001.png",
    );
    if (outputPath !== expectedOutput || maskOutputPath !== expectedMask) {
      throw new Error("Output and mask paths must match the frozen Fool recipe.");
    }
    await Promise.all([
      mkdir(dirname(outputPath), { recursive: true }),
      mkdir(dirname(maskOutputPath), { recursive: true }),
    ]);
    await writeFile(outputPath, rendered.outputPng, { flag: "wx" });
    await writeFile(maskOutputPath, rendered.maskPng, { flag: "wx" });
  }
  const { maskPng: _maskPng, outputPng: _outputPng, ...result } = rendered;
  console.log(JSON.stringify(result, null, 2));
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
