import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = resolve(scriptDirectory, "..");
const manifestRelativePath = "art/card-art-manifest.json";
const historyRelativePath = "art/card-art-style-history.json";
const startOfFrameMarkers = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

export function loadCardArtFiles(repositoryRoot = defaultRepositoryRoot) {
  return {
    history: readJson(resolve(repositoryRoot, historyRelativePath)),
    manifest: readJson(resolve(repositoryRoot, manifestRelativePath)),
  };
}

export function buildCardArtPrompt(manifest, cardId) {
  const card = getCard(manifest, cardId);
  const castById = new Map(manifest.cast.map((member) => [member.id, member]));
  const locationById = new Map(
    manifest.locations.map((location) => [location.id, location]),
  );
  const castDescriptions = card.castIds.map((castId) => {
    const member = castById.get(castId);

    if (!member) {
      throw new Error(`Unknown cast id "${castId}" for ${card.id}.`);
    }

    return member.description;
  });
  const location = locationById.get(card.locationId);

  if (!location) {
    throw new Error(`Unknown location id "${card.locationId}" for ${card.id}.`);
  }

  return [
    manifest.prompt.shared,
    "",
    `CARD DIRECTION — ${card.name}`,
    `Recurring cast: ${castDescriptions.join(" ")}`,
    `Observable gesture: ${card.gesture}`,
    `Location family: ${location.description}`,
    `Dominant symbol: ${card.dominantSymbol}.`,
    `Supporting symbols: ${card.supportingSymbols.join("; ")}.`,
    `Emotional movement: ${card.emotionalMovement}`,
    "",
    "SYMBOL GRAMMAR",
    ...manifest.symbolGrammar.map((rule) => `- ${rule}`),
    "",
    "REFERENCE CONTROL",
    manifest.referencePolicy.instruction,
    "",
    "OUTPUT CONTRACT",
    `Create one portrait source illustration for an exact ${manifest.frame.aspectRatio} crop. The approved delivery file is ${manifest.frame.width} x ${manifest.frame.height} pixels. Keep the dominant symbol in the top ${manifest.frame.topSafeAreaPercent} percent, faces and hands inside the central ${manifest.frame.centralCharacterSafeAreaPercent} percent, and grounding scenery in the lower ${manifest.frame.groundingAreaPercent} percent.`,
    "",
    "NEGATIVE",
    manifest.prompt.negative,
  ].join("\n");
}

export function getCardArtPromptRecord(
  manifest,
  cardId,
  repositoryRoot = defaultRepositoryRoot,
) {
  const card = getCard(manifest, cardId);
  const cardById = new Map(
    manifest.cards.map((candidate) => [candidate.id, candidate]),
  );
  const referenceImagePaths = card.referenceCardIds.map((referenceCardId) => {
    const referenceCard = cardById.get(referenceCardId);

    if (!referenceCard) {
      throw new Error(
        `Unknown reference card id "${referenceCardId}" for ${card.id}.`,
      );
    }

    if (referenceCard.status !== "approved-pilot") {
      throw new Error(
        `Reference card "${referenceCardId}" must be an approved pilot.`,
      );
    }

    const referencePath = resolve(repositoryRoot, referenceCard.assetPath);

    if (!existsSync(referencePath)) {
      throw new Error(`Missing approved reference image ${referencePath}.`);
    }

    return referencePath;
  });
  const prompt = buildCardArtPrompt(manifest, cardId);
  const referenceInput = manifest.generator.referenceInput;

  if (referenceInput !== "referenced_image_paths") {
    throw new Error(
      'manifest.generator.referenceInput must remain "referenced_image_paths".',
    );
  }

  return {
    mode: manifest.generator.mode,
    prompt,
    promptSha256: sha256(prompt),
    [referenceInput]: referenceImagePaths,
    systemId: manifest.systemId,
    version: manifest.version,
  };
}

