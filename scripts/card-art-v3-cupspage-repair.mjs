import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { assertCardArtV3RepairAuthorization } from "./card-art-v3.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");
const maskSourceProjectPath =
  "art/card-art-v3-controls/cups-page-local-repair-mask-001.json";
const recipeProjectPath =
  "art/card-art-v3-repair-recipes/cups-page-local-repair-001.json";
const retryArtifactProjectPath =
  "art/card-art-v3-retry-constraints/cups-page-attempt-004.json";
const authorizationProjectPath = "art/card-art-v3-repair-authorizations.json";
const scriptProjectPath = "scripts/card-art-v3-cupspage-repair.mjs";
const transformContract = Object.freeze({
  colorSpace: "sRGB 8-bit unsigned integer",
  inputLuminance: "floor((77*r + 150*g + 29*b + 128) / 256)",
  copperChroma:
    "floor((96*luminance + 2560 + 128) / 256)",
  targetRed: "clampByte(luminance + copperChroma)",
  targetBlue:
    "clampByte(luminance - roundDiv(3*copperChroma, 4))",
  targetGreen:
    "clampByte(roundDiv(256*luminance - 77*targetRed - 29*targetBlue, 150))",
  clampOrder:
    "compute and clamp targetRed and targetBlue before solving and clamping targetGreen",
  signedRounding:
    "roundDiv rounds halves away from zero; positive alpha-blend numerators round to nearest integer",
  alphaBlend:
    "roundDiv(target*alpha + base*(255-alpha), 255); alpha=0 copies base channel byte-for-byte",
  luminanceTolerance:
    "pixelLuminance(targetRed,targetGreen,targetBlue) differs from input luminance by at most 1",
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function projectPath(value) {
  return resolve(repositoryRoot, value);
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function readJson(projectRelativePath) {
  const bytes = readFileSync(projectPath(projectRelativePath));
  return { bytes, value: JSON.parse(bytes.toString("utf8")) };
}

function clampByte(value) {
  return Math.max(0, Math.min(255, value));
}

function roundDiv(numerator, divisor) {
  if (numerator >= 0) {
    return Math.floor((numerator + Math.floor(divisor / 2)) / divisor);
  }
  return -Math.floor((-numerator + Math.floor(divisor / 2)) / divisor);
}

function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (
    let current = 0, previous = polygon.length - 1;
    current < polygon.length;
    previous = current, current += 1
  ) {
    const [currentX, currentY] = polygon[current];
    const [previousX, previousY] = polygon[previous];
    const crosses =
      currentY > y !== previousY > y &&
      x <
        ((previousX - currentX) * (y - currentY)) /
          (previousY - currentY) +
          currentX;
    if (crosses) inside = !inside;
  }
  return inside;
}

function validateMaskSource(source) {
  if (
    source.schemaVersion !== 1 ||
    source.id !== "cups-page-local-repair-mask-001" ||
    source.cardId !== "cups-page" ||
    source.base?.attemptId !== "cups-page-attempt-002" ||
    source.base?.path !==
      "art/card-art-v3-raw/court-validation-a/cups-page-candidate-002.png" ||
    source.base?.sha256 !==
      "f492c38bf14b754de6cefe865dca0a191fded8bb7c36567344185be47beb71f5" ||
    source.frame?.width !== 1060 ||
    source.frame?.height !== 1484 ||
    source.frame?.channels !== 3 ||
    source.rasterization?.sampleGrid !== 4 ||
    !Array.isArray(source.hairPolygon) ||
    source.hairPolygon.length < 20 ||
    source.basePixelEligibility?.maximumLuminance !== 120 ||
    source.basePixelEligibility?.maximumRed !== 170 ||
    source.outputs?.maskPath !==
      "art/card-art-v3-controls/cups-page-local-repair-mask-001.png" ||
    source.outputs?.overlayPath !==
      "art/card-art-v3-reviews/cups-page-local-repair-mask-overlay-001.png"
  ) {
    throw new Error("Invalid Cups Page reviewed mask source contract.");
  }
  const requiredForbiddenRegions = [
    "face",
    "ear",
    "leftEyebrow",
    "rightEyebrow",
    "cup",
    "garment",
    "backgroundTop",
    "backgroundLeft",
    "backgroundRight",
  ];
  if (
    JSON.stringify(Object.keys(source.forbiddenRegions ?? {})) !==
    JSON.stringify(requiredForbiddenRegions)
  ) {
    throw new Error("Cups Page forbidden-region contract has drifted.");
  }
}

function assertBase(source) {
  const basePath = projectPath(source.base.path);
  if (!existsSync(basePath)) {
    throw new Error(`Missing Cups Page base source ${source.base.path}.`);
  }
  const bytes = readFileSync(basePath);
  if (sha256(bytes) !== source.base.sha256) {
    throw new Error("Cups Page base source SHA-256 has drifted.");
  }
  return basePath;
}

function pixelLuminance(red, green, blue) {
  return Math.floor((77 * red + 150 * green + 29 * blue + 128) / 256);
}

function createMask(base, source) {
  const { height, width } = source.frame;
  const sampleGrid = source.rasterization.sampleGrid;
  const sampleCount = sampleGrid * sampleGrid;
  const mask = Buffer.alloc(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 3;
      const red = base[offset];
      const green = base[offset + 1];
      const blue = base[offset + 2];
      if (
        pixelLuminance(red, green, blue) >
          source.basePixelEligibility.maximumLuminance ||
        red > source.basePixelEligibility.maximumRed
      ) {
        continue;
      }
      let insideSamples = 0;
      for (let sampleY = 0; sampleY < sampleGrid; sampleY += 1) {
        for (let sampleX = 0; sampleX < sampleGrid; sampleX += 1) {
          if (
            pointInPolygon(
              x + (sampleX + 0.5) / sampleGrid,
              y + (sampleY + 0.5) / sampleGrid,
              source.hairPolygon,
            )
          ) {
            insideSamples += 1;
          }
        }
      }
      mask[y * width + x] = roundDiv(insideSamples * 255, sampleCount);
    }
  }
  const forbiddenIntersections = Object.fromEntries(
    Object.entries(source.forbiddenRegions).map(([name, polygon]) => {
      let intersections = 0;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (
            mask[y * width + x] > 0 &&
            pointInPolygon(x + 0.5, y + 0.5, polygon)
          ) {
            intersections += 1;
          }
        }
      }
      return [name, intersections];
    }),
  );
  if (Object.values(forbiddenIntersections).some((count) => count !== 0)) {
    throw new Error(
      `Cups Page hair mask intersects forbidden regions: ${JSON.stringify(forbiddenIntersections)}.`,
    );
  }
  return { forbiddenIntersections, mask };
}

