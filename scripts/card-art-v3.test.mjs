import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildCardArtV3Prompt,
  getCardArtV3ManifestSha256,
  getCardArtV3PromptRecord,
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

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { force: true, recursive: true })),
  );
});

describe("card art v3 preflight", () => {
  it("validates the canonical 78-card planning system before generation", () => {
    const files = loadCardArtV3Files(repositoryRoot);

    expect(validateCardArtV3System(files, repositoryRoot)).toEqual({
      approvedCount: 0,
      cardCount: 78,
      generationCount: 0,
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

  it("refuses pilots and post-pilot prompts until prior approvals are fully valid", () => {
    const files = loadCardArtV3Files(repositoryRoot);

    expect(() =>
      getCardArtV3PromptRecord(files, "wands-ace", repositoryRoot),
    ).toThrow(/both legacy retouches/i);
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

  it("opens only the two retouches at the initial generation gate", () => {
    const files = loadCardArtV3Files(repositoryRoot);
    const initiallyOpenIds = new Set(["the-hermit", "temperance"]);

    for (const cardId of Object.keys(files.manifest.cards)) {
      if (initiallyOpenIds.has(cardId)) {
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
  });

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
      /exactly match the frozen prompt record references/i,
    );
  });
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