export function getCardArtLocks(
  manifest,
  repositoryRoot = defaultRepositoryRoot,
) {
  const approvedCards = manifest.cards.filter(
    (card) => card.status === "approved-pilot",
  );
  const promptSha256 = Object.fromEntries(
    manifest.cards.map((card) => [
      card.id,
      sha256(buildCardArtPrompt(manifest, card.id)),
    ]),
  );
  const assetSha256 = Object.fromEntries(
    approvedCards
      .map((card) => [
        card.assetPath,
        sha256(readFileSync(resolve(repositoryRoot, card.assetPath))),
      ])
      .sort(([left], [right]) => left.localeCompare(right)),
  );
  const approvedCastIds = new Set(
    approvedCards.flatMap((card) => card.castIds),
  );
  const approvedLocationIds = new Set(
    approvedCards.map((card) => card.locationId),
  );
  const approvedCardGenerationLocks = Object.fromEntries(
    approvedCards.map((card) => [
      card.id,
      {
        promptSha256: promptSha256[card.id],
        referenceCardIds: card.referenceCardIds,
      },
    ]),
  );
  const styleInputs = {
    approvedCardGenerationLocks,
    assetSha256,
    cast: Object.fromEntries(
      manifest.cast
        .filter((member) => approvedCastIds.has(member.id))
        .map((member) => [member.id, member.description]),
    ),
    frame: manifest.frame,
    generator: manifest.generator,
    locations: Object.fromEntries(
      manifest.locations
        .filter((location) => approvedLocationIds.has(location.id))
        .map((location) => [location.id, location.description]),
    ),
    prompt: manifest.prompt,
    referencePolicy: manifest.referencePolicy,
    symbolGrammar: manifest.symbolGrammar,
    systemId: manifest.systemId,
  };

  return {
    assetSha256,
    promptSha256,
    styleFingerprintSha256: sha256(stableStringify(styleInputs)),
  };
}