function transformHairPixel(red, green, blue) {
  const luminance = pixelLuminance(red, green, blue);
  const copperChroma = Math.floor((96 * luminance + 2560 + 128) / 256);
  const targetRed = clampByte(luminance + copperChroma);
  const targetBlue = clampByte(
    luminance - roundDiv(3 * copperChroma, 4),
  );
  const targetGreen = clampByte(
    roundDiv(
      256 * luminance - 77 * targetRed - 29 * targetBlue,
      150,
    ),
  );
  if (
    Math.abs(
      pixelLuminance(targetRed, targetGreen, targetBlue) - luminance,
    ) > 1
  ) {
    throw new Error("Cups Page copper transform changed pixel luminance.");
  }
  return [targetRed, targetGreen, targetBlue];
}

function renderRawOutput(base, mask) {
  const output = Buffer.from(base);
  let changedInside = 0;
  let changedOutside = 0;
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const alpha = mask[pixel];
    const offset = pixel * 3;
    const transformed = transformHairPixel(
      base[offset],
      base[offset + 1],
      base[offset + 2],
    );
    let changed = false;
    for (let channel = 0; channel < 3; channel += 1) {
      output[offset + channel] =
        alpha === 0
          ? base[offset + channel]
          : roundDiv(
              transformed[channel] * alpha +
                base[offset + channel] * (255 - alpha),
              255,
            );
      if (output[offset + channel] !== base[offset + channel]) {
        changed = true;
      }
    }
    if (changed) {
      if (alpha === 0) changedOutside += 1;
      else changedInside += 1;
    }
  }
  if (changedInside === 0 || changedOutside !== 0) {
    throw new Error("Cups Page repair violated the exact local-change rule.");
  }
  return { changedInside, changedOutside, output };
}

