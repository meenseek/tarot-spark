import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const repositoryRoot = resolve(import.meta.dirname, "..");
const recipeProjectPath =
  "art/card-art-v3-repair-recipes/the-devil-local-repair-001.json";
const scriptProjectPath = "scripts/card-art-v3-thedevil-repair.mjs";
const previewRoot = "/tmp/tarot-spark-devil-repair-preview";

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

function segmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const progress =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared),
        );
  return Math.hypot(px - (x1 + progress * dx), py - (y1 + progress * dy));
}

function pathDistance(x, y, path) {
  let distance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < path.length; index += 1) {
    distance = Math.min(
      distance,
      segmentDistance(x, y, ...path[index - 1], ...path[index]),
    );
  }
  return distance;
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

function polygonAlpha(x, y, polygon, featherPixels) {
  if (!pointInPolygon(x, y, polygon)) return 0;
  let distance = Number.POSITIVE_INFINITY;
  for (
    let current = 0, previous = polygon.length - 1;
    current < polygon.length;
    previous = current, current += 1
  ) {
    distance = Math.min(
      distance,
      segmentDistance(x, y, ...polygon[previous], ...polygon[current]),
    );
  }
  return Math.max(
    0,
    Math.min(255, Math.round((255 * distance) / featherPixels)),
  );
}

function tubeAlpha(x, y, path, innerRadius, outerRadius) {
  const distance = pathDistance(x, y, path);
  if (distance <= innerRadius) return 255;
  if (distance >= outerRadius) return 0;
  return Math.round(
    (255 * (outerRadius - distance)) / (outerRadius - innerRadius),
  );
}

function applyCircleProtection(alpha, x, y, protection) {
  if (!protection) return alpha;
  const distance = Math.hypot(
    x - protection.center[0],
    y - protection.center[1],
  );
  if (distance < protection.innerRadius) return 0;
  if (distance >= protection.outerRadius) return alpha;
  return Math.min(
    alpha,
    Math.round(
      (255 * (distance - protection.innerRadius)) /
        (protection.outerRadius - protection.innerRadius),
    ),
  );
}

function buildMask(layer, width, height) {
  const mask = Buffer.alloc(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sampleX = x + 0.5;
      const sampleY = y + 0.5;
      let alpha =
        layer.kind === "polygon"
          ? polygonAlpha(
              sampleX,
              sampleY,
              layer.polygon,
              layer.featherPixels,
            )
          : tubeAlpha(
              sampleX,
              sampleY,
              layer.pathPoints,
              layer.innerRadius,
              layer.outerRadius,
            );
      if (layer.excludeTube) {
        const distance = pathDistance(
          sampleX,
          sampleY,
          layer.excludeTube.path,
        );
        if (distance < layer.excludeTube.innerRadius) alpha = 0;
        else if (distance < layer.excludeTube.outerRadius) {
          alpha = Math.min(
            alpha,
            Math.round(
              (255 * (distance - layer.excludeTube.innerRadius)) /
                (layer.excludeTube.outerRadius -
                  layer.excludeTube.innerRadius),
            ),
          );
        }
      }
      alpha = applyCircleProtection(
        alpha,
        sampleX,
        sampleY,
        layer.protectCircle,
      );
      if (
        layer.protectRectangle &&
        x >= layer.protectRectangle.minX &&
        x <= layer.protectRectangle.maxX &&
        y >= layer.protectRectangle.minY &&
        y <= layer.protectRectangle.maxY
      ) {
        alpha = 0;
      }
      mask[y * width + x] = alpha;
    }
  }
  return mask;
}