export function loadBaselineHistory(
  repositoryRoot = defaultRepositoryRoot,
  explicitBaseRef,
) {
  const baseRef = explicitBaseRef || "HEAD";

  if (!gitRefExists(repositoryRoot, baseRef)) {
    if (explicitBaseRef) {
      throw new Error(`Cannot resolve card-art baseline ref "${baseRef}".`);
    }

    return undefined;
  }

  if (!gitPathExistsAtRef(repositoryRoot, baseRef, historyRelativePath)) {
    return undefined;
  }

  let content;

  try {
    content = execFileSync(
      "git",
      ["show", `${baseRef}:${historyRelativePath}`],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch (error) {
    throw new Error(
      `Cannot read card-art baseline ${baseRef}:${historyRelativePath}.`,
      { cause: error },
    );
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Card-art baseline ${baseRef}:${historyRelativePath} is not valid JSON.`,
      { cause: error },
    );
  }
}

export function validateCardArtSystem({
  baselineHistory,
  history,
  manifest,
  repositoryRoot = defaultRepositoryRoot,
}) {
  const errors = [];
  const requireString = (value, label) => {
    if (typeof value !== "string" || value.trim() === "") {
      errors.push(`${label} must be a non-empty string.`);
    }
  };

  requireString(manifest.systemId, "manifest.systemId");
  requireString(manifest.version, "manifest.version");
  requireString(manifest.prompt?.shared, "manifest.prompt.shared");
  requireString(manifest.prompt?.negative, "manifest.prompt.negative");

  if (
    manifest.generator?.mode !== "default" ||
    manifest.generator?.referenceInput !== "referenced_image_paths"
  ) {
    errors.push(
      'manifest.generator must keep mode "default" and referenceInput "referenced_image_paths".',
    );
  }

  if (
    !Array.isArray(manifest.symbolGrammar) ||
    manifest.symbolGrammar.length === 0 ||
    manifest.symbolGrammar.some(
      (rule) => typeof rule !== "string" || rule.trim() === "",
    )
  ) {
    errors.push("manifest.symbolGrammar must contain non-empty rules.");
  }

  if (
    manifest.frame?.aspectRatio !== "5:7" ||
    manifest.frame?.width !== 700 ||
    manifest.frame?.height !== 980
  ) {
    errors.push("manifest.frame must remain an exact 5:7, 700 x 980 contract.");
  }

  const castIds = collectUniqueIds(manifest.cast, "cast", errors);
  const locationIds = collectUniqueIds(manifest.locations, "location", errors);
  const cardIds = collectUniqueIds(manifest.cards, "card", errors);
  const approvedCards = manifest.cards.filter(
    (card) => card.status === "approved-pilot",
  );
  const approvedCardIds = new Set(approvedCards.map((card) => card.id));

  if (
    manifest.referencePolicy?.requiredForNewCards !== true ||
    !Number.isInteger(manifest.referencePolicy?.maximumImages) ||
    manifest.referencePolicy.maximumImages < 1 ||
    manifest.referencePolicy.maximumImages > 2
  ) {
    errors.push(
      "manifest.referencePolicy must require one or two approved reference images.",
    );
  }

  manifest.cards.forEach((card) => {
    requireString(card.name, `card ${card.id}.name`);
    requireString(card.assetPath, `card ${card.id}.assetPath`);
    requireString(card.gesture, `card ${card.id}.gesture`);
    requireString(card.dominantSymbol, `card ${card.id}.dominantSymbol`);
    requireString(card.emotionalMovement, `card ${card.id}.emotionalMovement`);

    if (card.status !== "draft" && card.status !== "approved-pilot") {
      errors.push(
        `card ${card.id}.status must be "draft" or "approved-pilot".`,
      );
    }

    if (
      !Array.isArray(card.castIds) ||
      card.castIds.length === 0 ||
      card.castIds.some((castId) => !castIds.has(castId))
    ) {
      errors.push(`card ${card.id} must use known recurring cast ids.`);
    }

    if (!locationIds.has(card.locationId)) {
      errors.push(`card ${card.id} must use a known location id.`);
    }

    if (
      !Array.isArray(card.supportingSymbols) ||
      card.supportingSymbols.length > 2
    ) {
      errors.push(
        `card ${card.id} may use no more than two supporting symbols.`,
      );
    }

    if (
      !Array.isArray(card.referenceCardIds) ||
      card.referenceCardIds.length === 0 ||
      card.referenceCardIds.length > manifest.referencePolicy.maximumImages ||
      card.referenceCardIds.some(
        (referenceId) =>
          !cardIds.has(referenceId) || !approvedCardIds.has(referenceId),
      )
    ) {
      errors.push(
        `card ${card.id} must use one or two known approved reference cards.`,
      );
    }
  });

  approvedCards.forEach((card) => {
    const assetPath = resolve(repositoryRoot, card.assetPath);

    if (!existsSync(assetPath)) {
      errors.push(`Missing approved pilot asset ${card.assetPath}.`);
      return;
    }

    try {
      const dimensions = readJpegDimensions(readFileSync(assetPath));

      if (dimensions.width !== 700 || dimensions.height !== 980) {
        errors.push(
          `${card.assetPath} must be 700 x 980, received ${dimensions.width} x ${dimensions.height}.`,
        );
      }
    } catch (error) {
      errors.push(`${card.assetPath}: ${getErrorMessage(error)}`);
    }
  });

  const locks = getCardArtLocks(manifest, repositoryRoot);

  manifest.cards.forEach((card) => {
    if (card.promptSha256 !== locks.promptSha256[card.id]) {
      errors.push(
        `card ${card.id} promptSha256 is stale; review the prompt and commit its new digest.`,
      );
    }
  });

  validateHistory(
    history,
    baselineHistory,
    manifest,
    approvedCards,
    locks,
    errors,
  );

  if (errors.length > 0) {
    throw new Error(`Card art validation failed:\n- ${errors.join("\n- ")}`);
  }

  return locks;
}

function validateHistory(
  history,
  baselineHistory,
  manifest,
  approvedCards,
  locks,
  errors,
) {
  if (!Array.isArray(history) || history.length === 0) {
    errors.push("card-art-style-history.json must contain at least v1.");
    return;
  }

  history.forEach((entry, index) => {
    if (entry.version !== `v${index + 1}`) {
      errors.push("Style history versions must be unique, ordered v1, v2, ...");
    }
  });

  if (
    new Set(history.map((entry) => entry.styleFingerprintSha256)).size !==
    history.length
  ) {
    errors.push("Style history fingerprints must be unique.");
  }

  if (baselineHistory !== undefined) {
    if (
      !Array.isArray(baselineHistory) ||
      history.length < baselineHistory.length
    ) {
      errors.push("Style history cannot delete earlier entries.");
    } else {
      baselineHistory.forEach((entry, index) => {
        if (stableStringify(history[index]) !== stableStringify(entry)) {
          errors.push(
            `Style history entry ${entry.version ?? index + 1} is immutable; append a new version instead.`,
          );
        }
      });
    }
  }

  const currentEntry = history.at(-1);
  const approvedIds = approvedCards.map((card) => card.id);

  if (currentEntry?.version !== manifest.version) {
    errors.push(
      "Manifest version must equal the newest style history version.",
    );
  }

  if (currentEntry?.styleFingerprintSha256 !== locks.styleFingerprintSha256) {
    errors.push(
      "The current style fingerprint changed; append a reviewed style version.",
    );
  }

  if (
    stableStringify(currentEntry?.assetSha256) !==
    stableStringify(locks.assetSha256)
  ) {
    errors.push(
      "Approved reference asset bytes changed; append a reviewed style version.",
    );
  }

  if (
    stableStringify(currentEntry?.reviewedPilotIds) !==
    stableStringify(approvedIds)
  ) {
    errors.push(
      "The newest history entry must review every approved pilot id.",
    );
  }

  if (
    currentEntry?.review?.status !== "approved" ||
    currentEntry.review.fullSizeApproved !== true ||
    currentEntry.review.smallPreviewApproved !== true ||
    !/^\d{4}-\d{2}-\d{2}$/.test(currentEntry.review.date ?? "")
  ) {
    errors.push(
      "The newest style history entry requires dated full-size and small-preview approval.",
    );
  }
}

function collectUniqueIds(items, label, errors) {
  if (!Array.isArray(items) || items.length === 0) {
    errors.push(`manifest.${label} entries are required.`);
    return new Set();
  }

  const ids = items.map((item) => item.id);
  const uniqueIds = new Set(ids);

  if (
    uniqueIds.size !== ids.length ||
    ids.some((id) => typeof id !== "string" || id === "")
  ) {
    errors.push(`manifest.${label} ids must be non-empty and unique.`);
  }

  return uniqueIds;
}

function getCard(manifest, cardId) {
  const card = manifest.cards.find((candidate) => candidate.id === cardId);

  if (!card) {
    throw new Error(`Unknown card art id "${cardId}".`);
  }

  return card;
}

function readJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error("Approved card art must be a JPEG file.");
  }

  let offset = 2;

  while (offset + 8 < buffer.length) {
    while (buffer[offset] === 0xff) {
      offset += 1;
    }

    const marker = buffer[offset];
    offset += 1;

    if (marker === undefined || marker === 0xd9 || marker === 0xda) {
      break;
    }

    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }

    const segmentLength = buffer.readUInt16BE(offset);

    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      throw new Error("JPEG segment data is invalid.");
    }

    if (startOfFrameMarkers.has(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }

    offset += segmentLength;
  }

  throw new Error("JPEG dimensions could not be read.");
}

function gitRefExists(repositoryRoot, ref) {
  try {
    execFileSync("git", ["cat-file", "-e", `${ref}^{commit}`], {
      cwd: repositoryRoot,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function gitPathExistsAtRef(repositoryRoot, ref, path) {
  const output = execFileSync(
    "git",
    ["ls-tree", "--name-only", ref, "--", path],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  return output.trim() === path;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${stableStringify(Reflect.get(value, key))}`,
      )
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function parseArguments(arguments_) {
  const result = {
    baseRef: process.env["ART_BASE_REF"] || undefined,
    cardId: undefined,
    check: false,
    inspectLocks: false,
    json: false,
  };

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];

    if (argument === "--") {
      continue;
    }

    if (argument === "--check") {
      result.check = true;
    } else if (argument === "--inspect-locks") {
      result.inspectLocks = true;
    } else if (argument === "--json") {
      result.json = true;
    } else if (argument === "--card") {
      result.cardId = arguments_[index + 1];
      index += 1;
    } else if (argument === "--base") {
      result.baseRef = arguments_[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument "${argument}".`);
    }
  }

  return result;
}

function runCli() {
  const arguments_ = parseArguments(process.argv.slice(2));
  const { history, manifest } = loadCardArtFiles();

  if (arguments_.inspectLocks) {
    process.stdout.write(
      `${JSON.stringify(getCardArtLocks(manifest), null, 2)}\n`,
    );
    return;
  }

  if (arguments_.check) {
    validateCardArtSystem({
      baselineHistory: loadBaselineHistory(
        defaultRepositoryRoot,
        arguments_.baseRef,
      ),
      history,
      manifest,
    });
    process.stdout.write(
      `Card art system ${manifest.systemId} ${manifest.version} is valid.\n`,
    );
    return;
  }

  if (!arguments_.cardId) {
    throw new Error(
      "Pass --card <id> to print a prompt, --check to validate, or --inspect-locks to inspect fingerprints.",
    );
  }

  const record = getCardArtPromptRecord(
    manifest,
    arguments_.cardId,
    defaultRepositoryRoot,
  );
  process.stdout.write(
    arguments_.json
      ? `${JSON.stringify(record, null, 2)}\n`
      : `${record.prompt}\n`,
  );
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectExecution) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${getErrorMessage(error)}\n`);
    process.exitCode = 1;
  }
}