export function assertCupsPageRepairAuthorizationEnvelope(envelope) {
  if (
    envelope?.schemaVersion !== 1 ||
    envelope?.systemId !== "quiet-celestial-storybook-full-deck" ||
    envelope?.version !== "v3" ||
    !Array.isArray(envelope?.entries) ||
    envelope.entries.length !== 1 ||
    envelope.entries[0]?.id !==
      "cups-page-attempt-004-repair-authorization-001"
  ) {
    throw new Error(
      "Cups Page repair authorization envelope metadata has drifted.",
    );
  }
  return envelope;
}

async function encodePng(raw, width, height, channels) {
  return sharp(raw, { raw: { channels, height, width } }).png().toBuffer();
}

async function renderOverlay(base, mask, source) {
  const { height, width } = source.frame;
  const overlay = Buffer.alloc(width * height * 4);
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const alpha = mask[pixel];
    const offset = pixel * 4;
    overlay[offset] = 235;
    overlay[offset + 1] = 52;
    overlay[offset + 2] = 52;
    overlay[offset + 3] = roundDiv(alpha * 180, 255);
  }
  const forbiddenLayers = [];
  for (const polygon of Object.values(source.forbiddenRegions)) {
    const region = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (!pointInPolygon(x + 0.5, y + 0.5, polygon)) continue;
        const offset = (y * width + x) * 4;
        region[offset] = 35;
        region[offset + 1] = 105;
        region[offset + 2] = 230;
        region[offset + 3] = 45;
      }
    }
    forbiddenLayers.push({
      input: await encodePng(region, width, height, 4),
    });
  }
  return sharp(base, { raw: { channels: 3, height, width } })
    .composite([
      ...forbiddenLayers,
      { input: await encodePng(overlay, width, height, 4) },
    ])
    .png()
    .toBuffer();
}

function verifyCandidateAuthorization(recipe, source, maskSha256) {
  if (!existsSync(projectPath(authorizationProjectPath))) {
    throw new Error(
      "Cups Page candidate rendering is closed until the repair authorization is frozen.",
    );
  }
  const { value: uncheckedEnvelope } = readJson(authorizationProjectPath);
  const envelope =
    assertCupsPageRepairAuthorizationEnvelope(uncheckedEnvelope);
  const authorization = envelope.entries?.find(
    ({ id }) => id === "cups-page-attempt-004-repair-authorization-001",
  );
  const binding = {
    attemptId: "cups-page-attempt-004",
    base: source.base,
    mask: {
      path: source.outputs.maskPath,
      sha256: maskSha256,
    },
    maskSource: {
      path: maskSourceProjectPath,
      sha256: sha256(readFileSync(projectPath(maskSourceProjectPath))),
    },
    neutralOutputPath: recipe.neutralOutputPath,
    recipe: {
      path: recipeProjectPath,
      sha256: sha256(readFileSync(projectPath(recipeProjectPath))),
    },
    retryArtifact: {
      path: retryArtifactProjectPath,
      sha256: sha256(readFileSync(projectPath(retryArtifactProjectPath))),
    },
    script: {
      path: scriptProjectPath,
      sha256: sha256(readFileSync(projectPath(scriptProjectPath))),
    },
  };
  if (
    authorization?.status !== "authorized" ||
    stableStringify(authorization.binding) !== stableStringify(binding)
  ) {
    throw new Error(
      "Cups Page candidate rendering does not match the frozen repair authorization.",
    );
  }
  return assertCardArtV3RepairAuthorization(authorization);
}

function validateRecipe(recipe, source, maskSha256) {
  if (
    recipe.schemaVersion !== 1 ||
    recipe.id !== "cups-page-local-repair-001" ||
    recipe.cardId !== "cups-page" ||
    recipe.mode !== "deterministic-local-color-repair" ||
    recipe.tool !== "Sharp" ||
    recipe.toolVersion !== sharp.versions.sharp ||
    recipe.script?.path !== scriptProjectPath ||
    recipe.script?.sha256 !==
      sha256(readFileSync(projectPath(scriptProjectPath))) ||
    recipe.base?.path !== source.base.path ||
    recipe.base?.sha256 !== source.base.sha256 ||
    recipe.maskSource?.path !== maskSourceProjectPath ||
    recipe.maskSource?.sha256 !==
      sha256(readFileSync(projectPath(maskSourceProjectPath))) ||
    recipe.mask?.path !== source.outputs.maskPath ||
    recipe.mask?.sha256 !== maskSha256 ||
    recipe.neutralOutputPath !==
      "art/card-art-v3-candidates/cups-page-attempt-004.raw.png" ||
    stableStringify(recipe.transform) !== stableStringify(transformContract)
  ) {
    throw new Error("Invalid Cups Page deterministic repair recipe.");
  }
}

