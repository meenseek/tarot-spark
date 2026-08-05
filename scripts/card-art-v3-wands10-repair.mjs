import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const repositoryRoot = resolve(import.meta.dirname, "..");
const recipePath = resolve(
  repositoryRoot,
  "art/card-art-v3-repair-recipes/wands-10-local-repair-001.json",
);
const scriptProjectPath = "scripts/card-art-v3-wands10-repair.mjs";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function projectPath(value) {
  return resolve(repositoryRoot, value);
}

function isCanonicalUtcTimestamp(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/.test(value) &&
    new Date(value).toISOString() === value
  );
}

function verifySource(source, label) {
  const path = projectPath(source.path);
  if (!existsSync(path)) throw new Error(`Missing ${label} ${source.path}.`);
  const bytes = readFileSync(path);
  if (sha256(bytes) !== source.sha256) {
    throw new Error(`${label} SHA-256 does not match the frozen recipe.`);
  }
  return path;
}

function interpolateY(left, right, x, leftX, rightX) {
  return left + ((right - left) * (x - leftX)) / (rightX - leftX);
}

function createMask(recipe) {
  const { featherPixels, height, outerPolygon, width } = recipe.mask;
  const [topLeft, topRight, bottomRight, bottomLeft] = outerPolygon;
  if (
    width !== 1060 ||
    height !== 1484 ||
    JSON.stringify(outerPolygon) !==
      JSON.stringify([
        [58, 338],
        [640, 399],
        [640, 500],
        [58, 438],
      ]) ||
    featherPixels.left !== 8 ||
    featherPixels.right !== 8 ||
    featherPixels.top !== 8 ||
    featherPixels.bottom !== 5
  ) {
    throw new Error("The reviewed Wands Ten mask geometry has drifted.");
  }
  const mask = Buffer.alloc(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = topLeft[0]; x <= topRight[0]; x += 1) {
      const sampleX = x + 0.5;
      const sampleY = y + 0.5;
      const topY = interpolateY(
        topLeft[1],
        topRight[1],
        sampleX,
        topLeft[0],
        topRight[0],
      );
      const bottomY = interpolateY(
        bottomLeft[1],
        bottomRight[1],
        sampleX,
        bottomLeft[0],
        bottomRight[0],
      );
      const alpha = Math.min(
        1,
        (sampleX - topLeft[0]) / featherPixels.left,
        (topRight[0] - sampleX) / featherPixels.right,
        (sampleY - topY) / featherPixels.top,
        (bottomY - sampleY) / featherPixels.bottom,
      );
      if (alpha > 0) {
        mask[y * width + x] = Math.round(Math.max(0, alpha) * 255);
      }
    }
  }
  return mask;
}

