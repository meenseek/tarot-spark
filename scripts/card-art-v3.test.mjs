import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildCardArtV3AttemptPrompt,
  buildCardArtV3PrecisionEditPrompt,
  buildCardArtV3Prompt,
  getCardArtV3AttemptRecord,
  getCardArtV3ManifestSha256,
  getCardArtV3PromptRecord,
  getCardArtV3ReviewedAttemptRecord,
  loadCardArtV3Files,
  validateCardArtV3System,
} from "./card-art-v3.mjs";
import {
  cardArtV3NormalizationRecipe,
  normalizeCardArtV3,
} from "./card-art-v3-normalize.mjs";
import {
  cardArtV3RetouchRecipe,
  renderCardArtV3Retouch,
  retouchCardArtV3,
} from "./card-art-v3-retouch.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");
const temporaryDirectories = [];
const temporaryFiles = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { force: true, recursive: true })),
  );
  await Promise.all(
    temporaryFiles.splice(0).map((path) => rm(path, { force: true })),
  );
});

describe("card art v3 preflight", () => {
  it("validates the canonical 78-card planning system before generation", () => {
    const files = loadCardArtV3Files(repositoryRoot);

    expect(validateCardArtV3System(files, repositoryRoot)).toEqual({
      approvedCount: 2,
      cardCount: 78,
      generationCount: 20,
      releaseCount: 0,
    });
  });

  it("builds a deterministic retouch prompt from the reviewed manifest and frozen source", () => {
    const files = loadCardArtV3Files(repositoryRoot);
    const first = getCardArtV3PromptRecord(files, "the-hermit", repositoryRoot);
    const second = getCardArtV3PromptRecord(
      files,
      "the-hermit",
      repositoryRoot,
    );

    expect(first).toEqual(second);
    expect(first.mode).toBe("deterministic-local-restoration");
    expect(first.prompt).toContain("CARD DIRECTION — The Hermit");
    expect(first.prompt).toContain("Retouch-only lock");
    expect(first.prompt).toContain("no visible letters");
    expect(first.referenced_image_paths).toEqual([
      resolve(repositoryRoot, "public/cards/the-hermit.jpg"),
    ]);
    expect(Object.keys(first.referenceSha256)).toEqual(["the-hermit"]);
    expect(buildCardArtV3Prompt(files.manifest, "wands-ace")).toContain(
      "show exactly 1 wands suit object",
    );
  });

  it("binds a retry-only observable constraint to the exact effective prompt", () => {
    const files = loadCardArtV3Files(repositoryRoot);
    const base = getCardArtV3AttemptRecord(files, "wands-10");
    const retryConstraint =
      "Keep the store yard distant and closed; show no additional pole-like object anywhere outside the ten carried staffs.";
    const retry = getCardArtV3AttemptRecord(files, "wands-10", retryConstraint);

    expect(base.retryConstraint).toBeNull();
    expect(base.effectivePrompt).toBe(base.prompt);
    expect(base.effectivePromptSha256).toBe(base.promptSha256);
    expect(retry.promptSha256).toBe(base.promptSha256);
    expect(retry.effectivePrompt).toBe(
      buildCardArtV3AttemptPrompt(base.prompt, retryConstraint),
    );
    expect(retry.effectivePromptSha256).not.toBe(retry.promptSha256);
    expect(() => buildCardArtV3AttemptPrompt(base.prompt, "too short")).toThrow(
      /20–1200 character/i,
    );
  });

  it("prints only the reviewed effective retry prompt through the canonical CLI", () => {
    const artifactPath =
      "art/card-art-v3-retry-constraints/wands-10-attempt-004.json";
    const output = execFileSync(
      process.execPath,
      [
        "--import=tsx",
        "scripts/card-art-v3.mjs",
        "--card",
        "wands-10",
        "--retry-constraint-file",
        artifactPath,
        "--json",
      ],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    const record = JSON.parse(output);

    expect(record.attemptNumber).toBe(4);
    expect(record.previousAttemptId).toBe("wands-10-attempt-003");
    expect(record.effectivePrompt).toContain(
      "RETRY CONSTRAINT — PRESERVE EVERY BASE CONTRACT ABOVE",
    );
    expect(record.effectivePromptSha256).not.toBe(record.promptSha256);
    expect(record.retryReview).toMatchObject({
      artifactPath,
      result: "approved",
      reviewer: "Planck (independent tarot content static audit)",
    });
  });

  it("binds a precision edit to one immutable rejected source and the exact short edit prompt", () => {
    const files = loadCardArtV3Files(repositoryRoot);
    const artifactPath =
      "art/card-art-v3-retry-constraints/wands-10-attempt-007.json";
    const record = getCardArtV3ReviewedAttemptRecord(
      files,
      "wands-10",
      artifactPath,
      repositoryRoot,
    );

    expect(record.attemptNumber).toBe(7);
    expect(record.editSource).toEqual({
      attemptId: "wands-10-attempt-004",
      path: "art/card-art-v3-raw/pilot-wands/wands-10-candidate-004-rejected.png",
      sha256:
        "c2cdf54ef8dbfcdc8642722659b85fe448e9c80f7533fc0fc6deb9de73f0d4eb",
    });
    expect(record.effectivePrompt).toBe(
      buildCardArtV3PrecisionEditPrompt(record.retryConstraint),
    );
    expect(record.effectivePrompt).not.toContain("CARD DIRECTION");
    expect(record.referenced_image_paths).toEqual([
      resolve(repositoryRoot, record.editSource.path),
    ]);
    expect(record.referenceSha256).toEqual({
      "wands-10-attempt-004": record.editSource.sha256,
    });
  });

  it("binds a reviewed geometry control as the second immutable precision-edit input", () => {
    const files = loadCardArtV3Files(repositoryRoot);
    const record = getCardArtV3ReviewedAttemptRecord(
      files,
      "wands-10",
      "art/card-art-v3-retry-constraints/wands-10-attempt-009.json",
      repositoryRoot,
    );

    expect(record.controlReference).toEqual({
      id: "wands-10-ten-staff-fan-v1",
      path: "art/card-art-v3-controls/wands-10-ten-staff-fan-v1.png",
      sha256:
        "a9490bc20ff775fc2e60e1874120cce390a34d0e13cdd59a7c2c1c3e9a3c2572",
    });
    expect(record.referenced_image_paths).toEqual([
      resolve(repositoryRoot, record.editSource.path),
      resolve(repositoryRoot, record.controlReference.path),
    ]);
    expect(record.referenceSha256).toEqual({
      "wands-10-attempt-005": record.editSource.sha256,
      "wands-10-ten-staff-fan-v1": record.controlReference.sha256,
    });
    expect(record.effectivePrompt).toContain(
      "second supplied image is a geometry control",
    );
  });

  it("binds the approved horizontal ten-row control to attempt 012", () => {
    const files = loadCardArtV3Files(repositoryRoot);
    const record = getCardArtV3ReviewedAttemptRecord(
      files,
      "wands-10",
      "art/card-art-v3-retry-constraints/wands-10-attempt-012.json",
      repositoryRoot,
    );

    expect(record.editSource?.attemptId).toBe("wands-10-attempt-011");
    expect(record.controlReference?.id).toBe(
      "wands-10-ten-horizontal-staffs-v2",
    );
    expect(record.referenced_image_paths).toEqual([
      resolve(repositoryRoot, record.editSource.path),
      resolve(repositoryRoot, record.controlReference.path),
    ]);
    expect(record.referenceSha256).toEqual({
      "wands-10-attempt-011": record.editSource.sha256,
      "wands-10-ten-horizontal-staffs-v2": record.controlReference.sha256,
    });
    expect(record.effectivePrompt).toContain(
      "exactly ten separated horizontal rows",
    );
  });

  it("rejects a byte-valid control file that is not in the independent control registry", async () => {
    const files = loadCardArtV3Files(repositoryRoot);
    const sourceArtifactPath = resolve(
      repositoryRoot,
      "art/card-art-v3-retry-constraints/wands-10-attempt-009.json",
    );
    const forgedArtifactPath = resolve(
      repositoryRoot,
      "art/card-art-v3-retry-constraints/wands-10-attempt-999.json",
    );
    const forgedControlPath = resolve(
      repositoryRoot,
      "art/card-art-v3-controls/wands-10-unreviewed-v1.png",
    );
    temporaryFiles.push(forgedArtifactPath, forgedControlPath);
    const approvedControl = await readFile(
      resolve(
        repositoryRoot,
        "art/card-art-v3-controls/wands-10-ten-staff-fan-v1.png",
      ),
    );
    await writeFile(forgedControlPath, approvedControl, { flag: "wx" });
    const artifact = JSON.parse(await readFile(sourceArtifactPath, "utf8"));
    artifact.attemptNumber = 999;
    artifact.previousAttemptId = "wands-10-attempt-998";
    artifact.controlReferenceId = "wands-10-unreviewed-v1";
    artifact.controlReferencePath =
      "art/card-art-v3-controls/wands-10-unreviewed-v1.png";
    artifact.controlReferenceSha256 = createHash("sha256")
      .update(approvedControl)
      .digest("hex");
    await writeFile(
      forgedArtifactPath,
      `${JSON.stringify(artifact, null, 2)}\n`,
      { flag: "wx" },
    );

    expect(() =>
      getCardArtV3ReviewedAttemptRecord(
        files,
        "wands-10",
        "art/card-art-v3-retry-constraints/wands-10-attempt-999.json",
        repositoryRoot,
      ),
    ).toThrow(/invalid immutable control reference/i);
  });

  it("re-renders every registered SVG to its exact reviewed control PNG bytes", async () => {
    const files = loadCardArtV3Files(repositoryRoot);

    for (const control of Object.values(files.controlRegistry.controls)) {
      const rendered = await sharp(resolve(repositoryRoot, control.source.path))
        .png()
        .toBuffer();
      expect(createHash("sha256").update(rendered).digest("hex")).toBe(
        control.render.sha256,
      );
    }
  });

  it("opens pilots after both retouches and keeps post-pilot prompts closed", () => {
    const files = loadCardArtV3Files(repositoryRoot);

    expect(() =>
      getCardArtV3PromptRecord(files, "wands-ace", repositoryRoot),
    ).not.toThrow();
    expect(() =>
      getCardArtV3PromptRecord(files, "wands-knight", repositoryRoot),
    ).toThrow(/all 16 pilots/i);
  });

  it("keeps every post-pilot generation stage closed until its prior review gate passes", () => {
    const files = loadCardArtV3Files(repositoryRoot);

    expect(() =>
      getCardArtV3PromptRecord(files, "swords-knight", repositoryRoot),
    ).toThrow(/until all 16 pilots pass review/i);
    expect(() =>
      getCardArtV3PromptRecord(files, "death", repositoryRoot),
    ).toThrow(/until all 16 pilots pass review/i);
    expect(() =>
      getCardArtV3PromptRecord(files, "the-fool", repositoryRoot),
    ).toThrow(/must not be regenerated/i);
    expect(() =>
      getCardArtV3PromptRecord(files, "the-hermit", repositoryRoot),
    ).not.toThrow();
  });

  it("opens only retouches and the sixteen pilots at the current gate", () => {
    const files = loadCardArtV3Files(repositoryRoot);
    const currentlyOpenIds = new Set(
      Object.entries(files.manifest.cards)
        .filter(
          ([, card]) =>
            card.needsRetouch === true ||
            files.manifest.generationPlan.pilotBatchIds.includes(card.batch),
        )
        .map(([cardId]) => cardId),
    );

    for (const cardId of Object.keys(files.manifest.cards)) {
      if (currentlyOpenIds.has(cardId)) {
        expect(() =>
          getCardArtV3PromptRecord(files, cardId, repositoryRoot),
        ).not.toThrow();
      } else {
        expect(() =>
          getCardArtV3PromptRecord(files, cardId, repositoryRoot),
        ).toThrow();
      }
    }
  });

  it("rejects canonical drift, count drift, oversized batches, audit drift, and anchor mutation", () => {
    const mutations = [
      (files) => delete files.manifest.cards["the-world"],
      (files) => {
        files.manifest.cards["cups-7"].suitObjectCount = 6;
      },
      (files) => {
        for (const id of Object.keys(files.manifest.cards).slice(0, 9)) {
          files.manifest.cards[id].batch = "unsafe-nine-card-batch";
        }
      },
      (files) => {
        files.legacyAudit.records["the-hermit"].decision = "keep";
      },
      (files) => {
        files.manifest.legacySources[0].sha256 = "0".repeat(64);
      },
      (files) => {
        files.generationRecords.normalizationRecipe.jpegQuality = 70;
      },
      (files) => {
        files.manifest.frame.maximumFileBytes = 1;
      },
      (files) => {
        files.manifest.generationPlan.stageOrder.splice(1, 1);
      },
      (files) => {
        files.manifest.generationPlan.finalDeckGateChecks.pop();
      },
    ];

    for (const mutate of mutations) {
      const files = structuredClone(loadCardArtV3Files(repositoryRoot));
      mutate(files);
      expect(() => validateCardArtV3System(files, repositoryRoot)).toThrow(
        /validation failed/i,
      );
    }
  }, 15_000);

  it("refuses a release snapshot before all 78 card approvals exist", () => {
    const files = structuredClone(loadCardArtV3Files(repositoryRoot));
    files.manifest.releaseState = "released";
    files.releaseHistory.entries.push({
      cardIds: Object.keys(files.manifest.cards),
      releasedAt: "2026-08-04",
      version: "v3.0.0",
    });

    expect(() => validateCardArtV3System(files, repositoryRoot)).toThrow(
      /before all 78 cards are approved/i,
    );
    expect(() => validateCardArtV3System(files, repositoryRoot)).toThrow(
      /independentReviews\.deckContactSheet/i,
    );
  });

  it("binds releaseState to release history without invalidating generation fingerprints", () => {
    const files = structuredClone(loadCardArtV3Files(repositoryRoot));
    const planningSha = getCardArtV3ManifestSha256(files.manifest);

    files.manifest.releaseState = "released";
    expect(getCardArtV3ManifestSha256(files.manifest)).toBe(planningSha);
    expect(() => validateCardArtV3System(files, repositoryRoot)).toThrow(
      /releaseState must be "planning"/i,
    );
  });

  it("keeps the committed legacy audit source-only while output review lives in approvals", () => {
    const files = loadCardArtV3Files(repositoryRoot);
    const baseline = { legacyAudit: structuredClone(files.legacyAudit) };

    expect(Object.keys(files.legacyAudit.records["the-hermit"])).not.toContain(
      "retouchFinalSha256",
    );
    expect(() =>
      validateCardArtV3System(files, repositoryRoot, baseline),
    ).not.toThrow();

    const changed = structuredClone(files);
    changed.legacyAudit.records["the-hermit"].retouchFinalSha256 = "0".repeat(
      64,
    );
    expect(() =>
      validateCardArtV3System(changed, repositoryRoot, baseline),
    ).toThrow(/source-audit fields only|immutable once committed/i);
  });

  it("rejects deletion or rewriting of committed append-only ledgers", () => {
    const files = loadCardArtV3Files(repositoryRoot);
    const baseline = {
      approvals: {
        records: {
          "the-fool": { assetSha256: "frozen", status: "approved" },
        },
      },
      generationRecords: { records: [{ id: "frozen-generation" }] },
      legacyAudit: files.legacyAudit,
      releaseHistory: { entries: [{ version: "frozen-release" }] },
      styleHistory: { entries: [{ version: "frozen-style" }] },
    };

    expect(() =>
      validateCardArtV3System(files, repositoryRoot, baseline),
    ).toThrow(/immutable baseline|immutable once committed/i);
  });

  it("makes prompt changes visible in the prompt fingerprint", () => {
    const files = loadCardArtV3Files(repositoryRoot);
    const original = buildCardArtV3Prompt(files.manifest, "cups-5");
    const changed = structuredClone(files.manifest);
    changed.cards["cups-5"].gesture += " Changed.";

    expect(buildCardArtV3Prompt(changed, "cups-5")).not.toBe(original);
  });

  it("binds every generation record to the exact resolved reference map", async () => {
    const files = loadCardArtV3Files(repositoryRoot);
    const promptRecord = getCardArtV3PromptRecord(
      files,
      "the-hermit",
      repositoryRoot,
    );
    const expectedRetouch =
      files.manifest.retouchGenerator.expectedOutputs["the-hermit"];
    const rawOutputPath = expectedRetouch.rawOutputPath;
    const rawOutput = await readFile(resolve(repositoryRoot, rawOutputPath));
    files.generationRecords.records.push({
      batchId: files.manifest.cards["the-hermit"].batch,
      cardId: "the-hermit",
      cardSpecSha256: promptRecord.cardSpecSha256,
      generatedAt: "2026-08-04T00:00:00.000Z",
      generator: {
        mode: "deterministic-local-restoration",
        tool: "Sharp",
      },
      id: "the-hermit-candidate-001",
      manifestSha256: promptRecord.manifestSha256,
      promptSha256: promptRecord.promptSha256,
      rawOutputPath,
      rawOutputSha256: createHash("sha256").update(rawOutput).digest("hex"),
      referenceSha256: promptRecord.referenceSha256,
      regenerationReason: null,
      retouchRecipeDefinitionSha256:
        files.manifest.retouchGenerator.recipeDefinitionSha256,
      retouchRecipeSha256: createHash("sha256")
        .update(
          await readFile(
            resolve(repositoryRoot, "scripts/card-art-v3-retouch.mjs"),
          ),
        )
        .digest("hex"),
      retouchSourceSha256: expectedRetouch.sourceSha256,
      selectionStatus: "candidate",
    });

    expect(() => validateCardArtV3System(files, repositoryRoot)).not.toThrow();
    const forged = structuredClone(files);
    forged.generationRecords.records[0].rawOutputPath =
      "public/cards/the-hermit.jpg";
    forged.generationRecords.records[0].rawOutputSha256 = createHash("sha256")
      .update(
        await readFile(resolve(repositoryRoot, "public/cards/the-hermit.jpg")),
      )
      .digest("hex");
    expect(() => validateCardArtV3System(forged, repositoryRoot)).toThrow(
      /exact deterministic retouch path and raw sha-256/i,
    );
    files.generationRecords.records[0].referenceSha256 = {
      "the-fool": files.manifest.legacySources.find(
        ({ id }) => id === "the-fool",
      ).sha256,
    };
    expect(() => validateCardArtV3System(files, repositoryRoot)).toThrow(
      /exactly match the actual frozen generation inputs/i,
    );
  });

  it("rejects broken ImageGen attempt chains, reused raw evidence, and first-attempt retries", () => {
    const files = loadCardArtV3Files(repositoryRoot);

    const brokenChain = structuredClone(files);
    const secondAttempt = brokenChain.generationRecords.records.find(
      ({ id }) => id === "wands-10-attempt-002",
    );
    secondAttempt.previousAttemptId = "wands-10-attempt-999";
    expect(() => validateCardArtV3System(brokenChain, repositoryRoot)).toThrow(
      /immediately preceding rejected attempt/i,
    );

    const reusedRaw = structuredClone(files);
    const first = reusedRaw.generationRecords.records.find(
      ({ id }) => id === "wands-10-attempt-001",
    );
    const second = reusedRaw.generationRecords.records.find(
      ({ id }) => id === "wands-10-attempt-002",
    );
    second.rawOutputPath = first.rawOutputPath;
    second.rawOutputSha256 = first.rawOutputSha256;
    expect(() => validateCardArtV3System(reusedRaw, repositoryRoot)).toThrow(
      /globally unique|attempt number and immutable status/i,
    );

    const firstAttemptRetry = structuredClone(files);
    const pageAttempt = firstAttemptRetry.generationRecords.records.find(
      ({ id }) => id === "wands-page-attempt-001",
    );
    pageAttempt.retryConstraint =
      "Show no background pole-like objects outside the single reviewed staff.";
    expect(() =>
      validateCardArtV3System(firstAttemptRetry, repositoryRoot),
    ).toThrow(/first attempt cannot use a retry constraint/i);

    const selfEditSource = structuredClone(files);
    const precisionEdit = selfEditSource.generationRecords.records.find(
      ({ id }) => id === "wands-10-attempt-007",
    );
    precisionEdit.editSource = {
      attemptId: precisionEdit.id,
      path: precisionEdit.rawOutputPath,
      sha256: precisionEdit.rawOutputSha256,
    };
    precisionEdit.referenceSha256 = {
      [precisionEdit.id]: precisionEdit.rawOutputSha256,
    };
    expect(() =>
      validateCardArtV3System(selfEditSource, repositoryRoot),
    ).toThrow(/independently approved constraint|frozen generation inputs/i);

    const generatedBeforeReview = structuredClone(files);
    generatedBeforeReview.generationRecords.records.find(
      ({ id }) => id === "wands-10-attempt-007",
    ).generatedAt = "2020-01-01T00:00:00.000Z";
    expect(() =>
      validateCardArtV3System(generatedBeforeReview, repositoryRoot),
    ).toThrow(/time order|after its preceding attempt/i);

    const predecessorAtReview = structuredClone(files);
    predecessorAtReview.generationRecords.records.find(
      ({ id }) => id === "wands-10-attempt-006",
    ).generatedAt = "2026-08-04T16:33:28.000Z";
    expect(() =>
      validateCardArtV3System(predecessorAtReview, repositoryRoot),
    ).toThrow(/time order/i);

    const editSourceAtReview = structuredClone(files);
    editSourceAtReview.generationRecords.records.find(
      ({ id }) => id === "wands-10-attempt-004",
    ).generatedAt = "2026-08-04T16:33:28.000Z";
    expect(() =>
      getCardArtV3ReviewedAttemptRecord(
        editSourceAtReview,
        "wands-10",
        "art/card-art-v3-retry-constraints/wands-10-attempt-007.json",
        repositoryRoot,
      ),
    ).toThrow(/precision edit source/i);
  }, 15_000);
});

describe("card art v3 normalization", () => {
  it("writes deterministic 700x980 sRGB JPEGs and refuses implicit overwrite", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "tarot-spark-art-v3-"));
    temporaryDirectories.push(directory);
    const outputPath = resolve(directory, "normalized.jpg");
    const inputPath = resolve(repositoryRoot, "public/cards/the-fool.jpg");
    const record = await normalizeCardArtV3({ inputPath, outputPath });
    const metadata = await sharp(outputPath).metadata();

    expect(record.recipe).toEqual(cardArtV3NormalizationRecipe);
    expect(record.cropPosition).toBe("attention");
    expect(record.finalSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(record.recipeFingerprintSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(record.recipeId).toBe("sharp-cover-v1");
    expect(metadata).toMatchObject({
      format: "jpeg",
      height: 980,
      space: "srgb",
      width: 700,
    });
    expect(await readFile(outputPath)).not.toHaveLength(0);
    await expect(normalizeCardArtV3({ inputPath, outputPath })).rejects.toThrow(
      /refusing to overwrite/i,
    );
  });
});