function validateRecipe(recipe) {
  const expectedLayers = [
    "leftErase",
    "leftNew",
    "rightErase",
    "rightConnector",
    "rightNew",
  ];
  if (
    recipe.schemaVersion !== 1 ||
    recipe.id !== "the-devil-local-repair-001" ||
    recipe.cardId !== "the-devil" ||
    recipe.tool !== "Sharp" ||
    recipe.toolVersion !== sharp.versions.sharp ||
    recipe.mode !== "deterministic-local-composite" ||
    recipe.script?.path !== scriptProjectPath ||
    recipe.script?.sha256 !==
      sha256(readFileSync(projectPath(scriptProjectPath))) ||
    recipe.frame?.width !== 1060 ||
    recipe.frame?.height !== 1484 ||
    recipe.frame?.channels !== 3 ||
    recipe.registration?.kernel !== "lanczos3" ||
    recipe.registration?.fit !== "fill" ||
    JSON.stringify(recipe.precedence) !== JSON.stringify(expectedLayers) ||
    JSON.stringify(Object.keys(recipe.layers ?? {})) !==
      JSON.stringify(expectedLayers) ||
    !isCanonicalUtcTimestamp(recipe.review?.reviewedAt) ||
    !/^[a-f0-9]{64}$/.test(recipe.expectedOutputSha256 ?? "")
  ) {
    throw new Error("Invalid Devil deterministic repair recipe.");
  }
  for (const name of expectedLayers) {
    const layer = recipe.layers[name];
    if (
      layer.name !== name ||
      !["left", "right"].includes(layer.side) ||
      !["polygon", "tube"].includes(layer.kind) ||
      !/^[a-f0-9]{64}$/.test(layer.sha256 ?? "") ||
      typeof layer.path !== "string"
    ) {
      throw new Error(`Invalid reviewed layer ${name}.`);
    }
  }
}

async function registerDonor(path, recipe) {
  const registered = await sharp(path)
    .resize(recipe.frame.width, recipe.frame.height, {
      fit: recipe.registration.fit,
      kernel: recipe.registration.kernel,
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (
    registered.info.width !== recipe.frame.width ||
    registered.info.height !== recipe.frame.height ||
    registered.info.channels !== recipe.frame.channels
  ) {
    throw new Error("Registered donor frame does not match the base frame.");
  }
  const png = await sharp(registered.data, { raw: registered.info })
    .png()
    .toBuffer();
  return { ...registered, png, sha256: sha256(png) };
}

function measureMappingResidual(registration, donor) {
  let maximum = 0;
  for (const landmark of donor.landmarks) {
    const mappedX = landmark.source[0] * registration.scaleX;
    const mappedY = landmark.source[1] * registration.scaleY;
    maximum = Math.max(
      maximum,
      Math.abs(mappedX - landmark.target[0]),
      Math.abs(mappedY - landmark.target[1]),
    );
  }
  return maximum;
}

function bbox(mask, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let nonzero = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] === 0) continue;
      nonzero += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return { maxX, maxY, minX, minY, nonzero };
}

function applyLayer(output, base, donor, mask) {
  let changed = 0;
  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const alpha = mask[pixel];
    if (alpha === 0) continue;
    const offset = pixel * 3;
    let pixelChanged = false;
    for (let channel = 0; channel < 3; channel += 1) {
      const value = Math.round(
        (donor[offset + channel] * alpha +
          output[offset + channel] * (255 - alpha)) /
          255,
      );
      if (value !== output[offset + channel]) pixelChanged = true;
      output[offset + channel] = value;
    }
    if (pixelChanged) changed += 1;
  }
  return changed;
}

function countProtectedChanges(output, base, width, region) {
  let changed = 0;
  for (let y = region.minY; y <= region.maxY; y += 1) {
    for (let x = region.minX; x <= region.maxX; x += 1) {
      const offset = (y * width + x) * 3;
      if (
        output[offset] !== base[offset] ||
        output[offset + 1] !== base[offset + 1] ||
        output[offset + 2] !== base[offset + 2]
      ) {
        changed += 1;
      }
    }
  }
  return changed;
}