export async function renderWands10LocalRepair() {
  const recipeBytes = readFileSync(recipePath);
  const recipe = JSON.parse(recipeBytes.toString("utf8"));
  if (
    recipe.schemaVersion !== 1 ||
    recipe.id !== "wands-10-local-repair-001" ||
    recipe.cardId !== "wands-10" ||
    recipe.tool !== "Sharp" ||
    recipe.toolVersion !== sharp.versions.sharp ||
    recipe.mode !== "deterministic-local-composite" ||
    recipe.base.attemptId !== "wands-10-attempt-014" ||
    recipe.base.path !==
      "art/card-art-v3-raw/pilot-wands/wands-10-candidate-014-rejected.png" ||
    recipe.donor.attemptId !== "wands-10-attempt-013" ||
    recipe.donor.path !==
      "art/card-art-v3-raw/pilot-wands/wands-10-candidate-013-rejected.png" ||
    recipe.mask.path !==
      "art/card-art-v3-controls/wands-10-local-repair-mask-001.png" ||
    recipe.outputPath !==
      "art/card-art-v3-raw/pilot-wands/wands-10-candidate-016.png" ||
    recipe.script?.path !== scriptProjectPath ||
    recipe.script?.sha256 !==
      sha256(readFileSync(projectPath(scriptProjectPath))) ||
    !isCanonicalUtcTimestamp(recipe.review?.reviewedAt) ||
    !/^[a-f0-9]{64}$/.test(recipe.mask.sha256 ?? "") ||
    !/^[a-f0-9]{64}$/.test(recipe.expectedOutputSha256 ?? "")
  ) {
    throw new Error("Invalid Wands Ten deterministic repair recipe.");
  }
  const basePath = verifySource(recipe.base, "base source");
  const donorPath = verifySource(recipe.donor, "sky donor");
  const [base, donor] = await Promise.all([
    sharp(basePath).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(donorPath).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  if (
    base.info.width !== recipe.mask.width ||
    base.info.height !== recipe.mask.height ||
    base.info.channels !== 3 ||
    donor.info.width !== base.info.width ||
    donor.info.height !== base.info.height ||
    donor.info.channels !== 3
  ) {
    throw new Error("Repair sources do not share the reviewed RGB frame.");
  }
  const mask = createMask(recipe);
  const output = Buffer.alloc(base.data.length);
  let changedInside = 0;
  let changedOutside = 0;
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const alpha = mask[pixel];
    const offset = pixel * 3;
    let changed = false;
    for (let channel = 0; channel < 3; channel += 1) {
      output[offset + channel] =
        alpha === 0
          ? base.data[offset + channel]
          : Math.round(
              (donor.data[offset + channel] * alpha +
                base.data[offset + channel] * (255 - alpha)) /
                255,
            );
      if (output[offset + channel] !== base.data[offset + channel]) {
        changed = true;
      }
    }
    if (changed) {
      if (alpha === 0) changedOutside += 1;
      else changedInside += 1;
    }
  }
  if (changedOutside !== 0 || changedInside === 0) {
    throw new Error("Repair must change pixels only inside the reviewed mask.");
  }
  const [maskPng, outputPng] = await Promise.all([
    sharp(mask, {
      raw: {
        channels: 1,
        height: recipe.mask.height,
        width: recipe.mask.width,
      },
    })
      .png()
      .toBuffer(),
    sharp(output, {
      raw: { channels: 3, height: base.info.height, width: base.info.width },
    })
      .png()
      .toBuffer(),
  ]);
  const committedMaskPath = projectPath(recipe.mask.path);
  if (!existsSync(committedMaskPath)) {
    throw new Error("The independently reviewed repair mask is missing.");
  }
  const committedMask = readFileSync(committedMaskPath);
  if (
    sha256(committedMask) !== recipe.mask.sha256 ||
    sha256(maskPng) !== recipe.mask.sha256 ||
    !committedMask.equals(maskPng)
  ) {
    throw new Error(
      "The generated repair mask does not match the committed reviewed mask.",
    );
  }
  if (sha256(outputPng) !== recipe.expectedOutputSha256) {
    throw new Error(
      "The deterministic repair output does not match the reviewed SHA-256.",
    );
  }
  return {
    baseSha256: recipe.base.sha256,
    changedInside,
    changedOutside,
    donorSha256: recipe.donor.sha256,
    maskPng,
    maskSha256: sha256(maskPng),
    outputPng,
    outputSha256: sha256(outputPng),
    recipe,
    recipeSha256: sha256(recipeBytes),
  };
}

async function writeAtomically(path, bytes, replace) {
  if (existsSync(path) && !replace) {
    throw new Error(
      `Refusing to overwrite ${path}; pass --replace explicitly.`,
    );
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
  const rendered = await renderWands10LocalRepair();
  const args = process.argv.slice(2);
  const replace = args.includes("--replace");
  const checkOnly = args.includes("--check");
  const maskPath = projectPath(rendered.recipe.mask.path);
  const outputPath = projectPath(rendered.recipe.outputPath);
  if (!checkOnly) {
    await writeAtomically(maskPath, rendered.maskPng, replace);
    await writeAtomically(outputPath, rendered.outputPng, replace);
  }
  console.log(
    JSON.stringify(
      {
        baseSha256: rendered.baseSha256,
        changedInside: rendered.changedInside,
        changedOutside: rendered.changedOutside,
        donorSha256: rendered.donorSha256,
        maskPath: rendered.recipe.mask.path,
        maskSha256: rendered.maskSha256,
        outputPath: rendered.recipe.outputPath,
        outputSha256: rendered.outputSha256,
        recipeSha256: rendered.recipeSha256,
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