describe("card art v3 legacy retouch", () => {
  it.each(["the-hermit", "temperance"])(
    "removes only the frozen local star region for %s",
    async (cardId) => {
      const config = cardArtV3RetouchRecipe.cards[cardId];
      const sourcePath = resolve(repositoryRoot, config.sourcePath);

      const rendered = await renderCardArtV3Retouch({ cardId });
      const files = loadCardArtV3Files(repositoryRoot);
      const expectedRetouch =
        files.manifest.retouchGenerator.expectedOutputs[cardId];
      expect(rendered.outputSha256).toBe(expectedRetouch.rawOutputSha256);
      expect(rendered.sourceSha256).toBe(expectedRetouch.sourceSha256);
      expect(rendered.recipeDefinitionSha256).toBe(
        files.manifest.retouchGenerator.recipeDefinitionSha256,
      );
      const source = await sharp(sourcePath).removeAlpha().raw().toBuffer({
        resolveWithObject: true,
      });
      const output = await sharp(rendered.buffer).removeAlpha().raw().toBuffer({
        resolveWithObject: true,
      });
      expect(output.info).toMatchObject({
        channels: 3,
        height: source.info.height,
        width: source.info.width,
      });

      let changedInside = 0;
      let changedOutside = 0;
      for (let y = 0; y < source.info.height; y += 1) {
        for (let x = 0; x < source.info.width; x += 1) {
          const index = (y * source.info.width + x) * 3;
          const changed = [0, 1, 2].some(
            (channel) =>
              source.data[index + channel] !== output.data[index + channel],
          );
          if (!changed) continue;
          const inside = config.regions.some(
            ({ center, radius }) =>
              Math.abs(x - center.x) <= radius.x + 14 &&
              Math.abs(y - center.y) <= radius.y + 14,
          );
          if (inside) changedInside += 1;
          else changedOutside += 1;
        }
      }
      expect(changedInside).toBeGreaterThan(0);
      expect(changedOutside).toBe(0);

      for (const { center } of config.regions) {
        const centerIndex = (center.y * source.info.width + center.x) * 3;
        expect(output.data[centerIndex + 2]).toBeGreaterThan(
          output.data[centerIndex],
        );
      }
    },
  );

  it("rejects arbitrary output paths and atomically refuses an existing candidate", async () => {
    await expect(
      retouchCardArtV3({
        cardId: "the-hermit",
        outputPath: resolve(tmpdir(), "the-hermit-candidate-999.png"),
      }),
    ).rejects.toThrow(/directly under/i);
    await expect(
      retouchCardArtV3({
        cardId: "the-hermit",
        outputPath: resolve(
          repositoryRoot,
          "art/card-art-v3-raw/legacy-retouch/the-hermit-candidate-002.png",
        ),
      }),
    ).rejects.toThrow(/refusing to overwrite/i);
  });
});
