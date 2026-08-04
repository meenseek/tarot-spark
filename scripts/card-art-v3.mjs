import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  canonicalTarotCardIds,
  majorArcanaIds,
  minorArcanaRankIds,
  minorArcanaSuitIds,
} from "../src/domain/tarot/card-catalog.ts";
import {
  loadBaselineHistory as loadV2BaselineHistory,
  loadCardArtFiles as loadV2CardArtFiles,
  validateCardArtSystem as validateV2CardArtSystem,
} from "./card-art-prompt.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = resolve(scriptDirectory, "..");
const fileNames = Object.freeze({
  approvals: "art/card-art-v3-approvals.json",
  controlRegistry: "art/card-art-v3-control-registry.json",
  generationRecords: "art/card-art-v3-generation-records.json",
  legacyAudit: "art/card-art-v3-legacy-audit.json",
  manifest: "art/card-art-v3-manifest.json",
  releaseHistory: "art/card-art-v3-release-history.json",
  styleHistory: "art/card-art-v3-style-history.json",
});
const approvalChecks = Object.freeze([
  "anatomy",
  "cardMeaning",
  "countAccuracy",
  "deckHarmony",
  "fullSize",
  "noUnintendedText",
  "styleContinuity",
  "thumbnail",
]);
const expectedStageOrder = Object.freeze([
  "legacy-audit",
  "legacy-retouch",
  "pilot",
  "suit-anchor-promotion",
  "court-validation",
  "major-and-numbered-batches",
  "deck-harmony",
  "atomic-release",
]);
const expectedPilotGateChecks = Object.freeze([
  "exact suit-object count",
  "natural hands, fingers and limbs",
  "no unintended text or pseudo-lettering",
  "card identity at thumbnail size",
  "no repeated scene or silhouette",
  "distinct court role and movement",
  "safe and legible difficult-card meaning",
  "pilot contact-sheet style harmony",
]);
const expectedFinalDeckGateChecks = Object.freeze([
  "78-card contact-sheet style harmony",
  "all card identities legible at thumbnail size",
  "no repeated scene or signature silhouette",
  "exact suit-object counts across the full deck",
  "natural anatomy and safe difficult-card treatment",
]);
const releaseSurfaceReviewIds = Object.freeze(["runtimeMap", "metadata", "og"]);
const normalizationRecipeContract = Object.freeze({
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
const promptValidationCache = new WeakMap();
const pilotIds = Object.freeze([
  "wands-ace",
  "wands-5",
  "wands-10",
  "wands-page",
  "cups-ace",
  "cups-5",
  "cups-10",
  "cups-knight",
  "swords-ace",
  "swords-5",
  "swords-10",
  "swords-queen",
  "pentacles-ace",
  "pentacles-5",
  "pentacles-10",
  "pentacles-king",
]);
const legacyKeepIds = Object.freeze([
  "the-fool",
  "the-lovers",
  "the-chariot",
  "strength",
  "the-hermit",
  "wheel-of-fortune",
  "temperance",
]);
const legacyReplaceIds = Object.freeze([
  "the-magician",
  "the-high-priestess",
  "the-empress",
  "the-emperor",
  "the-star",
]);

export function loadCardArtV3Files(repositoryRoot = defaultRepositoryRoot) {
  return Object.fromEntries(
    Object.entries(fileNames).map(([key, relativePath]) => [
      key,
      readJson(resolve(repositoryRoot, relativePath)),
    ]),
  );
}

export function loadCardArtV3Baseline(
  repositoryRoot = defaultRepositoryRoot,
  baseRef = "HEAD",
) {
  try {
    execFileSync("git", ["rev-parse", "--verify", "--quiet", baseRef], {
      cwd: repositoryRoot,
      stdio: "ignore",
    });
  } catch {
    return undefined;
  }
  const baseline = {};
  for (const [key, relativePath] of Object.entries(fileNames)) {
    if (
      ![
        "approvals",
        "controlRegistry",
        "generationRecords",
        "legacyAudit",
        "releaseHistory",
        "styleHistory",
      ].includes(key)
    ) {
      continue;
    }
    try {
      baseline[key] = JSON.parse(
        execFileSync("git", ["show", `${baseRef}:${relativePath}`], {
          cwd: repositoryRoot,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        }),
      );
    } catch {
      baseline[key] = undefined;
    }
  }
  return baseline;
}

export function buildCardArtV3Prompt(manifest, cardId) {
  const card = getCard(manifest, cardId);
  const castById = new Map(manifest.cast.map((member) => [member.id, member]));
  const locationById = new Map(
    manifest.locations.map((location) => [location.id, location]),
  );
  const cast = card.castIds.map((castId) => {
    const member = castById.get(castId);
    if (!member) throw new Error(`Unknown cast id "${castId}" for ${cardId}.`);
    return member.description;
  });
  const location = locationById.get(card.locationId);
  if (!location) {
    throw new Error(`Unknown location id "${card.locationId}" for ${cardId}.`);
  }
  const rules = [...manifest.compositionRules];

  if (card.arcana === "minor") {
    rules.push(`Suit contract: ${manifest.suitRules[card.suit].object}.`);
    rules.push(`Suit palette: ${manifest.suitRules[card.suit].palette}.`);
    rules.push(
      `Suit environment: ${manifest.suitRules[card.suit].environment}.`,
    );
    rules.push(`Suit exclusion: ${manifest.suitRules[card.suit].avoid}`);
    rules.push(`Rank contract: ${manifest.rankRules[rankRuleKey(card.rank)]}`);
    rules.push(
      `Count lock: show exactly ${card.suitObjectCount} ${card.suit} suit object${card.suitObjectCount === 1 ? "" : "s"}; zero more and zero fewer.`,
    );
  }

  const safety = manifest.difficultCardSafety[cardId];
  if (safety) rules.push(`Safety lock: ${safety}`);
  if (card.needsRetouch) {
    rules.push(`Retouch-only lock: ${card.retouchInstruction}`);
  }

  return [
    manifest.prompt.shared,
    "",
    `CARD DIRECTION — ${card.name} (${cardId})`,
    `Observable scene: ${card.gesture}`,
    `Recurring cast: ${cast.join(" ")}`,
    `Location family: ${location.description}`,
    `Dominant symbol: ${card.dominantSymbol}.`,
    `Supporting symbols: ${card.supportingSymbols.join("; ")}.`,
    `Card-specific exclusions: ${card.avoid}`,
    "",
    "DECK AND SYMBOL RULES",
    ...rules.map((rule) => `- ${rule}`),
    "",
    "REFERENCE CONTROL",
    manifest.referencePolicy.instruction,
    "",
    "OUTPUT CONTRACT",
    `Create exactly one borderless portrait illustration composed for ${manifest.frame.aspectRatio}. Keep the card-specific focal silhouette within roughly ${manifest.frame.focalCoveragePercent[0]}–${manifest.frame.focalCoveragePercent[1]} percent of the frame, important faces and hands inside the central ${manifest.frame.centralFocusPercent} percent, and stable grounding scenery in the lower ${manifest.frame.groundingAreaPercent} percent. The final reviewed delivery will be ${manifest.frame.width} by ${manifest.frame.height} pixels in ${manifest.frame.colorSpace}.`,
    "",
    "NEGATIVE",
    manifest.prompt.negative,
  ].join("\n");
}

export function buildCardArtV3AttemptPrompt(
  basePrompt,
  retryConstraint = null,
) {
  if (retryConstraint === null) return basePrompt;
  if (
    typeof retryConstraint !== "string" ||
    retryConstraint.trim().length < 20 ||
    retryConstraint.trim().length > 1200
  ) {
    throw new Error(
      "retryConstraint must be null or a 20–1200 character reviewed observable constraint.",
    );
  }
  return [
    basePrompt,
    "",
    "RETRY CONSTRAINT — PRESERVE EVERY BASE CONTRACT ABOVE",
    retryConstraint.trim(),
  ].join("\n");
}

export function buildCardArtV3PrecisionEditPrompt(editInstruction) {
  if (
    typeof editInstruction !== "string" ||
    editInstruction.trim().length < 20 ||
    editInstruction.trim().length > 2400
  ) {
    throw new Error(
      "editInstruction must be a 20–2400 character independently reviewed precision-edit instruction.",
    );
  }
  return editInstruction.trim();
}

export function getCardArtV3PromptRecord(
  files,
  cardId,
  repositoryRoot = defaultRepositoryRoot,
) {
  validateForPrompt(files, repositoryRoot);
  const manifest = files.manifest;
  const card = getCard(manifest, cardId);
  assertGenerationStageOpen(files, cardId);
  const referenceRecords = resolveReferenceRecords(
    files,
    cardId,
    repositoryRoot,
  );
  const prompt = buildCardArtV3Prompt(manifest, cardId);
  const generator = card.needsRetouch
    ? manifest.retouchGenerator
    : manifest.generator;

  return {
    cardId,
    cardSpecSha256: getCardArtV3CardSpecSha256(manifest, cardId),
    manifestSha256: getCardArtV3ManifestSha256(manifest),
    mode: generator.mode,
    prompt,
    promptSha256: sha256(prompt),
    referenceSha256: Object.fromEntries(
      referenceRecords.map(({ id, sha256: hash }) => [id, hash]),
    ),
    referenced_image_paths: referenceRecords.map(
      ({ absolutePath }) => absolutePath,
    ),
    systemId: manifest.systemId,
    version: manifest.version,
  };
}

export function getCardArtV3AttemptRecord(
  files,
  cardId,
  retryConstraint = null,
  repositoryRoot = defaultRepositoryRoot,
) {
  const promptRecord = getCardArtV3PromptRecord(files, cardId, repositoryRoot);
  const normalizedRetryConstraint =
    retryConstraint === null ? null : retryConstraint.trim();
  const effectivePrompt = buildCardArtV3AttemptPrompt(
    promptRecord.prompt,
    normalizedRetryConstraint,
  );
  return {
    ...promptRecord,
    effectivePrompt,
    effectivePromptSha256: sha256(effectivePrompt),
    editSource: null,
    retryConstraint: normalizedRetryConstraint,
  };
}

export function getCardArtV3ReviewedAttemptRecord(
  files,
  cardId,
  retryConstraintArtifactPath,
  repositoryRoot = defaultRepositoryRoot,
) {
  const artifact = loadRetryConstraintArtifact(
    retryConstraintArtifactPath,
    cardId,
    repositoryRoot,
  );
  const previousAttempt = (files.generationRecords.records ?? []).find(
    ({ id }) => id === artifact.previousAttemptId,
  );
  if (
    !previousAttempt ||
    previousAttempt.cardId !== cardId ||
    previousAttempt.attemptNumber !== artifact.attemptNumber - 1 ||
    previousAttempt.selectionStatus !== "rejected"
  ) {
    throw new Error(
      `Retry constraint must reference the immediately preceding rejected attempt for ${cardId}.`,
    );
  }
  if (
    !isCanonicalUtcTimestamp(previousAttempt.generatedAt) ||
    Date.parse(previousAttempt.generatedAt) >= Date.parse(artifact.reviewedAt)
  ) {
    throw new Error(
      `Retry review must occur after its preceding attempt for ${cardId}.`,
    );
  }
  const editSource = artifact.editSource;
  const controlReference = artifact.controlReference;
  if (editSource !== null) {
    const sourceAttempt = (files.generationRecords.records ?? []).find(
      ({ id }) => id === editSource.attemptId,
    );
    if (
      !sourceAttempt ||
      sourceAttempt.cardId !== cardId ||
      sourceAttempt.selectionStatus !== "rejected" ||
      sourceAttempt.attemptNumber >= artifact.attemptNumber ||
      sourceAttempt.rawOutputPath !== editSource.path ||
      sourceAttempt.rawOutputSha256 !== editSource.sha256 ||
      !isCanonicalUtcTimestamp(sourceAttempt.generatedAt) ||
      Date.parse(sourceAttempt.generatedAt) >= Date.parse(artifact.reviewedAt)
    ) {
      throw new Error(
        `Precision edit source must bind an immutable rejected attempt for ${cardId}.`,
      );
    }
  }
  const attemptRecord =
    editSource === null
      ? getCardArtV3AttemptRecord(
          files,
          cardId,
          artifact.constraint,
          repositoryRoot,
        )
      : {
          ...getCardArtV3PromptRecord(files, cardId, repositoryRoot),
          editSource: null,
          retryConstraint: artifact.constraint.trim(),
        };
  const effectivePrompt =
    editSource === null
      ? attemptRecord.effectivePrompt
      : buildCardArtV3PrecisionEditPrompt(artifact.constraint);
  return {
    ...attemptRecord,
    ...(editSource === null
      ? {}
      : {
          referenceSha256: {
            [editSource.attemptId]: editSource.sha256,
            ...(controlReference === null
              ? {}
              : { [controlReference.id]: controlReference.sha256 }),
          },
          referenced_image_paths: [
            resolve(repositoryRoot, editSource.path),
            ...(controlReference === null
              ? []
              : [resolve(repositoryRoot, controlReference.path)]),
          ],
        }),
    attemptNumber: artifact.attemptNumber,
    controlReference,
    editSource,
    effectivePrompt,
    effectivePromptSha256: sha256(effectivePrompt),
    previousAttemptId: artifact.previousAttemptId,
    regenerationReason: artifact.reason,
    retryReview: {
      artifactPath: artifact.projectRelativePath,
      artifactSha256: artifact.sha256,
      result: artifact.result,
      reviewedAt: artifact.reviewedAt,
      reviewer: artifact.reviewer,
    },
  };
}

function loadRetryConstraintArtifact(
  artifactPath,
  cardId,
  repositoryRoot = defaultRepositoryRoot,
) {
  const absolutePath = resolve(repositoryRoot, artifactPath ?? "");
  const projectRelativePath = artifactPath;
  if (
    !isProjectRelativePath(projectRelativePath) ||
    !new RegExp(
      `^art/card-art-v3-retry-constraints/${cardId}-attempt-[0-9]{3}\\.json$`,
    ).test(projectRelativePath)
  ) {
    throw new Error(
      "retry constraint artifact must use its card-specific reviewed path.",
    );
  }
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing retry constraint artifact ${absolutePath}.`);
  }
  const buffer = readFileSync(absolutePath);
  const artifact = JSON.parse(buffer.toString("utf8"));
  const editSourceFields = [
    artifact.editSourceAttemptId,
    artifact.editSourcePath,
    artifact.editSourceSha256,
  ];
  const hasEditSource = editSourceFields.some((value) => value !== undefined);
  const editSource = hasEditSource
    ? {
        attemptId: artifact.editSourceAttemptId,
        path: artifact.editSourcePath,
        sha256: artifact.editSourceSha256,
      }
    : null;
  const controlReferenceFields = [
    artifact.controlReferenceId,
    artifact.controlReferencePath,
    artifact.controlReferenceSha256,
  ];
  const hasControlReference = controlReferenceFields.some(
    (value) => value !== undefined,
  );
  const controlReference = hasControlReference
    ? {
        id: artifact.controlReferenceId,
        path: artifact.controlReferencePath,
        sha256: artifact.controlReferenceSha256,
      }
    : null;
  if (
    artifact.schemaVersion !== 1 ||
    artifact.cardId !== cardId ||
    !Number.isInteger(artifact.attemptNumber) ||
    artifact.attemptNumber < 2 ||
    artifact.previousAttemptId !==
      `${cardId}-attempt-${String(artifact.attemptNumber - 1).padStart(3, "0")}` ||
    artifact.result !== "approved" ||
    typeof artifact.reason !== "string" ||
    artifact.reason.trim() === "" ||
    typeof artifact.reviewer !== "string" ||
    artifact.reviewer.trim() === "" ||
    !isCanonicalUtcTimestamp(artifact.reviewedAt)
  ) {
    throw new Error(
      `Invalid reviewed retry constraint artifact for ${cardId}.`,
    );
  }
  if (hasEditSource) {
    const editSourcePath = resolve(repositoryRoot, editSource.path ?? "");
    if (
      typeof editSource.attemptId !== "string" ||
      !new RegExp(`^${cardId}-attempt-[0-9]{3}$`).test(editSource.attemptId) ||
      typeof editSource.path !== "string" ||
      !isProjectRelativePath(editSource.path) ||
      !new RegExp(
        `^art/card-art-v3-raw/[^/]+/${cardId}-candidate-[0-9]{3}-rejected\\.png$`,
      ).test(editSource.path) ||
      typeof editSource.sha256 !== "string" ||
      !existsSync(editSourcePath) ||
      sha256(readFileSync(editSourcePath)) !== editSource.sha256
    ) {
      throw new Error(`Invalid immutable precision edit source for ${cardId}.`);
    }
  }
  if (hasControlReference) {
    const controlRegistry = readJson(
      resolve(repositoryRoot, fileNames.controlRegistry),
    );
    const approvedControl =
      controlRegistry.controls?.[controlReference.id ?? ""];
    const controlReferencePath = resolve(
      repositoryRoot,
      controlReference.path ?? "",
    );
    if (
      editSource === null ||
      typeof controlReference.id !== "string" ||
      !new RegExp(`^${cardId}-[a-z0-9-]+-v[0-9]+$`).test(controlReference.id) ||
      controlReference.path !==
        `art/card-art-v3-controls/${controlReference.id}.png` ||
      typeof controlReference.sha256 !== "string" ||
      approvedControl?.cardId !== cardId ||
      approvedControl?.status !== "approved" ||
      approvedControl?.render?.path !== controlReference.path ||
      approvedControl?.render?.sha256 !== controlReference.sha256 ||
      !existsSync(controlReferencePath) ||
      sha256(readFileSync(controlReferencePath)) !== controlReference.sha256
    ) {
      throw new Error(`Invalid immutable control reference for ${cardId}.`);
    }
  }
  if (editSource === null) {
    buildCardArtV3AttemptPrompt("base", artifact.constraint);
  } else {
    buildCardArtV3PrecisionEditPrompt(artifact.constraint);
  }
  return {
    ...artifact,
    controlReference,
    editSource,
    projectRelativePath,
    sha256: sha256(buffer),
  };
}

function validateForPrompt(files, repositoryRoot) {
  const fingerprint = sha256(
    stableStringify({
      approvals: files.approvals,
      controlRegistry: files.controlRegistry,
      generationRecords: files.generationRecords,
      legacyAudit: files.legacyAudit,
      manifest: files.manifest,
      releaseHistory: files.releaseHistory,
      repositoryRoot,
      styleHistory: files.styleHistory,
    }),
  );
  if (promptValidationCache.get(files) === fingerprint) return;
  validateCardArtV3System(files, repositoryRoot);
  promptValidationCache.set(files, fingerprint);
}

function resolveReferenceRecords(files, cardId, repositoryRoot) {
  const { approvals, manifest } = files;
  const card = getCard(manifest, cardId);
  const legacySources = new Map(
    manifest.legacySources.map((source) => [source.id, source]),
  );
  const usesPromotedSuitAnchors =
    card.arcana === "minor" && !card.batch.startsWith("pilot-");
  const referenceIds = card.needsRetouch
    ? [cardId]
    : usesPromotedSuitAnchors
      ? manifest.generationPlan.plannedSuitAnchorIds[card.suit]
      : card.legacySeedReferenceIds;

  return referenceIds.map((referenceId) => {
    const legacySource = legacySources.get(referenceId);
    const approval = approvals.records?.[referenceId];
    const referenceCard = manifest.cards?.[referenceId];
    const isRetouchedLegacy =
      manifest.referenceResolution.retouchedLegacyIds.includes(referenceId);
    const mayUseLegacyRetouchSource =
      card.needsRetouch === true && referenceId === cardId;
    const mustUseApprovedV3 =
      usesPromotedSuitAnchors ||
      (isRetouchedLegacy && !mayUseLegacyRetouchSource);

    if (
      mustUseApprovedV3 &&
      (!approval ||
        approval.status !== "approved" ||
        !referenceCard ||
        (usesPromotedSuitAnchors && approval.promotedSuitAnchor !== true) ||
        (isRetouchedLegacy && approval.provenance !== "retouched-v3"))
    ) {
      throw new Error(
        `V3 reference "${referenceId}" is not independently approved for ${cardId}.`,
      );
    }
    if (!mustUseApprovedV3 && !legacySource) {
      throw new Error(`Unknown legacy source "${referenceId}" for ${cardId}.`);
    }

    const expectedSha256 = mustUseApprovedV3
      ? approval.assetSha256
      : legacySource.sha256;
    const absolutePath = resolve(
      repositoryRoot,
      mustUseApprovedV3 ? referenceCard.assetPath : legacySource.assetPath,
    );
    if (!existsSync(absolutePath)) {
      throw new Error(`Missing reference asset ${absolutePath}.`);
    }
    const actualSha256 = sha256(readFileSync(absolutePath));
    if (actualSha256 !== expectedSha256) {
      throw new Error(
        `Reference ${referenceId} does not match its frozen SHA-256.`,
      );
    }
    return { absolutePath, id: referenceId, sha256: actualSha256 };
  });
}

function assertGenerationStageOpen(files, cardId) {
  const { approvals, manifest, styleHistory } = files;
  const card = getCard(manifest, cardId);
  if (card.disposition === "keep" && card.needsRetouch !== true) {
    throw new Error(
      `${cardId} is approved for byte-identical legacy reuse and must not be regenerated.`,
    );
  }
  if (card.needsRetouch === true) return;

  const missingRetouchIds =
    manifest.referenceResolution.retouchedLegacyIds.filter(
      (id) => approvals.records?.[id]?.status !== "approved",
    );
  if (card.batch.startsWith("pilot-")) {
    if (missingRetouchIds.length > 0) {
      throw new Error(
        `${cardId} is closed until both legacy retouches pass independent output review.`,
      );
    }
    return;
  }

  const missingPilotIds = pilotIds.filter(
    (id) => approvals.records?.[id]?.status !== "approved",
  );
  if (missingPilotIds.length > 0 || (styleHistory.entries?.length ?? 0) === 0) {
    throw new Error(
      `${cardId} is closed until all 16 pilots pass review and the promoted suit-anchor style entry is locked.`,
    );
  }
  if (manifest.generationPlan.courtValidationBatchIds.includes(card.batch)) {
    return;
  }

  const missingCourtIds = canonicalTarotCardIds
    .filter((id) =>
      manifest.generationPlan.courtValidationBatchIds.includes(
        manifest.cards[id].batch,
      ),
    )
    .filter((id) => approvals.records?.[id]?.status !== "approved");
  if (missingCourtIds.length > 0) {
    throw new Error(
      `${cardId} is closed until all 12 non-pilot court cards pass the court-validation gate.`,
    );
  }
}

export function getCardArtV3ManifestSha256(manifest) {
  return sha256(
    stableStringify(
      Object.fromEntries(
        Object.entries(manifest).filter(([key]) => key !== "releaseState"),
      ),
    ),
  );
}

export function getCardArtV3CardSpecSha256(manifest, cardId) {
  const card = getCard(manifest, cardId);
  return sha256(
    stableStringify({
      card,
      compositionRules: manifest.compositionRules,
      difficultCardSafety: manifest.difficultCardSafety[cardId] ?? null,
      frame: manifest.frame,
      generationPlan: manifest.generationPlan,
      location: manifest.locations.find(({ id }) => id === card.locationId),
      prompt: manifest.prompt,
      rankRule:
        card.arcana === "minor"
          ? manifest.rankRules[rankRuleKey(card.rank)]
          : null,
      referencePolicy: manifest.referencePolicy,
      suitRule: card.arcana === "minor" ? manifest.suitRules[card.suit] : null,
      systemId: manifest.systemId,
      version: manifest.version,
    }),
  );
}

export function validateCardArtV3System(
  files,
  repositoryRoot = defaultRepositoryRoot,
  baselineFiles = loadCardArtV3Baseline(repositoryRoot),
) {
  const {
    approvals,
    controlRegistry,
    generationRecords,
    legacyAudit,
    manifest,
    releaseHistory,
    styleHistory,
  } = files;
  const errors = [];
  validateAppendOnlyV3Records(baselineFiles, files, errors);
  try {
    const v2 = loadV2CardArtFiles(repositoryRoot);
    validateV2CardArtSystem({
      baselineHistory: loadV2BaselineHistory(repositoryRoot),
      history: v2.history,
      manifest: v2.manifest,
      repositoryRoot,
    });
  } catch (error) {
    errors.push(`Frozen v2 art chain failed: ${error.message}`);
  }
  const requireString = (value, label) => {
    if (typeof value !== "string" || value.trim() === "") {
      errors.push(`${label} must be a non-empty string.`);
    }
  };
  const requireExactIds = (actual, expected, label) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      errors.push(`${label} must exactly match the canonical order.`);
    }
  };

  requireString(manifest.systemId, "manifest.systemId");
  validateControlRegistry(controlRegistry, manifest, repositoryRoot, errors);
  if (manifest.version !== "v3") errors.push('manifest.version must be "v3".');
  const releaseEntries = Array.isArray(releaseHistory.entries)
    ? releaseHistory.entries
    : [];
  const expectedReleaseState =
    releaseEntries.length === 0 ? "planning" : "released";
  if (manifest.releaseState !== expectedReleaseState) {
    errors.push(
      `manifest.releaseState must be "${expectedReleaseState}" when releaseHistory has ${releaseEntries.length} entries.`,
    );
  }
  if (manifest.generator?.tool !== "OpenAI ImageGen") {
    errors.push('manifest.generator.tool must be "OpenAI ImageGen".');
  }
  if (manifest.generator?.mode !== "default") {
    errors.push('manifest.generator.mode must be "default".');
  }
  if (manifest.generator?.referenceInput !== "referenced_image_paths") {
    errors.push(
      'manifest.generator.referenceInput must be "referenced_image_paths".',
    );
  }
  if (
    manifest.retouchGenerator?.tool !== "Sharp" ||
    manifest.retouchGenerator?.mode !== "deterministic-local-restoration" ||
    manifest.retouchGenerator?.referenceInput !== "source-only" ||
    manifest.retouchGenerator?.recipeId !== "local-star-restoration-v1" ||
    manifest.retouchGenerator?.recipePath !==
      "scripts/card-art-v3-retouch.mjs" ||
    manifest.retouchGenerator?.recipeDefinitionSha256 !==
      "4e4cdd452f9abd57b8b2b12fd15b00d2ed725074eba53edd19920c35095f5e92"
  ) {
    errors.push(
      "manifest.retouchGenerator must remain the reviewed local-star-restoration-v1 contract.",
    );
  }
  for (const cardId of ["the-hermit", "temperance"]) {
    const expected = manifest.retouchGenerator?.expectedOutputs?.[cardId];
    const legacySource = manifest.legacySources?.find(
      ({ id }) => id === cardId,
    );
    if (
      expected?.sourceSha256 !== legacySource?.sha256 ||
      expected?.rawOutputPath !==
        `art/card-art-v3-raw/legacy-retouch/${cardId}-candidate-002.png` ||
      !/^[a-f0-9]{64}$/.test(expected?.rawOutputSha256 ?? "")
    ) {
      errors.push(
        `manifest.retouchGenerator.expectedOutputs.${cardId} must bind the reviewed source, exact raw path, and raw SHA-256.`,
      );
    }
  }
  if (
    manifest.frame?.aspectRatio !== "5:7" ||
    manifest.frame?.width !== 700 ||
    manifest.frame?.height !== 980 ||
    manifest.frame?.colorSpace !== "sRGB" ||
    manifest.frame?.maximumFileBytes !== 512000 ||
    manifest.frame?.maximumDeckBytes !== 31457280
  ) {
    errors.push(
      "manifest.frame must remain the reviewed 700x980 sRGB 5:7 contract.",
    );
  }
  if (
    manifest.generationPlan?.requiresIndependentApproval !== true ||
    manifest.generationPlan?.stopOnFailure !== true ||
    manifest.generationPlan?.approvalRecordPath !==
      "art/card-art-v3-approvals.json" ||
    manifest.generationPlan?.generationRecordPath !==
      "art/card-art-v3-generation-records.json" ||
    manifest.generationPlan?.styleRecordPath !==
      "art/card-art-v3-style-history.json" ||
    manifest.generationPlan?.releaseRecordPath !==
      "art/card-art-v3-release-history.json"
  ) {
    errors.push(
      "manifest.generationPlan must fail closed on independent approvals recorded in the four v3 ledgers.",
    );
  }
  requireExactIds(
    manifest.generationPlan?.stageOrder,
    expectedStageOrder,
    "manifest.generationPlan.stageOrder",
  );
  requireExactIds(
    manifest.generationPlan?.pilotGateChecks,
    expectedPilotGateChecks,
    "manifest.generationPlan.pilotGateChecks",
  );
  requireExactIds(
    manifest.generationPlan?.finalDeckGateChecks,
    expectedFinalDeckGateChecks,
    "manifest.generationPlan.finalDeckGateChecks",
  );
  if (
    JSON.stringify(manifest.referenceResolution?.retouchedLegacyIds) !==
      JSON.stringify(["the-hermit", "temperance"]) ||
    !manifest.referenceResolution?.nonPilotMinorOverride?.includes(
      "always replace legacySeedReferenceIds",
    )
  ) {
    errors.push(
      "manifest.referenceResolution must lock retouch and post-pilot override precedence.",
    );
  }
  if (
    JSON.stringify(manifest.generationPlan?.pilotBatchIds) !==
    JSON.stringify([
      "pilot-wands",
      "pilot-cups",
      "pilot-swords",
      "pilot-pentacles",
    ])
  ) {
    errors.push(
      "manifest.generationPlan.pilotBatchIds must preserve the reviewed four-suit pilot gate.",
    );
  }
  const plannedSuitAnchorIds = new Set();
  for (const suit of minorArcanaSuitIds) {
    const ids = manifest.generationPlan?.plannedSuitAnchorIds?.[suit];
    if (
      !Array.isArray(ids) ||
      ids.length !== 2 ||
      ids.some(
        (id) =>
          !pilotIds.includes(id) ||
          manifest.cards?.[id]?.suit !== suit ||
          plannedSuitAnchorIds.has(id),
      )
    ) {
      errors.push(
        `manifest.generationPlan.plannedSuitAnchorIds.${suit} must name two unique pilot cards from that suit.`,
      );
    }
    for (const id of ids ?? []) plannedSuitAnchorIds.add(id);
  }
  const expectedCourtValidationIds = minorArcanaSuitIds.flatMap((suit) =>
    minorArcanaRankIds
      .filter((rank) => ["page", "knight", "queen", "king"].includes(rank))
      .map((rank) => `${suit}-${rank}`)
      .filter((id) => !pilotIds.includes(id)),
  );

  const cardIds = Object.keys(manifest.cards ?? {});
  requireExactIds(cardIds, canonicalTarotCardIds, "manifest.cards");
  const anchorIds = new Set();
  for (const [index, anchor] of (manifest.legacySources ?? []).entries()) {
    const label = `manifest.legacySources[${index}]`;
    requireString(anchor.id, `${label}.id`);
    requireString(anchor.assetPath, `${label}.assetPath`);
    if (anchorIds.has(anchor.id)) errors.push(`${label}.id must be unique.`);
    anchorIds.add(anchor.id);
    const source = resolve(repositoryRoot, anchor.assetPath ?? "");
    if (!existsSync(source)) {
      errors.push(`${label} is missing ${source}.`);
    } else if (sha256(readFileSync(source)) !== anchor.sha256) {
      errors.push(`${label}.sha256 does not match the source asset.`);
    }
  }
  requireExactIds([...anchorIds], legacyKeepIds, "manifest.legacySources");

  const assetPaths = new Set();
  const batchCounts = new Map();
  for (const [index, cardId] of canonicalTarotCardIds.entries()) {
    const card = manifest.cards?.[cardId];
    const label = `manifest.cards.${cardId}`;
    if (!card) continue;
    for (const key of [
      "name",
      "arcana",
      "disposition",
      "batch",
      "assetPath",
      "locationId",
      "gesture",
      "dominantSymbol",
      "avoid",
    ]) {
      requireString(card[key], `${label}.${key}`);
    }
    if (card.assetPath !== `public/cards/v3/${cardId}.jpg`) {
      errors.push(`${label}.assetPath must use the isolated v3 path.`);
    }
    if (assetPaths.has(card.assetPath))
      errors.push(`${label}.assetPath must be unique.`);
    assetPaths.add(card.assetPath);
    batchCounts.set(card.batch, (batchCounts.get(card.batch) ?? 0) + 1);
    if (!Array.isArray(card.castIds) || card.castIds.length === 0) {
      errors.push(`${label}.castIds must not be empty.`);
    }
    if (
      !Array.isArray(card.supportingSymbols) ||
      card.supportingSymbols.length > 2
    ) {
      errors.push(`${label}.supportingSymbols must contain zero to two items.`);
    }
    if (
      !Array.isArray(card.legacySeedReferenceIds) ||
      card.legacySeedReferenceIds.length <
        manifest.referencePolicy.minimumImages ||
      card.legacySeedReferenceIds.length >
        manifest.referencePolicy.maximumImages ||
      new Set(card.legacySeedReferenceIds).size !==
        card.legacySeedReferenceIds.length
    ) {
      errors.push(
        `${label}.legacySeedReferenceIds must contain one or two unique legacy sources.`,
      );
    }
    for (const anchorId of card.legacySeedReferenceIds ?? []) {
      if (!anchorIds.has(anchorId))
        errors.push(`${label} uses unknown anchor ${anchorId}.`);
    }

    if (index < majorArcanaIds.length) {
      if (
        card.arcana !== "major" ||
        card.number !== index ||
        card.suitObjectCount !== null
      ) {
        errors.push(`${label} must match canonical Major Arcana metadata.`);
      }
    } else {
      const [suit, rank] = cardId.split("-");
      const expectedCount = /^\d+$/.test(rank) ? Number(rank) : 1;
      if (
        card.arcana !== "minor" ||
        card.suit !== suit ||
        card.rank !== rank ||
        card.suitObjectCount !== expectedCount
      ) {
        errors.push(
          `${label} must match canonical suit, rank, and exact object count.`,
        );
      }
    }
  }
  for (const [batch, count] of batchCounts) {
    if (count > 8) {
      errors.push(
        `Generation batch ${batch} has ${count} cards; maximum is 8.`,
      );
    }
  }
  requireExactIds(
    cardIds.filter((id) => manifest.cards[id].batch.startsWith("pilot-")),
    pilotIds,
    "pilot cards",
  );
  requireExactIds(
    cardIds.filter((id) => manifest.cards[id].disposition === "keep"),
    legacyKeepIds,
    "legacy keep cards",
  );
  requireExactIds(
    cardIds.filter((id) => manifest.cards[id].disposition === "replace"),
    legacyReplaceIds,
    "legacy replacement cards",
  );
  requireExactIds(
    cardIds.filter((id) =>
      manifest.generationPlan.courtValidationBatchIds.includes(
        manifest.cards[id].batch,
      ),
    ),
    expectedCourtValidationIds,
    "court validation cards",
  );

  validateLegacyAudit(legacyAudit, manifest, repositoryRoot, errors);

  validateEnvelope(approvals, manifest, "approvals", errors);
  validateEnvelope(generationRecords, manifest, "generationRecords", errors);
  validateEnvelope(styleHistory, manifest, "styleHistory", errors, false);
  validateEnvelope(releaseHistory, manifest, "releaseHistory", errors, false);
  if (
    releaseHistory.rollbackContract?.preserveV3AssetUrlsAfterFirstRelease !==
      true ||
    releaseHistory.rollbackContract?.preserveV3OgParserAfterFirstRelease !==
      true ||
    JSON.stringify(releaseHistory.rollbackContract?.preserveLegacyRenderers) !==
      JSON.stringify(["v1", "v2"])
  ) {
    errors.push(
      "releaseHistory.rollbackContract must preserve legacy renderers, v3 asset URLs, and v3 OG parsing.",
    );
  }

  if (
    stableStringify(generationRecords.normalizationRecipe) !==
    stableStringify(normalizationRecipeContract)
  ) {
    errors.push(
      "generationRecords.normalizationRecipe must match the reviewed sharp-cover-v1 contract.",
    );
  }

  const generationById = new Map(
    (generationRecords.records ?? []).map((record) => [record.id, record]),
  );
  const approvalEntries = Object.entries(approvals.records ?? {});
  let approvedDeckBytes = 0;
  for (const [cardId, approval] of approvalEntries) {
    const label = `approvals.records.${cardId}`;
    if (!canonicalTarotCardIds.includes(cardId))
      errors.push(`${label} is not canonical.`);
    if (approval.status !== "approved")
      errors.push(`${label}.status must be approved.`);
    if (
      !["generated-v3", "legacy-v2", "retouched-v3"].includes(
        approval.provenance,
      )
    ) {
      errors.push(`${label}.provenance is invalid.`);
    }
    if (
      approval.promotedSuitAnchor === true &&
      !plannedSuitAnchorIds.has(cardId)
    ) {
      errors.push(`${label} cannot be promoted as an unplanned suit anchor.`);
    }
    const expectedPromptSha256 = sha256(buildCardArtV3Prompt(manifest, cardId));
    if (
      approval.provenance === "generated-v3" &&
      approval.promptSha256 !== expectedPromptSha256
    ) {
      errors.push(`${label}.promptSha256 does not match the frozen prompt.`);
    }
    if (approval.provenance === "legacy-v2" && approval.promptSha256 !== null) {
      errors.push(
        `${label}.promptSha256 must be null for byte-identical legacy reuse.`,
      );
    }
    const auditDecision = legacyAudit.records?.[cardId]?.decision;
    const needsRetouch = manifest.cards?.[cardId]?.needsRetouch === true;
    const expectedProvenance = needsRetouch
      ? "retouched-v3"
      : auditDecision === "keep"
        ? "legacy-v2"
        : "generated-v3";
    if (approval.provenance !== expectedProvenance) {
      errors.push(
        `${label}.provenance must be ${expectedProvenance} for its reviewed disposition.`,
      );
    }
    if (approval.provenance === "legacy-v2" && auditDecision !== "keep") {
      errors.push(
        `${label} can reuse v2 bytes only after a keep audit decision.`,
      );
    }
    if (approval.provenance !== "legacy-v2") {
      const generation = generationById.get(approval.generationRecordId);
      if (
        !generation ||
        generation.cardId !== cardId ||
        generation.selectionStatus !== "selected" ||
        generation.normalized?.assetSha256 !== approval.assetSha256
      ) {
        errors.push(`${label} must reference its selected generation record.`);
      }
    }
    const assetPath = manifest.cards?.[cardId]?.assetPath;
    const absoluteAsset = resolve(repositoryRoot, assetPath ?? "");
    if (!existsSync(absoluteAsset)) {
      errors.push(`${label} is missing approved asset ${absoluteAsset}.`);
    } else {
      const image = readJpegMetadata(readFileSync(absoluteAsset));
      const assetBytes = readFileSync(absoluteAsset).length;
      approvedDeckBytes += assetBytes;
      if (
        image.width !== 700 ||
        image.height !== 980 ||
        image.components !== 3
      ) {
        errors.push(
          `${label} asset must be a 700x980 three-component sRGB-compatible JPEG.`,
        );
      }
      if (assetBytes > manifest.frame.maximumFileBytes) {
        errors.push(`${label} asset exceeds maximumFileBytes.`);
      }
      if (sha256(readFileSync(absoluteAsset)) !== approval.assetSha256) {
        errors.push(`${label}.assetSha256 does not match the approved asset.`);
      }
    }
    for (const check of approvalChecks) {
      if (approval.qa?.[check] !== true)
        errors.push(`${label}.qa.${check} must be true.`);
    }
    requireString(approval.reviewedAt, `${label}.reviewedAt`);
    requireString(approval.reviewer, `${label}.reviewer`);
  }
  if (approvedDeckBytes > manifest.frame.maximumDeckBytes) {
    errors.push("Approved v3 deck exceeds maximumDeckBytes.");
  }

  const generationIds = new Set();
  const imageGenRawPaths = new Set();
  const imageGenRawSha256 = new Set();
  const latestImageGenAttemptByCard = new Map();
  const seenImageGenAttemptsById = new Map();
  for (const [index, record] of (generationRecords.records ?? []).entries()) {
    const label = `generationRecords.records[${index}]`;
    requireString(record.id, `${label}.id`);
    requireString(record.cardId, `${label}.cardId`);
    requireString(record.batchId, `${label}.batchId`);
    requireString(record.generatedAt, `${label}.generatedAt`);
    requireString(record.rawOutputPath, `${label}.rawOutputPath`);
    requireString(record.rawOutputSha256, `${label}.rawOutputSha256`);
    if (generationIds.has(record.id))
      errors.push(`${label}.id must be unique.`);
    generationIds.add(record.id);
    if (!canonicalTarotCardIds.includes(record.cardId))
      errors.push(`${label}.cardId is not canonical.`);
    const card = manifest.cards?.[record.cardId];
    if (record.batchId !== card?.batch) {
      errors.push(`${label}.batchId does not match the card manifest.`);
    }
    if (
      record.manifestSha256 !== getCardArtV3ManifestSha256(manifest) ||
      record.cardSpecSha256 !==
        getCardArtV3CardSpecSha256(manifest, record.cardId)
    ) {
      errors.push(`${label} manifest or card-spec SHA-256 is stale.`);
    }
    const expectedGenerator = card?.needsRetouch
      ? manifest.retouchGenerator
      : manifest.generator;
    if (
      record.generator?.tool !== expectedGenerator?.tool ||
      record.generator?.mode !== expectedGenerator?.mode
    ) {
      errors.push(
        `${label}.generator must match the applicable manifest tool and mode.`,
      );
    }
    if (!isCanonicalUtcTimestamp(record.generatedAt)) {
      errors.push(`${label}.generatedAt must be a canonical UTC timestamp.`);
    }
    if (card?.needsRetouch) {
      const expectedRetouch =
        manifest.retouchGenerator?.expectedOutputs?.[record.cardId];
      const recipePath = resolve(
        repositoryRoot,
        manifest.retouchGenerator?.recipePath ?? "",
      );
      if (!existsSync(recipePath)) {
        errors.push(`${label}.retouch recipe is missing.`);
      } else if (
        record.retouchRecipeSha256 !== sha256(readFileSync(recipePath))
      ) {
        errors.push(
          `${label}.retouchRecipeSha256 does not match the frozen recipe.`,
        );
      }
      if (
        record.retouchRecipeDefinitionSha256 !==
        manifest.retouchGenerator?.recipeDefinitionSha256
      ) {
        errors.push(
          `${label}.retouchRecipeDefinitionSha256 does not match the frozen definition.`,
        );
      }
      if (record.retouchSourceSha256 !== expectedRetouch?.sourceSha256) {
        errors.push(
          `${label}.retouchSourceSha256 does not match the frozen source.`,
        );
      }
      if (
        record.rawOutputPath !== expectedRetouch?.rawOutputPath ||
        record.rawOutputSha256 !== expectedRetouch?.rawOutputSha256
      ) {
        errors.push(
          `${label} must bind the exact deterministic retouch path and raw SHA-256.`,
        );
      }
    } else if (
      record.retouchRecipeSha256 !== null ||
      record.retouchRecipeDefinitionSha256 !== null ||
      record.retouchSourceSha256 !== null
    ) {
      errors.push(
        `${label} retouch provenance must be null for ImageGen cards.`,
      );
    }
    if (!card?.needsRetouch) {
      const expectedAttemptId = `${record.cardId}-attempt-${String(
        record.attemptNumber,
      ).padStart(3, "0")}`;
      if (
        !Number.isInteger(record.attemptNumber) ||
        record.attemptNumber < 1 ||
        record.id !== expectedAttemptId
      ) {
        errors.push(
          `${label} must bind its sequential attemptNumber to its generation id.`,
        );
      }
      if (!["selected", "rejected"].includes(record.selectionStatus)) {
        errors.push(
          `${label}.selectionStatus must be selected or rejected for an immutable ImageGen attempt.`,
        );
      }
      const expectedRawPath = `art/card-art-v3-raw/${record.batchId}/${record.cardId}-candidate-${String(
        record.attemptNumber,
      ).padStart(3, "0")}${
        record.selectionStatus === "rejected" ? "-rejected" : ""
      }.png`;
      if (record.rawOutputPath !== expectedRawPath) {
        errors.push(
          `${label}.rawOutputPath must match its attempt number and immutable status.`,
        );
      }
      const previousAttempt = latestImageGenAttemptByCard.get(record.cardId);
      if (record.attemptNumber === 1) {
        if (record.previousAttemptId !== null || previousAttempt) {
          errors.push(`${label} first attempt must not have a predecessor.`);
        }
        if (record.retryConstraint !== null) {
          errors.push(`${label} first attempt cannot use a retry constraint.`);
        }
      } else if (
        !previousAttempt ||
        previousAttempt.id !== record.previousAttemptId ||
        previousAttempt.attemptNumber !== record.attemptNumber - 1 ||
        previousAttempt.selectionStatus !== "rejected"
      ) {
        errors.push(
          `${label} must reference the immediately preceding rejected attempt.`,
        );
      } else if (
        Date.parse(previousAttempt.generatedAt) >=
        Date.parse(record.generatedAt)
      ) {
        errors.push(`${label} must be generated after its preceding attempt.`);
      }
      if (
        record.attemptNumber > 1 &&
        (typeof record.regenerationReason !== "string" ||
          record.regenerationReason.trim() === "")
      ) {
        errors.push(
          `${label}.regenerationReason is required after the first attempt.`,
        );
      }
      if (record.retryConstraint === null) {
        if (record.retryReview !== null) {
          errors.push(
            `${label}.retryReview must be null without a constraint.`,
          );
        }
        if (record.editSource !== null && record.editSource !== undefined) {
          errors.push(`${label}.editSource must be null without a constraint.`);
        }
        if (
          record.controlReference !== null &&
          record.controlReference !== undefined
        ) {
          errors.push(
            `${label}.controlReference must be null without a constraint.`,
          );
        }
      } else if (typeof record.retryConstraint === "string") {
        try {
          const retryArtifact = loadRetryConstraintArtifact(
            record.retryReview?.artifactPath,
            record.cardId,
            repositoryRoot,
          );
          if (
            retryArtifact.sha256 !== record.retryReview?.artifactSha256 ||
            retryArtifact.constraint.trim() !== record.retryConstraint.trim() ||
            retryArtifact.attemptNumber !== record.attemptNumber ||
            retryArtifact.previousAttemptId !== record.previousAttemptId ||
            retryArtifact.reason !== record.regenerationReason ||
            stableStringify(retryArtifact.editSource) !==
              stableStringify(record.editSource ?? null) ||
            stableStringify(retryArtifact.controlReference) !==
              stableStringify(record.controlReference ?? null) ||
            retryArtifact.result !== record.retryReview?.result ||
            retryArtifact.reviewedAt !== record.retryReview?.reviewedAt ||
            retryArtifact.reviewer !== record.retryReview?.reviewer
          ) {
            errors.push(
              `${label}.retryReview must exactly bind the independently approved constraint artifact.`,
            );
          }
          const predecessor = latestImageGenAttemptByCard.get(record.cardId);
          if (
            Date.parse(retryArtifact.reviewedAt) >=
              Date.parse(record.generatedAt) ||
            !predecessor ||
            Date.parse(predecessor.generatedAt) >=
              Date.parse(retryArtifact.reviewedAt)
          ) {
            errors.push(
              `${label} must preserve predecessor generation < retry review < generation time order.`,
            );
          }
          if (retryArtifact.editSource !== null) {
            const editSourceAttempt = seenImageGenAttemptsById.get(
              retryArtifact.editSource.attemptId,
            );
            if (
              !editSourceAttempt ||
              Date.parse(editSourceAttempt.generatedAt) >=
                Date.parse(retryArtifact.reviewedAt)
            ) {
              errors.push(
                `${label} edit source must be generated before retry review.`,
              );
            }
          }
        } catch (error) {
          errors.push(`${label}.retryReview is invalid: ${error.message}`);
        }
      }
      if (imageGenRawPaths.has(record.rawOutputPath)) {
        errors.push(`${label}.rawOutputPath must be globally unique.`);
      }
      if (imageGenRawSha256.has(record.rawOutputSha256)) {
        errors.push(`${label}.rawOutputSha256 must be globally unique.`);
      }
      imageGenRawPaths.add(record.rawOutputPath);
      imageGenRawSha256.add(record.rawOutputSha256);
      if (
        record.retryConstraint !== null &&
        typeof record.retryConstraint !== "string"
      ) {
        errors.push(`${label}.retryConstraint must be null or a string.`);
      } else {
        try {
          const expectedEffectivePrompt =
            record.editSource === null || record.editSource === undefined
              ? buildCardArtV3AttemptPrompt(
                  buildCardArtV3Prompt(manifest, record.cardId),
                  record.retryConstraint,
                )
              : buildCardArtV3PrecisionEditPrompt(record.retryConstraint);
          if (
            record.effectivePromptSha256 !== sha256(expectedEffectivePrompt)
          ) {
            errors.push(
              `${label}.effectivePromptSha256 does not match the exact sent prompt.`,
            );
          }
        } catch (error) {
          errors.push(`${label}.retryConstraint is invalid: ${error.message}`);
        }
      }
      if (
        record.retryConstraint !== null &&
        (typeof record.regenerationReason !== "string" ||
          record.regenerationReason.trim() === "")
      ) {
        errors.push(
          `${label}.regenerationReason is required when retryConstraint is used.`,
        );
      }
    }
    if (
      record.promptSha256 !==
      sha256(buildCardArtV3Prompt(manifest, record.cardId))
    ) {
      errors.push(`${label}.promptSha256 does not match the current prompt.`);
    }
    let expectedReferenceSha256 = {};
    try {
      if (record.editSource !== null && record.editSource !== undefined) {
        const sourceAttempt = seenImageGenAttemptsById.get(
          record.editSource.attemptId,
        );
        if (
          !sourceAttempt ||
          sourceAttempt.cardId !== record.cardId ||
          sourceAttempt.selectionStatus !== "rejected" ||
          sourceAttempt.attemptNumber >= record.attemptNumber ||
          sourceAttempt.rawOutputPath !== record.editSource.path ||
          sourceAttempt.rawOutputSha256 !== record.editSource.sha256 ||
          Date.parse(sourceAttempt.generatedAt) >=
            Date.parse(record.generatedAt)
        ) {
          throw new Error(
            "editSource must bind an immutable rejected attempt of the same card",
          );
        }
        expectedReferenceSha256 = {
          [record.editSource.attemptId]: record.editSource.sha256,
          ...(record.controlReference === null ||
          record.controlReference === undefined
            ? {}
            : {
                [record.controlReference.id]: record.controlReference.sha256,
              }),
        };
        if (
          record.controlReference !== null &&
          record.controlReference !== undefined
        ) {
          const controlPath = resolve(
            repositoryRoot,
            record.controlReference.path ?? "",
          );
          if (
            record.controlReference.path !==
              `art/card-art-v3-controls/${record.controlReference.id}.png` ||
            !existsSync(controlPath) ||
            sha256(readFileSync(controlPath)) !== record.controlReference.sha256
          ) {
            throw new Error(
              "controlReference must bind its immutable reviewed PNG",
            );
          }
        }
      } else {
        expectedReferenceSha256 = Object.fromEntries(
          resolveReferenceRecords(files, record.cardId, repositoryRoot).map(
            ({ id, sha256: hash }) => [id, hash],
          ),
        );
      }
    } catch (error) {
      errors.push(
        `${label} cannot resolve frozen references: ${error.message}`,
      );
    }
    if (
      stableStringify(record.referenceSha256) !==
      stableStringify(expectedReferenceSha256)
    ) {
      errors.push(
        `${label}.referenceSha256 must exactly match the actual frozen generation inputs.`,
      );
    }
    const rawOutput = resolve(repositoryRoot, record.rawOutputPath ?? "");
    if (!isProjectRelativePath(record.rawOutputPath)) {
      errors.push(`${label}.rawOutputPath must be project-relative.`);
    }
    if (!existsSync(rawOutput)) {
      errors.push(`${label}.rawOutputPath is missing.`);
    } else if (sha256(readFileSync(rawOutput)) !== record.rawOutputSha256) {
      errors.push(`${label}.rawOutputSha256 does not match the raw output.`);
    }
    if (
      !["candidate", "rejected", "selected"].includes(record.selectionStatus)
    ) {
      errors.push(`${label}.selectionStatus is invalid.`);
    }
    if (
      record.regenerationReason !== null &&
      (typeof record.regenerationReason !== "string" ||
        record.regenerationReason.trim() === "")
    ) {
      errors.push(
        `${label}.regenerationReason must be null or a non-empty string.`,
      );
    }
    if (!card?.needsRetouch) {
      latestImageGenAttemptByCard.set(record.cardId, record);
      seenImageGenAttemptsById.set(record.id, record);
    }
    if (record.selectionStatus === "selected") {
      const normalized = record.normalized;
      requireString(normalized?.assetPath, `${label}.normalized.assetPath`);
      requireString(normalized?.assetSha256, `${label}.normalized.assetSha256`);
      if (normalized?.recipeId !== generationRecords.normalizationRecipe.id) {
        errors.push(`${label}.normalized.recipeId is invalid.`);
      }
      const normalizedAsset = resolve(
        repositoryRoot,
        normalized?.assetPath ?? "",
      );
      if (!isProjectRelativePath(normalized?.assetPath)) {
        errors.push(`${label}.normalized.assetPath must be project-relative.`);
      }
      if (!existsSync(normalizedAsset)) {
        errors.push(`${label}.normalized.assetPath is missing.`);
      } else if (
        sha256(readFileSync(normalizedAsset)) !== normalized.assetSha256
      ) {
        errors.push(`${label}.normalized.assetSha256 does not match.`);
      } else {
        const normalizedBuffer = readFileSync(normalizedAsset);
        if (normalized.assetBytes !== normalizedBuffer.length) {
          errors.push(`${label}.normalized.assetBytes does not match.`);
        }
        if (normalizedBuffer.length > manifest.frame.maximumFileBytes) {
          errors.push(`${label}.normalized asset exceeds maximumFileBytes.`);
        }
        const image = readJpegMetadata(normalizedBuffer);
        if (
          image.width !== 700 ||
          image.height !== 980 ||
          image.components !== 3
        ) {
          errors.push(
            `${label}.normalized asset violates the sRGB-compatible JPEG frame.`,
          );
        }
      }
      if (normalized.inputSha256 !== record.rawOutputSha256) {
        errors.push(
          `${label}.normalized.inputSha256 must match the raw output.`,
        );
      }
      if (
        ![
          "attention",
          "centre",
          "north",
          "northeast",
          "northwest",
          "south",
          "southeast",
          "southwest",
        ].includes(normalized.cropPosition)
      ) {
        errors.push(`${label}.normalized.cropPosition is invalid.`);
      }
      if (
        normalized.recipeFingerprintSha256 !==
        sha256(stableStringify(generationRecords.normalizationRecipe))
      ) {
        errors.push(`${label}.normalized.recipeFingerprintSha256 is invalid.`);
      }
    }
  }

  const styleVersions = new Set();
  for (const [index, entry] of (styleHistory.entries ?? []).entries()) {
    const label = `styleHistory.entries[${index}]`;
    requireString(entry.version, `${label}.version`);
    requireString(entry.reviewedAt, `${label}.reviewedAt`);
    requireString(entry.reviewer, `${label}.reviewer`);
    if (styleVersions.has(entry.version)) {
      errors.push(`${label}.version must be append-only and unique.`);
    }
    styleVersions.add(entry.version);
    requireExactIds(
      entry.promotedSuitAnchorIds,
      [...plannedSuitAnchorIds],
      `${label}.promotedSuitAnchorIds`,
    );
    for (const cardId of plannedSuitAnchorIds) {
      if (
        entry.assetSha256?.[cardId] !==
          approvals.records?.[cardId]?.assetSha256 ||
        approvals.records?.[cardId]?.promotedSuitAnchor !== true
      ) {
        errors.push(
          `${label}.assetSha256.${cardId} must lock an approved promoted suit anchor.`,
        );
      }
    }
    for (const check of manifest.generationPlan.pilotGateChecks) {
      if (entry.pilotGateChecks?.[check] !== true) {
        errors.push(
          `${label}.pilotGateChecks[${JSON.stringify(check)}] must be true.`,
        );
      }
    }
    const expectedFingerprint = sha256(
      stableStringify({
        assetSha256: entry.assetSha256,
        compositionRules: manifest.compositionRules,
        frame: manifest.frame,
        prompt: manifest.prompt,
        referencePolicy: manifest.referencePolicy,
        suitRules: manifest.suitRules,
      }),
    );
    if (entry.styleFingerprintSha256 !== expectedFingerprint) {
      errors.push(
        `${label}.styleFingerprintSha256 does not match reviewed style inputs.`,
      );
    }
  }

  const releaseVersions = new Set();
  const validateReviewArtifact = (review, label) => {
    requireString(review?.artifactPath, `${label}.artifactPath`);
    requireString(review?.artifactSha256, `${label}.artifactSha256`);
    requireString(review?.reviewedAt, `${label}.reviewedAt`);
    requireString(review?.reviewer, `${label}.reviewer`);
    if (review?.independent !== true || review?.result !== "approved") {
      errors.push(`${label} must record an independent approved review.`);
    }
    if (!isProjectRelativePath(review?.artifactPath)) {
      errors.push(`${label}.artifactPath must be project-relative.`);
      return;
    }
    const artifact = resolve(repositoryRoot, review.artifactPath);
    if (!existsSync(artifact)) {
      errors.push(`${label}.artifactPath is missing.`);
    } else if (sha256(readFileSync(artifact)) !== review.artifactSha256) {
      errors.push(`${label}.artifactSha256 does not match its artifact.`);
    }
  };

  for (const [index, release] of releaseEntries.entries()) {
    const label = `releaseHistory.entries[${index}]`;
    requireString(release.version, `${label}.version`);
    requireString(release.releasedAt, `${label}.releasedAt`);
    requireString(release.reviewedAt, `${label}.reviewedAt`);
    requireString(release.reviewer, `${label}.reviewer`);
    if (releaseVersions.has(release.version)) {
      errors.push(`${label}.version must be append-only and unique.`);
    }
    releaseVersions.add(release.version);
    requireExactIds(release.cardIds, canonicalTarotCardIds, `${label}.cardIds`);
    if (approvalEntries.length !== canonicalTarotCardIds.length) {
      errors.push(`${label} cannot exist before all 78 cards are approved.`);
    }
    requireExactIds(
      Object.keys(release.assetSha256 ?? {}),
      canonicalTarotCardIds,
      `${label}.assetSha256`,
    );
    for (const cardId of canonicalTarotCardIds) {
      if (
        release.assetSha256?.[cardId] !==
        approvals.records?.[cardId]?.assetSha256
      ) {
        errors.push(`${label}.assetSha256.${cardId} must match its approval.`);
      }
    }
    if (
      release.metadataVersion !== "v3" ||
      release.shareImageVersion !== "v3" ||
      release.rollbackCompatible !== true
    ) {
      errors.push(
        `${label} must lock v3 metadata/share rendering and rollback compatibility.`,
      );
    }
    const expectedRuntimeMapSha256 = sha256(
      stableStringify(
        Object.fromEntries(
          canonicalTarotCardIds.map((cardId) => [
            cardId,
            {
              assetSha256: release.assetSha256?.[cardId],
              src: `/cards/v3/${cardId}.jpg`,
            },
          ]),
        ),
      ),
    );
    if (release.runtimeMapSha256 !== expectedRuntimeMapSha256) {
      errors.push(
        `${label}.runtimeMapSha256 does not match the complete release map.`,
      );
    }

    const deckReview = release.independentReviews?.deckContactSheet;
    validateReviewArtifact(
      deckReview,
      `${label}.independentReviews.deckContactSheet`,
    );
    if (
      deckReview?.deckAssetMapSha256 !==
      sha256(
        stableStringify({
          assetSha256: release.assetSha256,
          cardIds: release.cardIds,
        }),
      )
    ) {
      errors.push(
        `${label}.independentReviews.deckContactSheet.deckAssetMapSha256 must bind the reviewed contact sheet to all 78 released assets.`,
      );
    }
    for (const check of manifest.generationPlan.finalDeckGateChecks) {
      if (deckReview?.checks?.[check] !== true) {
        errors.push(
          `${label}.independentReviews.deckContactSheet.checks[${JSON.stringify(check)}] must be true.`,
        );
      }
    }
    for (const reviewId of releaseSurfaceReviewIds) {
      validateReviewArtifact(
        release.independentReviews?.[reviewId],
        `${label}.independentReviews.${reviewId}`,
      );
    }
    const expectedReleaseGateSha256 = sha256(
      stableStringify({
        assetSha256: release.assetSha256,
        cardIds: release.cardIds,
        independentReviews: release.independentReviews,
        metadataVersion: release.metadataVersion,
        rollbackCompatible: release.rollbackCompatible,
        runtimeMapSha256: release.runtimeMapSha256,
        shareImageVersion: release.shareImageVersion,
      }),
    );
    if (release.releaseGateSha256 !== expectedReleaseGateSha256) {
      errors.push(
        `${label}.releaseGateSha256 must lock the complete deck and all independent surface reviews.`,
      );
    }
  }

  if (errors.length)
    throw new Error(`Card art v3 validation failed:\n- ${errors.join("\n- ")}`);
  return {
    approvedCount: approvalEntries.length,
    cardCount: cardIds.length,
    generationCount: generationRecords.records?.length ?? 0,
    releaseCount: releaseHistory.entries?.length ?? 0,
  };
}

function validateEnvelope(
  value,
  manifest,
  label,
  errors,
  requireVersion = true,
) {
  if (value?.systemId !== manifest.systemId)
    errors.push(`${label}.systemId must match manifest.`);
  if (requireVersion && value?.version !== manifest.version)
    errors.push(`${label}.version must match manifest.`);
  const collection =
    label === "approvals" ? value?.records : (value?.entries ?? value?.records);
  if (
    collection === undefined ||
    (typeof collection !== "object" && !Array.isArray(collection))
  ) {
    errors.push(`${label} must contain its records or entries collection.`);
  }
}

function validateAppendOnlyV3Records(baseline, current, errors) {
  if (!baseline) return;
  for (const key of ["generationRecords", "releaseHistory", "styleHistory"]) {
    const priorEntries = baseline[key]?.entries ?? baseline[key]?.records;
    const currentEntries = current[key]?.entries ?? current[key]?.records;
    if (!Array.isArray(priorEntries)) continue;
    if (
      !Array.isArray(currentEntries) ||
      currentEntries.length < priorEntries.length ||
      priorEntries.some(
        (entry, index) =>
          stableStringify(entry) !== stableStringify(currentEntries[index]),
      )
    ) {
      errors.push(`${key} must preserve the immutable baseline prefix.`);
    }
  }
  for (const [cardId, priorApproval] of Object.entries(
    baseline.approvals?.records ?? {},
  )) {
    if (
      stableStringify(current.approvals?.records?.[cardId]) !==
      stableStringify(priorApproval)
    ) {
      errors.push(`approvals.records.${cardId} is immutable once committed.`);
    }
  }
  if (
    baseline.legacyAudit &&
    stableStringify(current.legacyAudit) !==
      stableStringify(baseline.legacyAudit)
  ) {
    errors.push("legacyAudit is immutable once committed.");
  }
  if (
    baseline.controlRegistry &&
    Object.entries(baseline.controlRegistry.controls ?? {}).some(
      ([controlId, priorControl]) =>
        stableStringify(current.controlRegistry?.controls?.[controlId]) !==
        stableStringify(priorControl),
    )
  ) {
    errors.push(
      "controlRegistry must preserve every committed control record unchanged.",
    );
  }
}

function validateControlRegistry(registry, manifest, repositoryRoot, errors) {
  if (
    registry?.systemId !== manifest.systemId ||
    registry?.version !== "v3" ||
    registry?.schemaVersion !== 1 ||
    !registry.controls ||
    typeof registry.controls !== "object" ||
    Array.isArray(registry.controls)
  ) {
    errors.push(
      "controlRegistry must match the reviewed v3 control registry schema.",
    );
    return;
  }
  const expectedChecks = [
    "exactTopCount",
    "exactContinuousShaftCount",
    "exactBottomCount",
    "noMergeSplitOrLoss",
    "singleBundle",
    "noText",
    "thumbnailLegible",
  ];
  for (const [controlId, control] of Object.entries(registry.controls)) {
    const label = `controlRegistry.controls.${controlId}`;
    const sourcePath = `art/card-art-v3-controls/${controlId}.svg`;
    const renderPath = `art/card-art-v3-controls/${controlId}.png`;
    if (
      !manifest.cards?.[control.cardId] ||
      !new RegExp(`^${control.cardId}-[a-z0-9-]+-v[0-9]+$`).test(controlId) ||
      control.status !== "approved" ||
      typeof control.purpose !== "string" ||
      control.purpose.trim() === ""
    ) {
      errors.push(`${label} must identify one approved card-specific control.`);
    }
    if (
      control.source?.path !== sourcePath ||
      !/^[a-f0-9]{64}$/.test(control.source?.sha256 ?? "") ||
      control.render?.path !== renderPath ||
      !/^[a-f0-9]{64}$/.test(control.render?.sha256 ?? "")
    ) {
      errors.push(`${label} must bind its exact SVG and PNG paths and hashes.`);
      continue;
    }
    const absoluteSourcePath = resolve(repositoryRoot, sourcePath);
    const absoluteRenderPath = resolve(repositoryRoot, renderPath);
    if (
      !existsSync(absoluteSourcePath) ||
      sha256(readFileSync(absoluteSourcePath)) !== control.source.sha256
    ) {
      errors.push(`${label}.source must match its reviewed SVG bytes.`);
    } else if (/<text\b/i.test(readFileSync(absoluteSourcePath, "utf8"))) {
      errors.push(`${label}.source must not contain SVG text elements.`);
    }
    if (!existsSync(absoluteRenderPath)) {
      errors.push(`${label}.render PNG is missing.`);
    } else {
      const renderBuffer = readFileSync(absoluteRenderPath);
      const pngFrame = readPngFrame(renderBuffer);
      if (
        sha256(renderBuffer) !== control.render.sha256 ||
        renderBuffer.length !== control.render.bytes ||
        pngFrame.width !== control.render.width ||
        pngFrame.height !== control.render.height
      ) {
        errors.push(
          `${label}.render must match its reviewed PNG bytes and frame.`,
        );
      }
    }
    if (
      control.render.tool !== "Sharp" ||
      control.render.toolVersion !== "0.34.5" ||
      control.render.format !== "png" ||
      typeof control.render.renderContract !== "string" ||
      control.render.renderContract.trim() === ""
    ) {
      errors.push(`${label}.render must preserve the reviewed Sharp contract.`);
    }
    if (
      control.approval?.result !== "approved" ||
      !isCanonicalUtcTimestamp(control.approval?.recordedAt) ||
      !Array.isArray(control.approval?.reviewers) ||
      new Set(control.approval.reviewers).size < 2 ||
      control.approval.reviewers.some(
        (reviewer) => typeof reviewer !== "string" || reviewer.trim() === "",
      ) ||
      JSON.stringify(Object.keys(control.approval?.checks ?? {})) !==
        JSON.stringify(expectedChecks) ||
      expectedChecks.some((check) => control.approval.checks[check] !== true)
    ) {
      errors.push(
        `${label}.approval must bind two independent passing reviews.`,
      );
    }
  }
}

function validateLegacyAudit(audit, manifest, repositoryRoot, errors) {
  if (audit?.systemId !== manifest.systemId) {
    errors.push("legacyAudit.systemId must match manifest.");
  }
  const expectedIds = [
    "the-fool",
    "the-magician",
    "the-high-priestess",
    "the-empress",
    "the-emperor",
    "the-lovers",
    "the-chariot",
    "strength",
    "the-hermit",
    "wheel-of-fortune",
    "temperance",
    "the-star",
  ];
  const actualIds = Object.keys(audit?.records ?? {});
  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
    errors.push(
      "legacyAudit.records must contain the exact twelve v2 source cards in canonical order.",
    );
  }
  for (const cardId of expectedIds) {
    const record = audit?.records?.[cardId];
    if (!record) continue;
    const expectedRecordKeys = [
      "decision",
      "needsRetouch",
      "rationale",
      "sourceAssetPath",
      "sourceFullSizeReviewed",
      "sourceSha256",
      "sourceThumbnailReviewed",
    ];
    if (
      JSON.stringify(Object.keys(record).sort()) !==
      JSON.stringify(expectedRecordKeys)
    ) {
      errors.push(
        `legacyAudit.records.${cardId} must contain source-audit fields only; retouch output review belongs in immutable approvals.`,
      );
    }
    const sourcePath = resolve(repositoryRoot, record.sourceAssetPath ?? "");
    if (!existsSync(sourcePath)) {
      errors.push(`legacyAudit.records.${cardId} source asset is missing.`);
    } else if (sha256(readFileSync(sourcePath)) !== record.sourceSha256) {
      errors.push(`legacyAudit.records.${cardId} source SHA-256 changed.`);
    }
    if (
      record.sourceFullSizeReviewed !== true ||
      record.sourceThumbnailReviewed !== true
    ) {
      errors.push(
        `legacyAudit.records.${cardId} requires full-size and thumbnail review.`,
      );
    }
    if (!["keep", "replace", "retouch"].includes(record.decision)) {
      errors.push(`legacyAudit.records.${cardId}.decision is invalid.`);
    }
    if (record.needsRetouch !== (record.decision === "retouch")) {
      errors.push(
        `legacyAudit.records.${cardId}.needsRetouch must match its decision.`,
      );
    }
    const expectedDisposition =
      record.decision === "replace" ? "replace" : "keep";
    if (manifest.cards?.[cardId]?.disposition !== expectedDisposition) {
      errors.push(
        `manifest.cards.${cardId}.disposition must match the reviewed legacy audit.`,
      );
    }
    if (
      Boolean(manifest.cards?.[cardId]?.needsRetouch) !== record.needsRetouch
    ) {
      errors.push(
        `manifest.cards.${cardId}.needsRetouch must match the reviewed legacy audit.`,
      );
    }
  }
}

function getCard(manifest, cardId) {
  const card = manifest.cards?.[cardId];
  if (!card) throw new Error(`Unknown card id "${cardId}".`);
  return card;
}

function rankRuleKey(rank) {
  return /^\d+$/.test(rank) ? "2-10" : rank;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function isCanonicalUtcTimestamp(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  ) {
    return false;
  }
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
  );
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

function isProjectRelativePath(value) {
  return (
    typeof value === "string" &&
    value !== "" &&
    !value.startsWith("/") &&
    !value.split(/[\\/]/u).includes("..")
  );
}

function readPngFrame(buffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (
    buffer.length < 24 ||
    !buffer.subarray(0, signature.length).equals(signature)
  ) {
    return { height: 0, width: 0 };
  }
  return {
    height: buffer.readUInt32BE(20),
    width: buffer.readUInt32BE(16),
  };
}

function readJpegMetadata(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8)
    throw new Error("Expected JPEG asset.");
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    const length = buffer.readUInt16BE(offset);
    if (
      [
        0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
        0xcf,
      ].includes(marker)
    ) {
      return {
        components: buffer[offset + 7],
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += length;
  }
  throw new Error("JPEG dimensions not found.");
}

async function main() {
  const files = loadCardArtV3Files(defaultRepositoryRoot);
  const args = process.argv.slice(2);
  if (args.includes("--check")) {
    console.log(
      JSON.stringify(
        validateCardArtV3System(files, defaultRepositoryRoot),
        null,
        2,
      ),
    );
    return;
  }
  const cardIndex = args.indexOf("--card");
  if (cardIndex === -1 || !args[cardIndex + 1]) {
    throw new Error(
      "Usage: pnpm art:v3 -- --card <canonical-card-id> [--retry-constraint-file <reviewed-json>] [--json] | --check",
    );
  }
  const retryConstraintIndex = args.indexOf("--retry-constraint-file");
  if (retryConstraintIndex !== -1 && !args[retryConstraintIndex + 1]) {
    throw new Error("--retry-constraint-file requires a reviewed JSON path.");
  }
  const record =
    retryConstraintIndex === -1
      ? getCardArtV3AttemptRecord(
          files,
          args[cardIndex + 1],
          null,
          defaultRepositoryRoot,
        )
      : getCardArtV3ReviewedAttemptRecord(
          files,
          args[cardIndex + 1],
          args[retryConstraintIndex + 1],
          defaultRepositoryRoot,
        );
  console.log(
    args.includes("--json")
      ? JSON.stringify(record, null, 2)
      : record.effectivePrompt,
  );
}

const isEntryPoint = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;
if (isEntryPoint)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });

export { approvalChecks, legacyKeepIds, legacyReplaceIds, pilotIds };
