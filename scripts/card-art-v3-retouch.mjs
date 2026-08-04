import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const allowedOutputDirectory = resolve(
  repositoryRoot,
  "art/card-art-v3-raw/legacy-retouch",
);

export const cardArtV3RetouchRecipe = Object.freeze({
  id: "local-star-restoration-v1",
  algorithm: "elliptical-feathered-median-sky-clone",
  sourcePolicy: "byte-identical-v2-source",
  scope: "remove-only-the-reviewed-large-eight-point-star",
  cards: Object.freeze({
    "the-hermit": Object.freeze({
      sourcePath: "public/cards/the-hermit.jpg",
      regions: Object.freeze([
        Object.freeze({
          center: Object.freeze({ x: 313, y: 72 }),
          radius: Object.freeze({ x: 46, y: 58 }),
          donorOffsets: Object.freeze([-82, 83, -104, 105]),
        }),
      ]),
    }),
    temperance: Object.freeze({
      sourcePath: "public/cards/temperance.jpg",
      regions: Object.freeze([
        Object.freeze({
          center: Object.freeze({ x: 350, y: 50 }),
          radius: Object.freeze({ x: 40, y: 52 }),
          donorOffsets: Object.freeze([-80, 81, -105, 106]),
        }),
        Object.freeze({
          center: Object.freeze({ x: 273, y: 99 }),
          radius: Object.freeze({ x: 24, y: 26 }),
          donorOffsets: Object.freeze([-62, 63, -84, 85]),
        }),
      ]),
    }),
  }),
});

export async function retouchCardArtV3({ cardId, outputPath }) {
  const config = cardArtV3RetouchRecipe.cards[cardId];
  if (!config) throw new Error(`Unsupported v3 retouch card: ${cardId}`);
  if (!outputPath) throw new Error("outputPath is required.");
  const absoluteOutputPath = resolve(outputPath);
  const fileName = basename(absoluteOutputPath);
  if (
    dirname(absoluteOutputPath) !== allowedOutputDirectory ||
    !new RegExp(`^${cardId}-candidate-[0-9]{3}\\.png$`).test(fileName)
  ) {
    throw new Error(
      `Retouch output must be a card-specific candidate PNG directly under ${allowedOutputDirectory}.`,
    );
  }

  const rendered = await renderCardArtV3Retouch({ cardId });
  await mkdir(allowedOutputDirectory, { recursive: true });
  try {
    await writeFile(absoluteOutputPath, rendered.buffer, { flag: "wx" });
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error(
        `Refusing to overwrite existing retouch output: ${absoluteOutputPath}`,
      );
    }
    throw error;
  }

  const { buffer: _buffer, ...record } = rendered;
  return { ...record, outputPath: absoluteOutputPath };
}

export async function renderCardArtV3Retouch({ cardId }) {
  const config = cardArtV3RetouchRecipe.cards[cardId];
  if (!config) throw new Error(`Unsupported v3 retouch card: ${cardId}`);

  const sourcePath = resolve(repositoryRoot, config.sourcePath);
  const { data, info } = await sharp(sourcePath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const source = Buffer.from(data);
  const mask = buildMask({ config, height, width });
  const softenedMask = blurMask({
    height,
    mask,
    radius: 6,
    sigma: 2.2,
    width,
  });

  const x0 = Math.max(
    0,
    Math.floor(
      Math.min(
        ...config.regions.map(({ center, radius }) => center.x - radius.x - 8),
      ),
    ),
  );
  const x1 = Math.min(
    width - 1,
    Math.ceil(
      Math.max(
        ...config.regions.map(({ center, radius }) => center.x + radius.x + 8),
      ),
    ),
  );
  const y0 = Math.max(
    0,
    Math.floor(
      Math.min(
        ...config.regions.map(({ center, radius }) => center.y - radius.y - 8),
      ),
    ),
  );
  const y1 = Math.min(
    height - 1,
    Math.ceil(
      Math.max(
        ...config.regions.map(({ center, radius }) => center.y + radius.y + 8),
      ),
    ),
  );

  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const alpha = Math.min(1, (softenedMask[y * width + x] / 255) * 1.35);
      if (alpha < 0.005) continue;
      const pixelIndex = (y * width + x) * channels;
      const donor = getMedianSkyDonor({
        channels,
        config,
        source,
        width,
        x,
        y,
      });
      for (let channel = 0; channel < 3; channel += 1) {
        data[pixelIndex + channel] = Math.round(
          data[pixelIndex + channel] * (1 - alpha) + donor[channel] * alpha,
        );
      }
    }
  }

  const result = await sharp(data, { raw: { width, height, channels } })
    .png()
    .toBuffer();

  return {
    buffer: result,
    cardId,
    outputSha256: sha256(result),
    recipeId: cardArtV3RetouchRecipe.id,
    recipeDefinitionSha256: sha256(JSON.stringify(cardArtV3RetouchRecipe)),
    retouchRecipeSha256: sha256(await readFile(fileURLToPath(import.meta.url))),
    sourcePath: config.sourcePath,
    sourceSha256: sha256(await readFile(sourcePath)),
  };
}

