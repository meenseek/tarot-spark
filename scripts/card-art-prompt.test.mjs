import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { pilotArtSources } from "../src/components/visual/tarot-card-art-sources";
import {
  buildCardArtPrompt,
  getCardArtLocks,
  getCardArtPromptRecord,
  loadBaselineHistory,
  loadCardArtFiles,
  validateCardArtSystem,
} from "./card-art-prompt.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");
const { history, manifest } = loadCardArtFiles(repositoryRoot);

describe("card art prompt system", () => {
  it("validates immutable history, prompt locks, assets, and dimensions", () => {
    expect(() =>
      validateCardArtSystem({
        baselineHistory: loadBaselineHistory(
          repositoryRoot,
          process.env["ART_BASE_REF"],
        ),
        history,
        manifest,
        repositoryRoot,
      }),
    ).not.toThrow();
  });

  it("composes deterministic prompts with explicit mode and references", () => {
    const first = getCardArtPromptRecord(
      manifest,
      "the-lovers",
      repositoryRoot,
    );
    const second = getCardArtPromptRecord(
      manifest,
      "the-lovers",
      repositoryRoot,
    );

    expect(first).toEqual(second);
    expect(first.mode).toBe("default");
    expect(first.prompt).toContain("Quiet Celestial Storybook");
    expect(first.prompt).toContain("CARD DIRECTION — The Lovers");
    expect(first.prompt).toContain("REFERENCE CONTROL");
    expect(first.prompt).toContain("SYMBOL GRAMMAR");
    for (const rule of manifest.symbolGrammar) {
      expect(first.prompt).toContain(rule);
    }
    expect(first.prompt).toContain("NEGATIVE");
    expect(first.referenced_image_paths).toEqual([
      resolve(repositoryRoot, "public/cards/the-lovers.jpg"),
    ]);
  });

  it("locks every composed prompt and runtime pilot source to the manifest", () => {
    const locks = getCardArtLocks(manifest, repositoryRoot);
    const manifestSources = Object.fromEntries(
      manifest.cards
        .filter((card) => card.status === "approved-pilot")
        .map((card) => [
          card.id,
          `/${card.assetPath.replace(/^public\//, "")}`,
        ]),
    );

    expect(
      Object.fromEntries(
        manifest.cards.map((card) => [
          card.id,
          buildCardArtPrompt(manifest, card.id),
        ]),
      ),
    ).toEqual(
      Object.fromEntries(
        manifest.cards.map((card) => [
          card.id,
          getCardArtPromptRecord(manifest, card.id, repositoryRoot).prompt,
        ]),
      ),
    );
    expect(
      Object.fromEntries(
        manifest.cards.map((card) => [card.id, card.promptSha256]),
      ),
    ).toEqual(locks.promptSha256);
    expect(manifestSources).toEqual(pilotArtSources);

    for (const path of Object.keys(locks.assetSha256)) {
      expect(readFileSync(resolve(repositoryRoot, path))).not.toHaveLength(0);
    }
  });

  it("refuses to compose from an unapproved reference image", () => {
    const unsafeManifest = structuredClone(manifest);
    unsafeManifest.cards.find((card) => card.id === "the-lovers").status =
      "draft";

    expect(() =>
      getCardArtPromptRecord(unsafeManifest, "the-lovers", repositoryRoot),
    ).toThrow(/must be an approved pilot/i);
  });

  it("rejects rewritten history and unversioned style drift", () => {
    const rewrittenHistory = structuredClone(history);
    rewrittenHistory[0].review.date = "2026-07-31";

    expect(() =>
      validateCardArtSystem({
        baselineHistory: history,
        history: rewrittenHistory,
        manifest,
        repositoryRoot,
      }),
    ).toThrow(/history entry v1 is immutable/i);

    const driftedManifest = structuredClone(manifest);
    driftedManifest.prompt.shared = `${driftedManifest.prompt.shared} drift`;

    expect(() =>
      validateCardArtSystem({
        baselineHistory: undefined,
        history,
        manifest: driftedManifest,
        repositoryRoot,
      }),
    ).toThrow(/append a reviewed style version/i);
  });

  it("versions approved prompt inputs while allowing draft-only dependencies", () => {
    const approvedPromptDrift = structuredClone(manifest);
    const approvedCard = approvedPromptDrift.cards.find(
      (card) => card.id === "the-lovers",
    );
    approvedCard.gesture = `${approvedCard.gesture} Changed after approval.`;
    approvedCard.promptSha256 = getCardArtLocks(
      approvedPromptDrift,
      repositoryRoot,
    ).promptSha256[approvedCard.id];

    expect(() =>
      validateCardArtSystem({
        baselineHistory: history,
        history,
        manifest: approvedPromptDrift,
        repositoryRoot,
      }),
    ).toThrow(/append a reviewed style version/i);

    const approvedDependencyDrift = structuredClone(manifest);
    approvedDependencyDrift.cast.find(
      (member) => member.id === "young-traveler",
    ).description += " Changed after approval.";
    const dependencyLocks = getCardArtLocks(
      approvedDependencyDrift,
      repositoryRoot,
    );
    approvedDependencyDrift.cards.forEach((card) => {
      card.promptSha256 = dependencyLocks.promptSha256[card.id];
    });

    expect(() =>
      validateCardArtSystem({
        baselineHistory: history,
        history,
        manifest: approvedDependencyDrift,
        repositoryRoot,
      }),
    ).toThrow(/append a reviewed style version/i);

    const draftManifest = structuredClone(manifest);
    draftManifest.cast.push({
      id: "draft-reader",
      description: "A draft-only recurring reader.",
    });
    draftManifest.locations.push({
      id: "draft-room",
      description: "A draft-only reading room.",
    });
    draftManifest.cards.push({
      id: "draft-card",
      name: "Draft Card",
      status: "draft",
      assetPath: "public/cards/draft-card.jpg",
      castIds: ["draft-reader"],
      locationId: "draft-room",
      gesture: "The reader opens a notebook.",
      dominantSymbol: "an open notebook",
      supportingSymbols: ["a pencil"],
      emotionalMovement: "Curiosity becoming a concrete observation.",
      referenceCardIds: ["the-fool"],
      promptSha256: "",
    });
    const draftLocks = getCardArtLocks(draftManifest, repositoryRoot);
    draftManifest.cards.at(-1).promptSha256 =
      draftLocks.promptSha256["draft-card"];

    expect(draftLocks.styleFingerprintSha256).toBe(
      getCardArtLocks(manifest, repositoryRoot).styleFingerprintSha256,
    );
    expect(() =>
      validateCardArtSystem({
        baselineHistory: history,
        history,
        manifest: draftManifest,
        repositoryRoot,
      }),
    ).not.toThrow();
  });

  it("fails closed when committed baseline history is malformed", () => {
    const temporaryRepository = mkdtempSync(
      resolve(tmpdir(), "tarot-spark-art-history-"),
    );

    try {
      execFileSync("git", ["init", "--quiet"], { cwd: temporaryRepository });
      mkdirSync(resolve(temporaryRepository, "art"));
      writeFileSync(
        resolve(temporaryRepository, "art/card-art-style-history.json"),
        "{not-json",
      );
      execFileSync("git", ["add", "."], { cwd: temporaryRepository });
      execFileSync(
        "git",
        [
          "-c",
          "user.name=Tarot Spark Test",
          "-c",
          "user.email=tarot-spark@example.invalid",
          "commit",
          "--quiet",
          "-m",
          "malformed baseline",
        ],
        { cwd: temporaryRepository },
      );

      expect(() => loadBaselineHistory(temporaryRepository, "HEAD")).toThrow(
        /not valid JSON/i,
      );
    } finally {
      rmSync(temporaryRepository, { force: true, recursive: true });
    }
  });
});