export async function renderDevilLocalRepair({ preview = false } = {}) {
  const recipeBytes = readFileSync(projectPath(recipeProjectPath));
  const recipe = JSON.parse(recipeBytes.toString("utf8"));
  validateRecipe(recipe);
  const basePath = verifySource(recipe.base, "base source");
  const leftPath = verifySource(recipe.donors.left, "left donor");
  const rightPath = verifySource(recipe.donors.right, "right donor");
  const [base, left, right] = await Promise.all([
    sharp(basePath).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    registerDonor(leftPath, recipe),
    registerDonor(rightPath, recipe),
  ]);
  if (
    base.info.width !== recipe.frame.width ||
    base.info.height !== recipe.frame.height ||
    base.info.channels !== recipe.frame.channels
  ) {
    throw new Error("Base source does not match the reviewed RGB frame.");
  }
  const mappingResidual = {
    left: measureMappingResidual(recipe.registration, recipe.donors.left),
    right: measureMappingResidual(recipe.registration, recipe.donors.right),
  };
  if (
    mappingResidual.left > recipe.registration.maximumLandmarkResidual ||
    mappingResidual.right > recipe.registration.maximumLandmarkResidual
  ) {
    throw new Error("Donor registration exceeds the reviewed landmark residual.");
  }
  const masks = Object.fromEntries(
    recipe.precedence.map((name) => [
      name,
      buildMask(
        recipe.layers[name],
        recipe.frame.width,
        recipe.frame.height,
      ),
    ]),
  );
  const maskPng = Object.fromEntries(
    await Promise.all(
      recipe.precedence.map(async (name) => [
        name,
        await sharp(masks[name], {
          raw: {
            channels: 1,
            height: recipe.frame.height,
            width: recipe.frame.width,
          },
        })
          .png()
          .toBuffer(),
      ]),
    ),
  );
  const output = Buffer.from(base.data);
  const layerChanges = {};
  for (const name of recipe.precedence) {
    const donor = recipe.layers[name].side === "left" ? left.data : right.data;
    layerChanges[name] = applyLayer(
      output,
      base.data,
      donor,
      masks[name],
    );
  }
  let changedInside = 0;
  let changedOutside = 0;
  let leftRightOverlap = 0;
  let unionNonzero = 0;
  for (let pixel = 0; pixel < recipe.frame.width * recipe.frame.height; pixel += 1) {
    const leftNonzero = masks.leftErase[pixel] || masks.leftNew[pixel];
    const rightNonzero =
      masks.rightErase[pixel] ||
      masks.rightConnector[pixel] ||
      masks.rightNew[pixel];
    const inUnion = leftNonzero || rightNonzero;
    if (leftNonzero && rightNonzero) leftRightOverlap += 1;
    if (inUnion) unionNonzero += 1;
    const offset = pixel * 3;
    const changed =
      output[offset] !== base.data[offset] ||
      output[offset + 1] !== base.data[offset + 1] ||
      output[offset + 2] !== base.data[offset + 2];
    if (!changed) continue;
    if (inUnion) changedInside += 1;
    else changedOutside += 1;
  }
  const centralBridgeChanged = countProtectedChanges(
    output,
    base.data,
    recipe.frame.width,
    recipe.protectedRegions.centralBridge,
  );
  let rightGuideChanged = 0;
  const rightGuide = recipe.protectedRegions.rightGuideCircle;
  for (let y = 0; y < recipe.frame.height; y += 1) {
    for (let x = 0; x < recipe.frame.width; x += 1) {
      if (
        Math.hypot(x + 0.5 - rightGuide.center[0], y + 0.5 - rightGuide.center[1]) >=
        rightGuide.radius
      ) {
        continue;
      }
      const offset = (y * recipe.frame.width + x) * 3;
      if (
        output[offset] !== base.data[offset] ||
        output[offset + 1] !== base.data[offset + 1] ||
        output[offset + 2] !== base.data[offset + 2]
      ) {
        rightGuideChanged += 1;
      }
    }
  }
  if (
    changedInside === 0 ||
    changedOutside !== 0 ||
    leftRightOverlap !== 0 ||
    centralBridgeChanged !== 0 ||
    rightGuideChanged !== 0
  ) {
    throw new Error(
      `Devil repair violated a fail-closed local-composite gate: ${JSON.stringify({
        centralBridgeChanged,
        changedInside,
        changedOutside,
        leftRightOverlap,
        rightGuideChanged,
      })}.`,
    );
  }
  const outputPng = await sharp(output, { raw: base.info }).png().toBuffer();
  const artifacts = {
    masks: Object.fromEntries(
      recipe.precedence.map((name) => [name, sha256(maskPng[name])]),
    ),
    output: sha256(outputPng),
    registeredLeft: left.sha256,
    registeredRight: right.sha256,
  };
  if (!preview) {
    if (
      artifacts.output !== recipe.expectedOutputSha256 ||
      artifacts.registeredLeft !== recipe.registeredDonors.left.sha256 ||
      artifacts.registeredRight !== recipe.registeredDonors.right.sha256 ||
      recipe.precedence.some(
        (name) => artifacts.masks[name] !== recipe.layers[name].sha256,
      )
    ) {
      throw new Error("Rendered Devil artifacts do not match reviewed SHA-256 values.");
    }
    for (const [path, bytes, expected] of [
      [recipe.registeredDonors.left.path, left.png, artifacts.registeredLeft],
      [recipe.registeredDonors.right.path, right.png, artifacts.registeredRight],
      ...recipe.precedence.map((name) => [
        recipe.layers[name].path,
        maskPng[name],
        artifacts.masks[name],
      ]),
    ]) {
      const absolutePath = projectPath(path);
      if (!existsSync(absolutePath)) {
        throw new Error(`Missing reviewed Devil artifact ${path}.`);
      }
      const committed = readFileSync(absolutePath);
      if (sha256(committed) !== expected || !committed.equals(bytes)) {
        throw new Error(`Reviewed Devil artifact ${path} has drifted.`);
      }
    }
  }
  return {
    artifacts,
    baseSha256: recipe.base.sha256,
    bboxes: Object.fromEntries(
      recipe.precedence.map((name) => [
        name,
        bbox(masks[name], recipe.frame.width, recipe.frame.height),
      ]),
    ),
    centralBridgeChanged,
    changedInside,
    changedOutside,
    layerChanges,
    leftRightOverlap,
    mappingResidual,
    maskPng,
    outputPng,
    recipe,
    recipeSha256: sha256(recipeBytes),
    registeredLeftPng: left.png,
    registeredRightPng: right.png,
    rightGuideChanged,
    unionNonzero,
  };
}