function buildMask({ config, height, width }) {
  const mask = Buffer.alloc(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      for (const region of config.regions) {
        const dx = (x - region.center.x) / region.radius.x;
        const dy = (y - region.center.y) / region.radius.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        let value = 0;
        if (distance <= 0.78) value = 255;
        else if (distance < 1.05) {
          const progress = (distance - 0.78) / 0.27;
          value = Math.round((255 * (1 + Math.cos(Math.PI * progress))) / 2);
        }
        mask[y * width + x] = Math.max(mask[y * width + x], value);
      }
    }
  }
  return mask;
}

function blurMask({ height, mask, radius, sigma, width }) {
  const kernel = Array.from({ length: radius * 2 + 1 }, (_, index) => {
    const distance = index - radius;
    return Math.exp(-(distance * distance) / (2 * sigma * sigma));
  });
  const kernelSum = kernel.reduce((sum, value) => sum + value, 0);
  const horizontal = new Float64Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let value = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        const sampleX = Math.min(width - 1, Math.max(0, x + offset));
        value += mask[y * width + sampleX] * kernel[offset + radius];
      }
      horizontal[y * width + x] = value / kernelSum;
    }
  }
  const result = new Float64Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let value = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        const sampleY = Math.min(height - 1, Math.max(0, y + offset));
        value += horizontal[sampleY * width + x] * kernel[offset + radius];
      }
      result[y * width + x] = value / kernelSum;
    }
  }
  return result;
}

function getMedianSkyDonor({ channels, config, source, width, x, y }) {
  const region = config.regions.reduce((nearest, candidate) => {
    const distance =
      ((x - candidate.center.x) / candidate.radius.x) ** 2 +
      ((y - candidate.center.y) / candidate.radius.y) ** 2;
    return !nearest || distance < nearest.distance
      ? { distance, value: candidate }
      : nearest;
  }, undefined).value;
  const samples = [];
  for (const offset of region.donorOffsets) {
    const donorX = x + offset;
    if (donorX < 0 || donorX >= width) continue;
    const index = (y * width + donorX) * channels;
    const sample = [source[index], source[index + 1], source[index + 2]];
    if (sample[0] - sample[2] <= 3 || sample[0] < 45) samples.push(sample);
  }
  if (samples.length === 0) {
    const fallbackX = Math.max(
      0,
      Math.min(width - 1, x + region.donorOffsets[0]),
    );
    const index = (y * width + fallbackX) * channels;
    return [source[index], source[index + 1], source[index + 2]];
  }
  return [0, 1, 2].map((channel) => {
    const values = samples
      .map((sample) => sample[channel])
      .sort((a, b) => a - b);
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
    if (argument === "--card") values.cardId = argv[++index];
    else if (argument === "--output")
      values.outputPath = resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return values;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = await retouchCardArtV3(parseArguments(process.argv.slice(2)));
  console.log(JSON.stringify(result, null, 2));
}