export async function renderCupsPageLocalRepair({ candidate = false } = {}) {
  const { bytes: maskSourceBytes, value: source } =
    readJson(maskSourceProjectPath);
  validateMaskSource(source);
  const basePath = assertBase(source);
  const { data: base, info } = await sharp(basePath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (
    info.width !== source.frame.width ||
    info.height !== source.frame.height ||
    info.channels !== source.frame.channels
  ) {
    throw new Error("Cups Page base frame does not match the mask source.");
  }
  const { forbiddenIntersections, mask } = createMask(base, source);
  const maskPng = await encodePng(
    mask,
    source.frame.width,
    source.frame.height,
    1,
  );
  const overlayPng = await renderOverlay(base, mask, source);
  const result = {
    baseSha256: source.base.sha256,
    forbiddenIntersections,
    maskPng,
    maskSha256: sha256(maskPng),
    maskSourceSha256: sha256(maskSourceBytes),
    overlayPng,
    overlaySha256: sha256(overlayPng),
  };
  if (!candidate) return result;
  const { bytes: recipeBytes, value: recipe } = readJson(recipeProjectPath);
  validateRecipe(recipe, source, result.maskSha256);
  const authorization = verifyCandidateAuthorization(
    recipe,
    source,
    result.maskSha256,
  );
  const repaired = renderRawOutput(base, mask);
  const outputPng = await encodePng(
    repaired.output,
    source.frame.width,
    source.frame.height,
    3,
  );
  return {
    ...result,
    authorizationId: authorization.id,
    changedInside: repaired.changedInside,
    changedOutside: repaired.changedOutside,
    outputPath: recipe.neutralOutputPath,
    outputPng,
    outputSha256: sha256(outputPng),
    recipeSha256: sha256(recipeBytes),
  };
}

async function writeAtomically(path, bytes, replace) {
  if (existsSync(path) && !replace) {
    throw new Error(`Refusing to overwrite ${path}; pass --replace explicitly.`);
  }
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp-${process.pid}`;
  try {
    await writeFile(temporaryPath, bytes);
    await rename(temporaryPath, path);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const candidate = args.includes("--candidate") || args.includes("--check");
  const checkOnly = args.includes("--check");
  const replace = args.includes("--replace");
  const rendered = await renderCupsPageLocalRepair({ candidate });
  const { value: source } = readJson(maskSourceProjectPath);
  if (!candidate) {
    if (!checkOnly) {
      await writeAtomically(
        projectPath(source.outputs.maskPath),
        rendered.maskPng,
        replace,
      );
      await writeAtomically(
        projectPath(source.outputs.overlayPath),
        rendered.overlayPng,
        replace,
      );
    }
  } else if (checkOnly) {
    const existingOutput = readFileSync(projectPath(rendered.outputPath));
    if (
      sha256(existingOutput) !== rendered.outputSha256 ||
      !existingOutput.equals(rendered.outputPng)
    ) {
      throw new Error(
        "Cups Page neutral staging output does not match deterministic rerendering.",
      );
    }
  } else {
    await writeAtomically(
      projectPath(rendered.outputPath),
      rendered.outputPng,
      replace,
    );
  }
  console.log(
    JSON.stringify(
      {
        authorizationId: rendered.authorizationId ?? null,
        baseSha256: rendered.baseSha256,
        changedInside: rendered.changedInside ?? null,
        changedOutside: rendered.changedOutside ?? null,
        forbiddenIntersections: rendered.forbiddenIntersections,
        maskPath: source.outputs.maskPath,
        maskSha256: rendered.maskSha256,
        maskSourceSha256: rendered.maskSourceSha256,
        outputPath: rendered.outputPath ?? null,
        outputSha256: rendered.outputSha256 ?? null,
        overlayPath: source.outputs.overlayPath,
        overlaySha256: rendered.overlaySha256,
        recipeSha256: rendered.recipeSha256 ?? null,
        toolVersion: sharp.versions.sharp,
      },
      null,
      2,
    ),
  );
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