async function writeArtifact(path, bytes, replace) {
  if (existsSync(path) && !replace) {
    throw new Error(`Refusing to overwrite ${path}; pass --replace explicitly.`);
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
}

async function main() {
  const args = process.argv.slice(2);
  const preview = args.includes("--preview");
  const check = args.includes("--check");
  const replace = args.includes("--replace");
  if (preview && check) throw new Error("Choose either --preview or --check.");
  const rendered = await renderDevilLocalRepair({ preview });
  if (!check) {
    const root = preview ? previewRoot : repositoryRoot;
    const resolveOutput = (projectRelativePath) =>
      preview
        ? resolve(root, projectRelativePath.replaceAll("/", "__"))
        : projectPath(projectRelativePath);
    await Promise.all([
      writeArtifact(
        resolveOutput(rendered.recipe.registeredDonors.left.path),
        rendered.registeredLeftPng,
        replace,
      ),
      writeArtifact(
        resolveOutput(rendered.recipe.registeredDonors.right.path),
        rendered.registeredRightPng,
        replace,
      ),
      ...rendered.recipe.precedence.map((name) =>
        writeArtifact(
          resolveOutput(rendered.recipe.layers[name].path),
          rendered.maskPng[name],
          replace,
        ),
      ),
      writeArtifact(
        resolveOutput(rendered.recipe.outputPath),
        rendered.outputPng,
        replace,
      ),
    ]);
  }
  const {
    maskPng: _maskPng,
    outputPng: _outputPng,
    recipe: _recipe,
    registeredLeftPng: _registeredLeftPng,
    registeredRightPng: _registeredRightPng,
    ...result
  } = rendered;
  console.log(
    JSON.stringify(
      {
        ...result,
        outputPath: rendered.recipe.outputPath,
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
