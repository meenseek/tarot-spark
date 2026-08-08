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
  getCardArtV3AttemptAuditRecord,
  getCardArtV3CardSpecSha256,
  getCardArtV3ManifestSha256,
  getCardArtV3PostPilotReferenceRoute,
  getCardArtV3PromptAuditRecord,
  getCardArtV3PromptRecord,
  getCardArtV3ReviewedAttemptAuditRecord,
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
import { renderWands10LocalRepair } from "./card-art-v3-wands10-repair.mjs";
import { renderDevilLocalRepair } from "./card-art-v3-thedevil-repair.mjs";
import { assertCupsPageRepairAuthorizationEnvelope } from "./card-art-v3-cupspage-repair.mjs";
import {
  getCardArtV3BatchContactSheetRecipe,
  renderCardArtV3BatchContactSheet,
} from "./card-art-v3-batch-contact-sheet.mjs";

const repositoryRoot = resolve(import.meta.dirname, "..");
const temporaryDirectories = [];
const temporaryFiles = [];
const temporaryFileRestorations = [];

function asPlanningSnapshot(files) {
  files.manifest.releaseState = "planning";
  files.releaseHistory.entries = [];
  return files;
}

function loadAuditCardArtV3Files() {
  return asPlanningSnapshot(
    structuredClone(loadCardArtV3Files(repositoryRoot)),
  );
}

function stableStringifyForTest(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringifyForTest).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) => `${JSON.stringify(key)}:${stableStringifyForTest(value[key])}`,
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256StableForTest(value) {
  return createHash("sha256")
    .update(stableStringifyForTest(value))
    .digest("hex");
}

function supersessionDecisionPayload(entry) {
  return {
    independentReviews: entry.independentReviews,
    reason: entry.reason,
    replacementContract: entry.replacementContract,
    result: entry.result,
    reviewEvidence: {
      assetMapSha256: entry.reviewEvidence.assetMapSha256,
      blocker: entry.reviewEvidence.blocker,
      cardIds: entry.reviewEvidence.cardIds,
      attemptIds: entry.reviewEvidence.attemptIds,
      full: entry.reviewEvidence.full,
      mobile: entry.reviewEvidence.mobile,
      recipeFingerprintSha256: entry.reviewEvidence.recipeFingerprintSha256,
    },
    status: entry.status,
    supersededAt: entry.supersededAt,
  };
}

function batchReviewGateDecisionPayload(entry) {
  return {
    batchId: entry.batchId,
    independentReviews: entry.independentReviews,
    result: entry.result,
    reviewEvidence: {
      assetMapSha256: entry.reviewEvidence.assetMapSha256,
      cardIds: entry.reviewEvidence.cardIds,
      attemptIds: entry.reviewEvidence.attemptIds,
      full: entry.reviewEvidence.full,
      mobile: entry.reviewEvidence.mobile,
      recipeFingerprintSha256: entry.reviewEvidence.recipeFingerprintSha256,
    },
    status: entry.status,
    reviewedAt: entry.reviewedAt,
  };
}

function getMajorNewAAtomicFixture() {
  const gateId = "major-new-a-review-001";
  const reviewedAt = "2026-08-07T07:30:30.000Z";
  const qa = {
    anatomy: true,
    cardMeaning: true,
    countAccuracy: true,
    deckHarmony: true,
    fullSize: true,
    noUnintendedText: true,
    styleContinuity: true,
    thumbnail: true,
  };
  const cards = [
    {
      assetSha256:
        "89ae87e60330d3041f62ccbf80423cf68d8527de99de9ec7adfeb1f3e4c114ce",
      cardId: "the-hierophant",
      generationRecordId: "the-hierophant-attempt-001",
      promptSha256:
        "c4dc04e6331a9f89b06851afeadb2f7653d4f072bd45cf22a324c576c1991848",
    },
    {
      assetSha256:
        "eea0f4d174f9c17b78e8f67cf7036bd317d210dbfaeb4fa71a81fe200e105c95",
      cardId: "justice",
      generationRecordId: "justice-attempt-001",
      promptSha256:
        "49a2bf31ec1f13e6181a001ccb0ab9d3a7eb4b623477ec36266f72abf75171c4",
    },
    {
      assetSha256:
        "547a33645cd27e37f687475137ac65eff51b4e7e0e026c388e06f5601f8c09bd",
      cardId: "the-hanged-man",
      generationRecordId: "the-hanged-man-attempt-001",
      promptSha256:
        "925cc4a68e63144cfca7bf9b411c0c81448cdf9612558def5fb2f3c83f5643b1",
    },
    {
      assetSha256:
        "49c413fbe365bd44fc5df9407301aa28eb009df3a44c73780f6aab24ad2ceaf9",
      cardId: "death",
      generationRecordId: "death-attempt-003",
      promptSha256:
        "de2fdbbe26ec82e51c3025668d384aa600c1aaba763911820e389d50587844a7",
    },
    {
      assetSha256:
        "06884366f083f0458426b629cda08446405d293d22148900425b64cb31431fc8",
      cardId: "the-devil",
      generationRecordId: "the-devil-attempt-014",
      promptSha256:
        "300c4c2bef106e2991b44fb7e042db396a7d68716eac53676564a3bb44ae1f74",
    },
  ];
  const attemptIds = cards.map(({ generationRecordId }) => generationRecordId);
  const cardIds = cards.map(({ cardId }) => cardId);
  const assetSha256 = Object.fromEntries(
    cards.map((card) => [card.cardId, card.assetSha256]),
  );
  return {
    approvals: Object.fromEntries(
      cards.map((card) => [
        card.cardId,
        {
          assetSha256: card.assetSha256,
          batchReviewGateBoundAt: reviewedAt,
          batchReviewGateId: gateId,
          generationRecordId: card.generationRecordId,
          promotedSuitAnchor: false,
          promptSha256: card.promptSha256,
          provenance: "generated-v3",
          qa: { ...qa },
          reviewedAt,
          reviewer:
            "Planck, Harvey and Halley (independent five-card Major Arcana meaning, exact-count, full/mobile UX, anatomy, text, provenance and fail-closed atomic batch review)",
          status: "approved",
        },
      ]),
    ),
    gate: {
      id: gateId,
      batchId: "major-new-a",
      status: "passed",
      result: "approved",
      reviewedAt: "2026-08-07T07:30:15.000Z",
      reviewEvidence: {
        cardIds,
        attemptIds,
        assetSha256,
        assetMapSha256:
          "91630b27bb995966ee3c6d6019ea92b5a5dee7b9e7229987763a278de6930543",
        recipe: getCardArtV3BatchContactSheetRecipe(5),
        recipeFingerprintSha256:
          "d6ddee0961f4ff2ad522b03ba78fa0a2efa5cc2a315ec285dbbd121a0aad1ab6",
        full: {
          path: "art/card-art-v3-reviews/major-new-a-contact-sheet-v3.jpg",
          sha256:
            "f6dfc3d7bbf97538e1ce5ebff2b0ae4c4045e6ba603a36edca4a2e8ea582dbd9",
          bytes: 207024,
          width: 896,
          height: 828,
        },
        mobile: {
          path: "art/card-art-v3-reviews/major-new-a-contact-sheet-mobile-v3.jpg",
          sha256:
            "5f8b4da43a3f28ba5f37ac9270ca0fe677bbb8f791ba26a64c246873b32976b5",
          bytes: 65701,
          width: 456,
          height: 420,
        },
      },
      independentReviews: [
        {
          reviewerId: "tarot-content-review",
          reviewer: "Planck",
          scope:
            "five-card Major Arcana identity, exact counts, safe difficult-card meaning, recurring-cast/full-mobile distinction and forbidden text/animal/symbol closure",
          independent: true,
          result: "approved",
          reviewedAt: "2026-08-07T07:18:30.000Z",
        },
        {
          reviewerId: "ux-test-review",
          reviewer: "Harvey",
          scope:
            "full-size and 140×196 mobile distinction, focal hierarchy, human and horse anatomy, crop, color and contrast, text contamination, composite seams and five-card style continuity",
          independent: true,
          result: "approved",
          reviewedAt: "2026-08-07T07:17:00.000Z",
        },
        {
          reviewerId: "final-plan-review",
          reviewer: "Halley",
          scope:
            "deterministic provenance, exact-five active-selection audit and fail-closed atomic batch transition",
          independent: true,
          result: "approved",
          reviewedAt: "2026-08-07T07:30:00.000Z",
        },
      ],
      decisionFingerprintSha256:
        "f103a0d358547ce35a030a418c517ac4670132479cea1c25d5fa831b6ca46898",
    },
  };
}

const majorNewBCardIds = Object.freeze([
  "the-tower",
  "the-moon",
  "the-sun",
  "judgement",
  "the-world",
]);

function getMajorNewBAtomicFixture() {
  const committed = loadCardArtV3Files(repositoryRoot);
  const gate = committed.batchReviewGates.entries.find(
    ({ id }) => id === "major-new-b-review-001",
  );
  return {
    approvals: Object.fromEntries(
      majorNewBCardIds.map((cardId) => [
        cardId,
        structuredClone(committed.approvals.records[cardId]),
      ]),
    ),
    gate: structuredClone(gate),
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryFiles.splice(0).map((path) => rm(path, { force: true })),
  );
  for (const { contents, path } of temporaryFileRestorations.splice(0)) {
    if (contents === null) {
      await rm(path, { force: true });
    } else {
      await writeFile(path, contents);
    }
  }
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { force: true, recursive: true })),
  );
});

describe("card art v3 preflight", { timeout: 30_000 }, () => {
  it("validates the canonical released 78-card system", () => {
    const files = loadCardArtV3Files(repositoryRoot);

    expect(validateCardArtV3System(files, repositoryRoot)).toEqual({
      approvedCount: 78,
      cardCount: 78,
      generationCount: files.generationRecords.records.length,
      releaseCount: 1,
    });
  }, 30_000);

  it("builds a deterministic retouch prompt from the reviewed manifest and frozen source", () => {
    const files = loadAuditCardArtV3Files();
    const first = getCardArtV3PromptAuditRecord(
      files,
      "the-hermit",
      repositoryRoot,
    );
    const second = getCardArtV3PromptAuditRecord(
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

  it("routes numbered and court generation through distinct frozen two-anchor roles", () => {
    const files = loadAuditCardArtV3Files();
    const numberedRoute = getCardArtV3PostPilotReferenceRoute(
      files.styleHistory,
      files.manifest.cards["wands-2"],
    );
    const numberedPrompt = buildCardArtV3Prompt(
      files.manifest,
      "wands-2",
      numberedRoute,
    );
    const court = getCardArtV3PromptAuditRecord(
      files,
      "swords-page",
      repositoryRoot,
    );

    expect(numberedRoute).toMatchObject({
      anchorIds: ["wands-ace", "wands-5"],
      kind: "numbered",
      styleVersion: "pilot-style-v1",
    });
    expect(numberedPrompt).toContain(
      "Never copy its source count, rank, cast, identity, pose, action, movement, setting, lighting layout or composition",
    );
    expect(numberedPrompt).toContain(
      "Never copy its source count, count arrangement, grid, table, group composition",
    );
    expect(numberedPrompt).toContain(
      "show exactly 2 wands suit objects; zero more and zero fewer",
    );

    expect(court.referenceRoute).toMatchObject({
      anchorIds: ["swords-ace", "swords-queen"],
      kind: "court",
      styleVersion: "pilot-style-v1",
    });
    expect(court.referenced_image_paths).toEqual([
      resolve(repositoryRoot, "public/cards/v3/swords-ace.jpg"),
      resolve(repositoryRoot, "public/cards/v3/swords-queen.jpg"),
    ]);
    expect(court.prompt).toContain(
      "Never copy the source rank, action, pose, movement, setting, garment or garment color",
    );
    expect(court.prompt).toContain(
      "The target card's rank rule exclusively controls rank identity and action",
    );
    expect(court.prompt).toContain(
      "identity means stable face, hair, skin and body traits only",
    );
  });

  it("versions the Four of Wands canonical occlusion amendment without rewriting attempts 1-7", () => {
    const files = loadAuditCardArtV3Files();
    const route = getCardArtV3PostPilotReferenceRoute(
      files.styleHistory,
      files.manifest.cards["wands-4"],
    );
    const current = buildCardArtV3Prompt(files.manifest, "wands-4", route);
    const historical = buildCardArtV3Prompt(
      files.manifest,
      "wands-4",
      route,
      "wands-4-v1",
    );

    expect(current).toContain("lower endpoint need not be visible");
    expect(current).toContain("four distinct support posts");
    expect(historical).toContain(
      "continuous shafts and ground contacts at 140×196",
    );
    expect(createHash("sha256").update(historical).digest("hex")).toBe(
      "c95a976c0d960d2455c4d5f755bb18c440b453c228eeb0dc53bad9ba1660fd48",
    );
    expect(createHash("sha256").update(current).digest("hex")).toBe(
      "a5e1803d699101996d93d1e8ac7c15bf2ec5a8bfeb987c2f679845e02447088a",
    );
  });

  it("locks Major replacement counts and separates identity from rendering references", () => {
    const files = loadAuditCardArtV3Files();
    const expectations = {
      "the-magician": [
        "Exactly four suit objects total",
        "Reference 1 (The Lovers) controls only the matching recurring figure",
        "Reference 2 (Wheel of Fortune) controls only ink-and-gouache rendering",
      ],
      "the-high-priestess": [
        "exactly two full columns",
        "one featureless closed book",
        "Reference 1 (The Hermit) controls only the matching recurring figure",
      ],
      "the-empress": [
        "exactly twelve and only twelve",
        "exactly two smaller arriving neighbors",
        "Reference 2 (Strength) controls only ink-and-gouache rendering",
      ],
      "the-emperor": [
        "exactly one plain blank unmarked rectangular civic charter",
        "exactly one compact staff of office",
        "Reference 2 (Wheel of Fortune) controls only ink-and-gouache rendering",
      ],
      "the-star": [
        "exactly eight stars total",
        "exactly two vessels total",
        "Reference 2 (The Hermit) controls only the matching recurring figure",
      ],
    };

    for (const [cardId, fragments] of Object.entries(expectations)) {
      const record = getCardArtV3PromptAuditRecord(
        files,
        cardId,
        repositoryRoot,
      );
      for (const fragment of fragments) {
        expect(record.prompt).toContain(fragment);
      }
      expect(record.prompt).not.toContain(
        "Use the supplied approved anchors only for palette",
      );
      expect(record.editSource).toBeUndefined();
    }
  }, 30_000);

  it("locks the first new Major batch before any image generation", () => {
    const files = loadAuditCardArtV3Files();
    const expectations = {
      "the-hierophant": {
        promptSha256:
          "c4dc04e6331a9f89b06851afeadb2f7653d4f072bd45cf22a324c576c1991848",
        referenceIds: ["the-hermit", "the-lovers"],
        fragments: [
          "exactly three people total",
          "exactly two large full crossed keys",
          "exactly one shared open book",
        ],
      },
      justice: {
        promptSha256:
          "49a2bf31ec1f13e6181a001ccb0ab9d3a7eb4b623477ec36266f72abf75171c4",
        referenceIds: ["the-lovers", "wheel-of-fortune"],
        fragments: [
          "exactly one seated adjudicator",
          "exactly two equal empty pans",
          "exactly one straight upright sword",
        ],
      },
      "the-hanged-man": {
        promptSha256:
          "925cc4a68e63144cfca7bf9b411c0c81448cdf9612558def5fb2f3c83f5643b1",
        referenceIds: ["the-fool", "strength"],
        fragments: [
          "exactly one medium-size full-body adult",
          "Exactly one ankle is comfortably supported inside one broad soft woven-cloth aerial sling",
          "visibly stable and recreational",
        ],
      },
      death: {
        promptSha256:
          "de2fdbbe26ec82e51c3025668d384aa600c1aaba763911820e389d50587844a7",
        referenceIds: ["the-chariot", "the-hermit"],
        fragments: [
          "exactly one living armored human rider",
          "exactly one plain white rose",
          "exactly two distant pillars",
        ],
      },
      "the-devil": {
        promptSha256:
          "300c4c2bef106e2991b44fb7e042db396a7d68716eac53676564a3bb44ae1f74",
        referenceIds: ["the-lovers", "strength"],
        fragments: [
          "exactly two living clothed adults",
          "exactly one inanimate horned stone statue",
          "exactly two bright thick loose cords total",
        ],
      },
    };

    for (const [cardId, expectation] of Object.entries(expectations)) {
      const record = getCardArtV3PromptAuditRecord(
        files,
        cardId,
        repositoryRoot,
      );
      expect(record.promptSha256).toBe(expectation.promptSha256);
      expect(Object.keys(record.referenceSha256)).toEqual(
        expectation.referenceIds,
      );
      for (const fragment of expectation.fragments) {
        expect(record.prompt).toContain(fragment);
      }
      expect(record.prompt).not.toContain(
        "Use the supplied approved anchors only for palette",
      );
      expect(record.editSource).toBeUndefined();
    }
  }, 30_000);

  it("locks the second new Major batch before any image generation", () => {
    const files = loadAuditCardArtV3Files();
    const expectations = {
      "the-tower": {
        promptSha256:
          "97b69edcce24fa9ce65c2174388a9614269e6caf540cbac1ee81a7bcf4159eda",
        referenceIds: ["wheel-of-fortune", "the-hermit"],
        fragments: [
          "medium-wide oblique view",
          "exactly one tall stone watchtower",
          "exactly one branching lightning strike",
          "exactly three fully clothed living adults",
        ],
      },
      "the-moon": {
        promptSha256:
          "24721a890d89cd2937fb70bbb7caa9e595c2c6e82a39e147fad9a5a035d6d469",
        referenceIds: ["the-fool", "the-hermit"],
        fragments: [
          "exactly one fully clothed young traveler",
          "exactly two full boundary towers",
          "exactly one calm domestic dog",
          "exactly one alert wild wolf",
          "opposite lower foreground thirds",
        ],
      },
      "the-sun": {
        promptSha256:
          "e8e5e70b06f31c80316fd2545b84e1459be9e7cfb97e759d2ab9c43a4937b14a",
        referenceIds: ["strength", "the-lovers"],
        fragments: [
          "exactly two fully clothed children",
          "exactly one fully clothed adult",
          "exactly one immense clear sun disk total",
          "side-by-side without body overlap",
        ],
      },
      judgement: {
        promptSha256:
          "1b833cef42c0680de74c3290530664f8cd1633f56ee2efc0e87da76767270e69",
        referenceIds: ["the-lovers", "wheel-of-fortune"],
        fragments: [
          "medium-wide eye-level view",
          "exactly four fully clothed living adults",
          "exactly one large high bronze bell",
          "exactly two plain open wooden record boxes",
        ],
      },
      "the-world": {
        promptSha256:
          "fd3806b09a4598a899b6648114ffc9d4048221a1954b142bda1e6adb6d461d1b",
        referenceIds: ["the-lovers", "strength"],
        fragments: [
          "exactly one fully clothed adult gardener",
          "exactly one complete closed oval living wreath",
          "exactly four and only four bold high-contrast stone head bas-reliefs",
          "8–12 percent of frame height",
        ],
      },
    };

    for (const [cardId, expectation] of Object.entries(expectations)) {
      const record = getCardArtV3PromptAuditRecord(
        files,
        cardId,
        repositoryRoot,
      );
      expect(record.promptSha256).toBe(expectation.promptSha256);
      expect(Object.keys(record.referenceSha256)).toEqual(
        expectation.referenceIds,
      );
      for (const fragment of expectation.fragments) {
        expect(record.prompt).toContain(fragment);
      }
      expect(record.prompt).not.toContain(
        "Use the supplied approved anchors only for palette",
      );
      expect(record.editSource).toBeUndefined();
    }
  }, 60_000);

  it("locks Wands A counts, references and non-identity reference control before generation", () => {
    const files = loadAuditCardArtV3Files();
    const expectations = {
      "wands-2": {
        promptSha256:
          "f1e3ebe056ac8d20f99b88193dfcea854377b49f2d38ccb2a58f93da72be634f",
        fragments: [
          "exactly two and only two straight bark-textured wooden staffs total",
          "one low plain open-front stone holder that does not cover its lower tip",
          "exactly one folded route cloth",
        ],
      },
      "wands-3": {
        promptSha256:
          "5bb46e4f575e33579665831c88e7924b092ad0d2012803eb27fed2abd18d3b51",
        fragments: [
          "exactly three fully clothed people total",
          "exactly one calm pack mule",
          "exactly three and only three straight bark-textured wooden staffs total",
        ],
      },
      "wands-4": {
        promptSha256:
          "a5e1803d699101996d93d1e8ac7c15bf2ec5a8bfeb987c2f679845e02447088a",
        fragments: [
          "exactly four fully clothed adults total",
          "four distinct support posts",
          "lower endpoint need not be visible",
          "never as a wooden crossbar",
        ],
      },
      "wands-6": {
        promptSha256:
          "19c9148819911384e19b11cfa19a885c47babf47bab562a5616cfe448112e345",
        fragments: [
          "exactly six fully clothed people total",
          "exactly five walking companions and no other person",
          "exactly six and only six staffs total",
        ],
      },
      "wands-7": {
        promptSha256:
          "03cab8d5ac389ae20de356258341d8941d2568b5c3d7e5ad245ba34945e75360",
        fragments: [
          "exactly seven fully clothed adults total",
          "Exactly six adults remain on the lower terrace",
          "exactly seven and only seven staffs total",
        ],
      },
    };
    const expectedReferenceSha256 = {
      "wands-ace":
        "06ec809794cf36619af12a1a785dba5c7ae66cc179a0418d73fd5b468f66efcc",
      "wands-5":
        "7700a9f1efaf218e3ed79c2ccc4cc1ed5a6d3436770291b8af390b35ea1150a9",
    };
    const expectedReferencePaths = [
      resolve(repositoryRoot, "public/cards/v3/wands-ace.jpg"),
      resolve(repositoryRoot, "public/cards/v3/wands-5.jpg"),
    ];

    for (const [cardId, expectation] of Object.entries(expectations)) {
      const record = getCardArtV3PromptAuditRecord(
        files,
        cardId,
        repositoryRoot,
      );
      expect(record.promptSha256).toBe(expectation.promptSha256);
      expect(record.referenceRoute).toMatchObject({
        anchorIds: ["wands-ace", "wands-5"],
        kind: "numbered",
        styleVersion: "pilot-style-v1",
      });
      expect(record.referenceSha256).toEqual(expectedReferenceSha256);
      expect(record.referenced_image_paths).toEqual(expectedReferencePaths);
      expect(record.prompt).toContain("Reviewed card lock:");
      expect(record.prompt).toContain(
        "Use neither anchor for cast or recurring-character identity",
      );
      for (const fragment of expectation.fragments) {
        expect(record.prompt).toContain(fragment);
      }
      expect(record.prompt).not.toContain(
        "Use the supplied approved anchors only for palette",
      );
      expect(record.prompt).not.toContain(
        "recurring character identity and world continuity",
      );
      if (cardId === "wands-2") {
        expect(record.prompt).not.toContain("distant route");
        expect(record.prompt).not.toContain("stone socket");
      }
      expect(record.editSource).toBeUndefined();
    }

    const historicalPromptSha256 = {
      "wands-page":
        "bb99bc14d5e9ee318eb9dfd873bb8306bc058c67c40c2e3277b9339cdd206767",
      "cups-knight":
        "b85847b57df96e21bf5ff14bf6a72db717dd1ad662ba6d77cf7eb5934b275d86",
      "swords-queen":
        "19121d5169b399a20e13da4232c7d09d995ea7ff503e9a76f91033652b213197",
      "pentacles-king":
        "87d9eb24b0d65f0b67feb3f7b6f46f172159dcac70e461bff02fa532e9ba5aad",
    };
    for (const [cardId, promptSha256] of Object.entries(
      historicalPromptSha256,
    )) {
      expect(
        getCardArtV3PromptAuditRecord(files, cardId, repositoryRoot)
          .promptSha256,
      ).toBe(promptSha256);
    }
  }, 60_000);

  it("fails closed without a reviewed style route instead of falling back to planned anchors", () => {
    const files = loadCardArtV3Files(repositoryRoot);
    const route = getCardArtV3PostPilotReferenceRoute(
      { entries: [] },
      files.manifest.cards["wands-2"],
    );

    expect(route).toBeNull();
  });

  it("rejects route, fingerprint, contact-sheet and pilot asset-map drift", () => {
    const mutations = [
      (files) => {
        files.styleHistory.entries[0].referenceRouting.numbered.pairs.wands = [
          "wands-ace",
          "wands-10",
        ];
      },
      (files) => {
        files.styleHistory.entries[0].referenceRouting.commonInstruction +=
          " drift";
      },
      (files) => {
        files.styleHistory.entries[0].styleFingerprintSha256 = "0".repeat(64);
      },
      (files) => {
        files.styleHistory.entries[0].pilotContactSheet.full.artifactSha256 =
          "0".repeat(64);
      },
      (files) => {
        files.styleHistory.entries[0].pilotContactSheet.assetMapSha256 =
          "0".repeat(64);
      },
      (files) => {
        const cardPath = "public/cards/v3/wands-ace.jpg";
        const cardSha256 = files.approvals.records["wands-ace"].assetSha256;
        files.styleHistory.entries[0].pilotContactSheet.full = {
          artifactPath: cardPath,
          artifactSha256: cardSha256,
        };
        files.styleHistory.entries[0].pilotContactSheet.mobile = {
          artifactPath: cardPath,
          artifactSha256: cardSha256,
        };
      },
    ];

    for (const mutate of mutations) {
      const files = structuredClone(loadCardArtV3Files(repositoryRoot));
      mutate(files);
      expect(() =>
        validateCardArtV3System(files, repositoryRoot, null),
      ).toThrow(/validation failed/i);
    }
  });

  it("rejects a style freeze when any of the sixteen pilots lacks approval", () => {
    const files = structuredClone(loadCardArtV3Files(repositoryRoot));
    delete files.approvals.records["wands-10"];

    expect(() => validateCardArtV3System(files, repositoryRoot, null)).toThrow(
      /requires an approved selected asset for wands-10/i,
    );
  });

  it("uses the latest style only for new prompts while preserving historical route hashes", () => {
    const files = loadAuditCardArtV3Files();
    const v1Prompt = getCardArtV3PromptAuditRecord(
      files,
      "wands-knight",
      repositoryRoot,
    );
    const v2 = structuredClone(files.styleHistory.entries[0]);
    v2.version = "pilot-style-v2";
    v2.reviewedAt = "2026-08-05T08:51:39.000Z";
    files.styleHistory.entries.push(v2);

    expect(() =>
      validateCardArtV3System(files, repositoryRoot, null),
    ).not.toThrow();
    const latestPrompt = getCardArtV3PromptAuditRecord(
      files,
      "wands-knight",
      repositoryRoot,
    );
    const historicalRoute = getCardArtV3PostPilotReferenceRoute(
      files.styleHistory,
      files.manifest.cards["wands-knight"],
      "pilot-style-v1",
    );

    expect(latestPrompt.referenceRoute.styleVersion).toBe("pilot-style-v2");
    expect(historicalRoute.styleVersion).toBe("pilot-style-v1");
    expect(
      getCardArtV3CardSpecSha256(
        files.manifest,
        "wands-knight",
        historicalRoute,
      ),
    ).toBe(v1Prompt.cardSpecSha256);
    expect(
      buildCardArtV3Prompt(files.manifest, "wands-knight", historicalRoute),
    ).toBe(v1Prompt.prompt);
  });

  it("binds a retry-only observable constraint to the exact effective prompt", () => {
    const files = loadAuditCardArtV3Files();
    const base = getCardArtV3AttemptAuditRecord(files, "wands-10");
    const retryConstraint =
      "Keep the store yard distant and closed; show no additional pole-like object anywhere outside the ten carried staffs.";
    const retry = getCardArtV3AttemptAuditRecord(
      files,
      "wands-10",
      retryConstraint,
    );

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

  it("refuses to reprint a reviewed retry after the attempt is recorded", () => {
    const artifactPath =
      "art/card-art-v3-retry-constraints/cups-page-attempt-003.json";
    const auditRecord = getCardArtV3ReviewedAttemptAuditRecord(
      loadAuditCardArtV3Files(),
      "cups-page",
      artifactPath,
      repositoryRoot,
    );
    expect(auditRecord.auditOnly).toBe(true);
    expect(auditRecord.effectivePrompt).toContain(
      "Change only the Page character's hair pigment",
    );
    expect(auditRecord.retryReview).toMatchObject({
      artifactPath,
      result: "approved",
      reviewer:
        "Planck (independent tarot meaning and recurring-cast correction review)",
    });
    expect(() =>
      execFileSync(
        process.execPath,
        [
          "--import=tsx",
          "scripts/card-art-v3.mjs",
          "--card",
          "cups-page",
          "--retry-constraint-file",
          artifactPath,
          "--json",
        ],
        { cwd: repositoryRoot, encoding: "utf8" },
      ),
    ).toThrow(/already recorded/i);
  });

  it("binds a precision edit to one immutable rejected source and the exact short edit prompt", () => {
    const files = loadAuditCardArtV3Files();
    const artifactPath =
      "art/card-art-v3-retry-constraints/wands-10-attempt-007.json";
    const record = getCardArtV3ReviewedAttemptAuditRecord(
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
    const files = loadAuditCardArtV3Files();
    const record = getCardArtV3ReviewedAttemptAuditRecord(
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
    const files = loadAuditCardArtV3Files();
    const record = getCardArtV3ReviewedAttemptAuditRecord(
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

  it("binds the fresh Wheel geometry control before the approved Fool style reference", () => {
    const files = loadAuditCardArtV3Files();
    const record = getCardArtV3ReviewedAttemptAuditRecord(
      files,
      "wheel-of-fortune",
      "art/card-art-v3-retry-constraints/wheel-of-fortune-attempt-004.json",
      repositoryRoot,
    );

    expect(record.editSource).toBeNull();
    expect(record.controlReference).toEqual({
      id: "wheel-of-fortune-four-way-junction-v1",
      path: "art/card-art-v3-controls/wheel-of-fortune-four-way-junction-v1.png",
      sha256:
        "0854404db7824dfb62697d332716ab21eb1163d50f34c21a8bbc4ebde3a725ee",
    });
    expect(record.styleReference).toEqual({
      id: "the-fool",
      path: "public/cards/v3/the-fool.jpg",
      sha256:
        "d9bf98f82fbd212b1f663590c35482e6d927ac1f7e42f98c717e82c393fa44ef",
    });
    expect(record.referenced_image_paths).toEqual([
      resolve(repositoryRoot, record.controlReference.path),
      resolve(repositoryRoot, record.styleReference.path),
    ]);
    expect(record.referenceSha256).toEqual({
      "wheel-of-fortune-four-way-junction-v1": record.controlReference.sha256,
      "the-fool": record.styleReference.sha256,
    });
    expect(record.effectivePrompt).not.toBe(
      buildCardArtV3AttemptPrompt(record.prompt, record.retryConstraint),
    );
    expect(record.effectivePrompt).not.toContain(
      "Use the supplied approved anchors only for palette",
    );
    expect(record.effectivePrompt).toContain(
      "Reference image 1 is authoritative only for the reviewed geometry count, connectivity and topology",
    );
    expect(record.effectivePrompt).toContain(
      "Reference image 2 is authoritative only for Quiet Celestial Storybook rendering",
    );
    expect(record.effectivePrompt.match(/Reference image 1/g)).toHaveLength(1);
    expect(record.effectivePrompt.match(/Reference image 2/g)).toHaveLength(1);
    expect(record.effectivePrompt).toContain(
      "First image is a geometry control only",
    );
  }, 15_000);

  it("uses one non-conflicting geometry/style authority for reviewed Wands controls", () => {
    const files = loadAuditCardArtV3Files();
    const cases = [
      [
        "wands-4",
        "wands-4-four-clear-staff-lanes-v1",
        "art/card-art-v3-retry-constraints/wands-4-attempt-005.json",
      ],
      [
        "wands-7",
        "wands-7-six-isolated-slots-v1",
        "art/card-art-v3-retry-constraints/wands-7-attempt-005.json",
      ],
    ];

    for (const [cardId, controlId, artifactPath] of cases) {
      const record = getCardArtV3ReviewedAttemptAuditRecord(
        files,
        cardId,
        artifactPath,
        repositoryRoot,
      );

      expect(record.controlReference?.id).toBe(controlId);
      expect(record.styleReference?.id).toBe("wands-5");
      expect(record.effectivePrompt).not.toContain(
        "Post-pilot reference role lock:",
      );
      expect(record.effectivePrompt).not.toContain(
        "recurring character identity",
      );
      expect(record.effectivePrompt).toContain(
        "Reference image 1 is authoritative only for the reviewed geometry count, connectivity, contact and topology",
      );
      expect(record.effectivePrompt).toContain(
        "Reference image 2 is authoritative only for Quiet Celestial Storybook rendering, natural body proportion, Wands bark material and the target palette",
      );
      expect(record.effectivePrompt).toContain(
        "Never copy its identity, cast, count, action, scene, composition or incidental objects.",
      );
      expect(record.effectivePrompt.match(/Reference image 1/g)).toHaveLength(
        1,
      );
      expect(record.effectivePrompt.match(/Reference image 2/g)).toHaveLength(
        1,
      );
    }
  }, 20_000);

  it("binds the fresh Devil cord control before the approved Lovers style reference", () => {
    const files = loadCardArtV3Files(repositoryRoot);
    const record = getCardArtV3ReviewedAttemptAuditRecord(
      files,
      "the-devil",
      "art/card-art-v3-retry-constraints/the-devil-attempt-004.json",
      repositoryRoot,
    );

    expect(record.editSource).toBeNull();
    expect(record.controlReference).toEqual({
      id: "the-devil-two-continuous-cords-v1",
      path: "art/card-art-v3-controls/the-devil-two-continuous-cords-v1.png",
      sha256:
        "c4684c15884c6665edbf9dd94bfdc8ff5d3d8ffc0bca547ce31b090e2849df4a",
    });
    expect(record.styleReference).toEqual({
      id: "the-lovers",
      path: "public/cards/v3/the-lovers.jpg",
      sha256:
        "a7d13cc70299827e4972d67aeb57d768d441a709e468ff5f0a2703a57618e488",
    });
    expect(record.referenced_image_paths).toEqual([
      resolve(repositoryRoot, record.controlReference.path),
      resolve(repositoryRoot, record.styleReference.path),
    ]);
    expect(record.referenceSha256).toEqual({
      "the-devil-two-continuous-cords-v1": record.controlReference.sha256,
      "the-lovers": record.styleReference.sha256,
    });
    expect(record.effectivePromptSha256).toBe(
      "b0486dd8a8daf7f94e859d9bcef99b085dd8450c9f3ad38132ea168a431a611a",
    );
    expect(record.effectivePrompt).toContain(
      "Reference image 1 is authoritative only for the reviewed geometry count, connectivity and topology",
    );
    expect(record.effectivePrompt).toContain(
      "Reference image 2 is authoritative only for Quiet Celestial Storybook rendering",
    );
    expect(record.retryConstraint).toContain("exactly two loose cords");
  }, 15_000);

  it("rejects style-reference metadata outside an exact reviewed retry", () => {
    const files = loadCardArtV3Files(repositoryRoot);
    const forgedFirstAttempt = structuredClone(files);
    forgedFirstAttempt.generationRecords.records.find(
      ({ id }) => id === "wheel-of-fortune-attempt-001",
    ).styleReference = {
      id: "the-fool",
      path: "public/cards/v3/the-fool.jpg",
      sha256:
        "d9bf98f82fbd212b1f663590c35482e6d927ac1f7e42f98c717e82c393fa44ef",
    };
    expect(() =>
      validateCardArtV3System(forgedFirstAttempt, repositoryRoot),
    ).toThrow(/styleReference must be null without a constraint/i);

    const forgedLocalRepair = structuredClone(files);
    forgedLocalRepair.generationRecords.records.find(
      ({ id }) => id === "wands-10-attempt-016",
    ).styleReference = {
      id: "the-fool",
      path: "public/cards/v3/the-fool.jpg",
      sha256:
        "d9bf98f82fbd212b1f663590c35482e6d927ac1f7e42f98c717e82c393fa44ef",
    };
    expect(() =>
      validateCardArtV3System(forgedLocalRepair, repositoryRoot),
    ).toThrow(/deterministic local repair prompt and retry fields/i);

    const forgedColorRepair = structuredClone(files);
    forgedColorRepair.generationRecords.records.find(
      ({ id }) => id === "cups-page-attempt-004",
    ).styleReference = {
      id: "the-fool",
      path: "public/cards/v3/the-fool.jpg",
      sha256:
        "d9bf98f82fbd212b1f663590c35482e6d927ac1f7e42f98c717e82c393fa44ef",
    };
    expect(() =>
      validateCardArtV3System(forgedColorRepair, repositoryRoot),
    ).toThrow(/deterministic local color repair/i);
  }, 30_000);

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

  it("reproduces the reviewed Wands Ten local composite with zero changes outside its mask", async () => {
    const rendered = await renderWands10LocalRepair();
    const [storedMask, storedOutput, base] = await Promise.all([
      readFile(
        resolve(
          repositoryRoot,
          "art/card-art-v3-controls/wands-10-local-repair-mask-001.png",
        ),
      ),
      readFile(
        resolve(
          repositoryRoot,
          "art/card-art-v3-raw/pilot-wands/wands-10-candidate-016.png",
        ),
      ),
      sharp(
        resolve(
          repositoryRoot,
          "art/card-art-v3-raw/pilot-wands/wands-10-candidate-014-rejected.png",
        ),
      )
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true }),
    ]);
    expect(rendered.maskPng.equals(storedMask)).toBe(true);
    expect(rendered.outputPng.equals(storedOutput)).toBe(true);
    expect(rendered.changedInside).toBe(57212);
    expect(rendered.changedOutside).toBe(0);

    const [mask, output] = await Promise.all([
      sharp(storedMask).greyscale().raw().toBuffer({ resolveWithObject: true }),
      sharp(storedOutput)
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true }),
    ]);
    let changedInside = 0;
    let changedOutside = 0;
    for (let pixel = 0; pixel < mask.data.length; pixel += 1) {
      const offset = pixel * 3;
      const changed = [0, 1, 2].some(
        (channel) =>
          base.data[offset + channel] !== output.data[offset + channel],
      );
      if (!changed) continue;
      if (mask.data[pixel] === 0) changedOutside += 1;
      else changedInside += 1;
    }
    expect(changedInside).toBe(57212);
    expect(changedOutside).toBe(0);
  }, 15_000);

  it("keeps deterministic local repair provenance separate from ImageGen retries", () => {
    const files = loadCardArtV3Files(repositoryRoot);
    const record = files.generationRecords.records.find(
      ({ id }) => id === "wands-10-attempt-016",
    );
    expect(record.generator).toEqual({
      mode: "deterministic-local-composite",
      tool: "Sharp",
      toolVersion: "0.34.5",
    });
    expect(record.promptSha256).toBeNull();
    expect(record.effectivePromptSha256).toBeNull();
    expect(record.retryConstraint).toBeNull();
    expect(record.retryReview).toBeNull();

    const forgedMask = structuredClone(files);
    forgedMask.generationRecords.records.find(
      ({ id }) => id === "wands-10-attempt-016",
    ).repair.mask.sha256 = "0".repeat(64);
    expect(() => validateCardArtV3System(forgedMask, repositoryRoot)).toThrow(
      /repair\.mask|repair recipe|referenceSha256/i,
    );

    const forgedPrompt = structuredClone(files);
    forgedPrompt.generationRecords.records.find(
      ({ id }) => id === "wands-10-attempt-016",
    ).promptSha256 = files.generationRecords.records.find(
      ({ id }) => id === "wands-10-attempt-015",
    ).promptSha256;
    expect(() => validateCardArtV3System(forgedPrompt, repositoryRoot)).toThrow(
      /prompt and retry fields must all be null/i,
    );

    const missingRecipeReference = structuredClone(files);
    delete missingRecipeReference.generationRecords.records.find(
      ({ id }) => id === "wands-10-attempt-016",
    ).referenceSha256["wands-10-local-repair-001"];
    expect(() =>
      validateCardArtV3System(missingRecipeReference, repositoryRoot),
    ).toThrow(/referenceSha256 must exactly match/i);
  }, 15_000);

  it("reproduces the reviewed Devil five-layer composite without touching protected pixels", async () => {
    const rendered = await renderDevilLocalRepair();

    expect(rendered.artifacts).toEqual({
      masks: {
        leftErase:
          "3c7398032287382392b195a53337a920deb149cd840879fd31d75d050dd02ca7",
        leftNew:
          "8981dabfac500a47191d2749ec66ef313e5e5d56f35498992822f623ff95431e",
        rightErase:
          "1de593ea8347a19d191a9aa67d6225613d28d43dffaef89e44ec6db347f744ff",
        rightConnector:
          "c376932f90910dc43a401131966af344fc97df20cd1aab90b05ed76cc807a212",
        rightNew:
          "3176a0438ae17e088aabc315df81feeb686c660e7bbf2cd7eac18e80cf9cc4df",
      },
      output:
        "648c7f38d91294f21b25c99d494818b8894385a0e25b2d5494ac39767df627e2",
      registeredLeft:
        "838367b969c544f7e2fb5e99bc93b282931bbf16952ee63478fde6e5620f72ea",
      registeredRight:
        "361b244a45357e3c1026e94f966e9e6aec5608fe7f80966d54a6ec6ea0338d7e",
    });
    expect(rendered.baseSha256).toBe(
      "14f2d03bfacebb317bd6d0500db8a124f36b9314ed84eae90b44fb0a0e9a7beb",
    );
    expect(rendered.recipeSha256).toBe(
      "9c4216490b1ceb7b25f1cd4b606239fa4f22b89fd8d3e78ac0a9c0c3611ae3a1",
    );
    expect(rendered.bboxes).toEqual({
      leftErase: {
        maxX: 454,
        maxY: 909,
        minX: 320,
        minY: 720,
        nonzero: 18777,
      },
      leftNew: {
        maxX: 464,
        maxY: 769,
        minX: 295,
        minY: 600,
        nonzero: 18166,
      },
      rightErase: {
        maxX: 704,
        maxY: 979,
        minX: 601,
        minY: 750,
        nonzero: 18481,
      },
      rightConnector: {
        maxX: 718,
        maxY: 958,
        minX: 627,
        minY: 886,
        nonzero: 3080,
      },
      rightNew: {
        maxX: 709,
        maxY: 769,
        minX: 495,
        minY: 500,
        nonzero: 25659,
      },
    });
    expect(rendered.changedInside).toBe(77004);
    expect(rendered.changedOutside).toBe(0);
    expect(rendered.leftRightOverlap).toBe(0);
    expect(rendered.centralBridgeChanged).toBe(0);
    expect(rendered.rightGuideChanged).toBe(0);
    expect(rendered.unionNonzero).toBe(78560);
    expect(rendered.mappingResidual).toEqual({
      left: 0.46465598491982973,
      right: 0.46465598491982973,
    });
    expect(rendered.layerChanges).toEqual({
      leftErase: 18431,
      leftNew: 16095,
      rightErase: 18090,
      rightConnector: 754,
      rightNew: 24986,
    });
  }, 15_000);

  it("rejects every forged Devil selected-record provenance class", () => {
    const validFiles = asPlanningSnapshot(loadCardArtV3Files(repositoryRoot));
    expect(validateCardArtV3System(validFiles, repositoryRoot)).toEqual({
      approvedCount: 78,
      cardCount: 78,
      generationCount: validFiles.generationRecords.records.length,
      releaseCount: 0,
    });

    const cases = [
      ["missing repair key", (record) => delete record.repair.bboxes],
      ["extra repair key", (record) => (record.repair.unreviewed = true)],
      [
        "recipe SHA",
        (record) => (record.repair.recipe.sha256 = "0".repeat(64)),
      ],
      [
        "script SHA",
        (record) => (record.repair.script.sha256 = "0".repeat(64)),
      ],
      [
        "expected output SHA",
        (record) => (record.repair.expectedOutputSha256 = "0".repeat(64)),
      ],
      ["raw output SHA", (record) => (record.rawOutputSha256 = "0".repeat(64))],
      [
        "duplicate donor",
        (record) => (record.repair.donors.left = record.repair.donors.right),
      ],
      [
        "swapped donors",
        (record) =>
          ([record.repair.donors.left, record.repair.donors.right] = [
            record.repair.donors.right,
            record.repair.donors.left,
          ]),
      ],
      [
        "predecessor",
        (record) => (record.previousAttemptId = "the-devil-attempt-012"),
      ],
      [
        "chronology",
        (record) => (record.generatedAt = "2026-08-07T06:49:59.000Z"),
      ],
      [
        "registered donor",
        (record) =>
          (record.repair.registeredDonors.left.sha256 = "0".repeat(64)),
      ],
      ...[
        "leftErase",
        "leftNew",
        "rightErase",
        "rightConnector",
        "rightNew",
      ].map((name) => [
        `${name} mask SHA`,
        (record) => (record.repair.masks[name].sha256 = "0".repeat(64)),
      ]),
      [
        "mask bbox",
        (record) => (record.repair.masks.rightConnector.bbox.maxX += 1),
      ],
      ["changedInside", (record) => (record.repair.changedInside += 1)],
      ["changedOutside", (record) => (record.repair.changedOutside += 1)],
      ["left/right overlap", (record) => (record.repair.leftRightOverlap += 1)],
      ["central bridge", (record) => (record.repair.centralBridgeChanged += 1)],
      ["right guide", (record) => (record.repair.rightGuideChanged += 1)],
      ["union", (record) => (record.repair.unionNonzero += 1)],
      [
        "mapping residual",
        (record) => (record.repair.mappingResidual.left += 0.01),
      ],
      ["layer change", (record) => (record.repair.layerChanges.leftErase += 1)],
      [
        "review timestamp",
        (record) => (record.repair.reviewedAt = "2026-08-07T06:50:01.000Z"),
      ],
      [
        "missing reference",
        (record) =>
          delete record.referenceSha256[
            "the-devil-local-repair-rightNew-mask-001"
          ],
      ],
      [
        "extra reference",
        (record) => (record.referenceSha256.unreviewed = "0".repeat(64)),
      ],
      [
        "reference value",
        (record) =>
          (record.referenceSha256["the-devil-attempt-010"] = "0".repeat(64)),
      ],
      ["prompt field", (record) => (record.promptSha256 = "0".repeat(64))],
      [
        "retry field",
        (record) => (record.retryConstraint = "unreviewed retry"),
      ],
      [
        "edit field",
        (record) =>
          (record.editSource = {
            attemptId: "the-devil-attempt-013",
            path: record.repair.donors.right.path,
            sha256: record.repair.donors.right.sha256,
          }),
      ],
    ];

    for (const [name, mutate] of cases) {
      const forged = structuredClone(validFiles);
      const record = forged.generationRecords.records.find(
        ({ id }) => id === "the-devil-attempt-014",
      );
      mutate(record);
      expect(
        () => validateCardArtV3System(forged, repositoryRoot),
        name,
      ).toThrow();
    }
  }, 90_000);

  it("rejects Devil recipe reviewer and check byte mutations", async () => {
    const recipePath = resolve(
      repositoryRoot,
      "art/card-art-v3-repair-recipes/the-devil-local-repair-001.json",
    );
    const original = await readFile(recipePath);
    temporaryFileRestorations.push({ contents: original, path: recipePath });
    const files = loadCardArtV3Files(repositoryRoot);
    const recipe = JSON.parse(original.toString("utf8"));

    recipe.review.reviewers[0] = "Unreviewed reviewer";
    await writeFile(recipePath, `${JSON.stringify(recipe, null, 2)}\n`);
    expect(() => validateCardArtV3System(files, repositoryRoot)).toThrow(
      /recipe/i,
    );

    recipe.review.reviewers[0] =
      "Planck (independent two-loop tarot meaning and four-hand audit)";
    recipe.review.checks.fourNaturalHands = false;
    await writeFile(recipePath, `${JSON.stringify(recipe, null, 2)}\n`);
    expect(() => validateCardArtV3System(files, repositoryRoot)).toThrow(
      /recipe/i,
    );

    await writeFile(recipePath, original);
    temporaryFileRestorations.pop();
  }, 15_000);

  it("keeps every completed stage open after its exact gates pass", () => {
    const files = loadCardArtV3Files(repositoryRoot);

    expect(() =>
      getCardArtV3PromptRecord(files, "swords-page", repositoryRoot),
    ).not.toThrow();
    expect(() =>
      getCardArtV3PromptRecord(files, "death", repositoryRoot),
    ).not.toThrow();
    expect(() =>
      getCardArtV3PromptRecord(files, "wands-2", repositoryRoot),
    ).not.toThrow();
  });

  it("opens Major B only for the exact atomic Major A gate and five approvals", () => {
    const committed = asPlanningSnapshot(loadCardArtV3Files(repositoryRoot));
    const preGate = structuredClone(committed);
    const gateIndex = preGate.batchReviewGates.entries.findIndex(
      ({ id }) => id === "major-new-a-review-001",
    );
    preGate.batchReviewGates.entries.splice(gateIndex, 1);
    for (const cardId of [
      "the-hierophant",
      "justice",
      "the-hanged-man",
      "death",
      "the-devil",
    ]) {
      delete preGate.approvals.records[cardId];
    }
    for (const cardId of [
      "the-tower",
      "the-moon",
      "the-sun",
      "judgement",
      "the-world",
    ]) {
      expect(() =>
        getCardArtV3PromptRecord(preGate, cardId, repositoryRoot),
      ).toThrow(/externally frozen batch review gate|committed atomically/i);
      expect(() =>
        getCardArtV3PromptAuditRecord(preGate, cardId, repositoryRoot),
      ).not.toThrow();
    }

    const postGate = structuredClone(preGate);
    const fixture = getMajorNewAAtomicFixture();
    postGate.batchReviewGates.entries.splice(gateIndex, 0, fixture.gate);
    Object.assign(postGate.approvals.records, fixture.approvals);
    expect(postGate).toEqual(committed);
    expect(validateCardArtV3System(postGate, repositoryRoot)).toEqual({
      approvedCount: 78,
      cardCount: 78,
      generationCount: postGate.generationRecords.records.length,
      releaseCount: 0,
    });
    for (const cardId of [
      "the-tower",
      "the-moon",
      "the-sun",
      "judgement",
      "the-world",
    ]) {
      expect(() =>
        getCardArtV3PromptRecord(postGate, cardId, repositoryRoot),
      ).not.toThrow();
    }

    const gateOnly = structuredClone(preGate);
    gateOnly.batchReviewGates.entries.splice(gateIndex, 0, fixture.gate);
    expect(() => validateCardArtV3System(gateOnly, repositoryRoot)).toThrow(
      /committed atomically/i,
    );

    const approvalsOnly = structuredClone(preGate);
    Object.assign(approvalsOnly.approvals.records, fixture.approvals);
    expect(() =>
      validateCardArtV3System(approvalsOnly, repositoryRoot),
    ).toThrow(/requires an externally frozen batch review gate/i);

    const mutations = [
      (files) => {
        files.batchReviewGates.entries.find(
          ({ id }) => id === "major-new-a-review-001",
        ).reviewEvidence.full.path =
          "art/card-art-v3-reviews/major-new-a-contact-sheet-v2.jpg";
      },
      (files) => {
        files.batchReviewGates.entries.find(
          ({ id }) => id === "major-new-a-review-001",
        ).reviewEvidence.mobile.sha256 = "0".repeat(64);
      },
      (files) => {
        files.batchReviewGates.entries.find(
          ({ id }) => id === "major-new-a-review-001",
        ).reviewEvidence.attemptIds[4] = "the-devil-attempt-013";
      },
      (files) => {
        files.batchReviewGates.entries.find(
          ({ id }) => id === "major-new-a-review-001",
        ).reviewEvidence.assetMapSha256 = "0".repeat(64);
      },
      (files) => {
        files.batchReviewGates.entries.find(
          ({ id }) => id === "major-new-a-review-001",
        ).independentReviews[2].reviewer = "Planck";
      },
      (files) => {
        files.batchReviewGates.entries.find(
          ({ id }) => id === "major-new-a-review-001",
        ).decisionFingerprintSha256 = "0".repeat(64);
      },
      (files) => {
        delete files.approvals.records["the-hierophant"];
      },
    ];
    for (const mutate of mutations) {
      const forged = structuredClone(postGate);
      mutate(forged);
      expect(() => validateCardArtV3System(forged, repositoryRoot)).toThrow();
    }
  }, 60_000);

  it("opens Wands A only for the exact atomic Major B gate and five approvals", () => {
    const committed = asPlanningSnapshot(loadCardArtV3Files(repositoryRoot));
    const preGate = structuredClone(committed);
    const gateIndex = preGate.batchReviewGates.entries.findIndex(
      ({ id }) => id === "major-new-b-review-001",
    );
    preGate.batchReviewGates.entries.splice(gateIndex, 1);
    for (const cardId of majorNewBCardIds) {
      delete preGate.approvals.records[cardId];
    }
    for (const cardId of [
      "wands-2",
      "wands-3",
      "wands-4",
      "wands-6",
      "wands-7",
    ]) {
      expect(() =>
        getCardArtV3PromptRecord(preGate, cardId, repositoryRoot),
      ).toThrow(/externally frozen batch review gate|committed atomically/i);
      expect(() =>
        getCardArtV3PromptAuditRecord(preGate, cardId, repositoryRoot),
      ).not.toThrow();
    }

    const postGate = structuredClone(preGate);
    const fixture = getMajorNewBAtomicFixture();
    postGate.batchReviewGates.entries.splice(gateIndex, 0, fixture.gate);
    Object.assign(postGate.approvals.records, fixture.approvals);
    expect(postGate).toEqual(committed);
    expect(validateCardArtV3System(postGate, repositoryRoot)).toEqual({
      approvedCount: 78,
      cardCount: 78,
      generationCount: postGate.generationRecords.records.length,
      releaseCount: 0,
    });
    for (const cardId of [
      "wands-2",
      "wands-3",
      "wands-4",
      "wands-6",
      "wands-7",
    ]) {
      expect(() =>
        getCardArtV3PromptRecord(postGate, cardId, repositoryRoot),
      ).not.toThrow();
    }

    const gateOnly = structuredClone(preGate);
    gateOnly.batchReviewGates.entries.splice(gateIndex, 0, fixture.gate);
    expect(() => validateCardArtV3System(gateOnly, repositoryRoot)).toThrow(
      /committed atomically/i,
    );

    const approvalsOnly = structuredClone(preGate);
    Object.assign(approvalsOnly.approvals.records, fixture.approvals);
    expect(() =>
      validateCardArtV3System(approvalsOnly, repositoryRoot),
    ).toThrow(/requires an externally frozen batch review gate/i);

    const mutations = [
      (files) => {
        files.batchReviewGates.entries.find(
          ({ id }) => id === "major-new-b-review-001",
        ).reviewEvidence.full.path =
          "art/card-art-v3-reviews/major-new-b-contact-sheet-v2.jpg";
      },
      (files) => {
        files.batchReviewGates.entries.find(
          ({ id }) => id === "major-new-b-review-001",
        ).reviewEvidence.mobile.sha256 = "0".repeat(64);
      },
      (files) => {
        files.batchReviewGates.entries.find(
          ({ id }) => id === "major-new-b-review-001",
        ).reviewEvidence.attemptIds[0] = "the-tower-attempt-004";
      },
      (files) => {
        files.batchReviewGates.entries.find(
          ({ id }) => id === "major-new-b-review-001",
        ).reviewEvidence.assetMapSha256 = "0".repeat(64);
      },
      (files) => {
        files.batchReviewGates.entries.find(
          ({ id }) => id === "major-new-b-review-001",
        ).independentReviews[2].reviewer = "Planck";
      },
      (files) => {
        files.batchReviewGates.entries.find(
          ({ id }) => id === "major-new-b-review-001",
        ).decisionFingerprintSha256 = "0".repeat(64);
      },
      (files) => {
        delete files.approvals.records["the-tower"];
      },
    ];
    for (const mutate of mutations) {
      const forged = structuredClone(postGate);
      mutate(forged);
      expect(() => validateCardArtV3System(forged, repositoryRoot)).toThrow();
    }
  }, 60_000);

  it("keeps audit reproduction byte-identical after later gates open", () => {
    const files = loadAuditCardArtV3Files();
    const courtAudit = getCardArtV3PromptAuditRecord(
      files,
      "swords-page",
      repositoryRoot,
    );
    const majorAudit = getCardArtV3PromptAuditRecord(
      files,
      "death",
      repositoryRoot,
    );

    expect(courtAudit).toMatchObject({
      cardId: "swords-page",
      auditOnly: true,
    });
    expect(majorAudit).toMatchObject({ cardId: "death", auditOnly: true });
    expect(
      getCardArtV3PromptRecord(files, "swords-page", repositoryRoot).prompt,
    ).toBe(courtAudit.prompt);
    expect(
      getCardArtV3PromptRecord(files, "death", repositoryRoot).prompt,
    ).toBe(majorAudit.prompt);
  });

  it("keeps both reviewed Cups Page retries immutable after gate promotion", () => {
    const files = loadCardArtV3Files(repositoryRoot);

    expect(() =>
      getCardArtV3ReviewedAttemptRecord(
        files,
        "cups-page",
        "art/card-art-v3-retry-constraints/cups-page-attempt-003.json",
        repositoryRoot,
      ),
    ).toThrow(/already recorded/i);
    expect(() =>
      getCardArtV3ReviewedAttemptRecord(
        files,
        "cups-page",
        "art/card-art-v3-retry-constraints/cups-page-attempt-004.json",
        repositoryRoot,
      ),
    ).toThrow(/already recorded/i);
    const repair = getCardArtV3ReviewedAttemptAuditRecord(
      files,
      "cups-page",
      "art/card-art-v3-retry-constraints/cups-page-attempt-004.json",
      repositoryRoot,
    );
    expect(repair).toMatchObject({
      auditOnly: true,
      attemptNumber: 4,
      previousAttemptId: "cups-page-attempt-003",
      repairMode: "deterministic-local-color-repair",
      base: { attemptId: "cups-page-attempt-002" },
      neutralOutputPath:
        "art/card-art-v3-candidates/cups-page-attempt-004.raw.png",
    });
    for (const imageGenField of [
      "prompt",
      "promptSha256",
      "effectivePrompt",
      "effectivePromptSha256",
      "editSource",
      "referenceSha256",
      "referenced_image_paths",
    ]) {
      expect(repair).not.toHaveProperty(imageGenField);
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
      const files = asPlanningSnapshot(
        structuredClone(loadCardArtV3Files(repositoryRoot)),
      );
      mutate(files);
      expect(() => validateCardArtV3System(files, repositoryRoot)).toThrow();
    }
  }, 15_000);

  it("refuses a release snapshot before all 78 card approvals exist", () => {
    const files = structuredClone(loadCardArtV3Files(repositoryRoot));
    delete files.approvals.records["pentacles-9"];

    expect(() => validateCardArtV3System(files, repositoryRoot)).toThrow(
      /before all 78 cards are approved/i,
    );

    const missingDeckReview = structuredClone(
      loadCardArtV3Files(repositoryRoot),
    );
    delete missingDeckReview.releaseHistory.entries[0].independentReviews
      .deckContactSheet;
    expect(() =>
      validateCardArtV3System(missingDeckReview, repositoryRoot),
    ).toThrow(/independentReviews\.deckContactSheet/i);
  });

  it("binds releaseState to release history without invalidating generation fingerprints", () => {
    const files = structuredClone(loadCardArtV3Files(repositoryRoot));
    const releasedSha = getCardArtV3ManifestSha256(files.manifest);

    files.manifest.releaseState = "planning";
    expect(getCardArtV3ManifestSha256(files.manifest)).toBe(releasedSha);
    expect(() => validateCardArtV3System(files, repositoryRoot)).toThrow(
      /releaseState must be "released"/i,
    );

    files.manifest.releaseState = "released";
    files.releaseHistory.entries = [];
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
      supersessions: { entries: [{ id: "frozen-supersession" }] },
    };

    expect(() =>
      validateCardArtV3System(files, repositoryRoot, baseline),
    ).toThrow(/immutable baseline|immutable once committed/i);
  });

  it("preserves a selected attempt through a hashed supersession archive and rejected batch gate", () => {
    const files = loadCardArtV3Files(repositoryRoot);
    const supersession = files.supersessions.entries[0];
    const selected = files.generationRecords.records.find(
      ({ id }) => id === supersession.attemptId,
    );

    expect(selected.selectionStatus).toBe("selected");
    expect(supersession).toMatchObject({
      cardId: "cups-page",
      result: "rejected",
      status: "superseded",
    });
    expect(supersession.archive.sha256).toBe(selected.normalized.assetSha256);
    expect(() => validateCardArtV3System(files, repositoryRoot)).not.toThrow();
  });

  it("rejects supersession archive, contact-sheet, review and approval drift", () => {
    const mutations = [
      (files) => {
        files.supersessions.entries[0].archive.sha256 = "0".repeat(64);
      },
      (files) => {
        files.supersessions.entries[0].reviewEvidence.mobile.sha256 =
          "0".repeat(64);
      },
      (files) => {
        files.supersessions.entries[0].independentReviews =
          files.supersessions.entries[0].independentReviews.map((review) => ({
            ...review,
            result: "approved",
          }));
      },
      (files) => {
        files.approvals.records["cups-page"] = {
          status: "approved",
        };
      },
    ];

    for (const mutate of mutations) {
      const files = structuredClone(loadCardArtV3Files(repositoryRoot));
      mutate(files);
      expect(() =>
        validateCardArtV3System(files, repositoryRoot, null),
      ).toThrow(/validation failed/i);
    }
  });

  it("keeps recorded retries immutable while leaving the reviewed Wands stage open", () => {
    const files = loadCardArtV3Files(repositoryRoot);

    expect(() =>
      getCardArtV3PromptRecord(files, "swords-page", repositoryRoot),
    ).not.toThrow();
    expect(() =>
      getCardArtV3ReviewedAttemptRecord(
        files,
        "wands-10",
        "art/card-art-v3-retry-constraints/wands-10-attempt-007.json",
        repositoryRoot,
      ),
    ).toThrow(/already recorded/i);
    expect(() =>
      getCardArtV3ReviewedAttemptRecord(
        files,
        "cups-page",
        "art/card-art-v3-retry-constraints/cups-page-attempt-003.json",
        repositoryRoot,
      ),
    ).toThrow(/already recorded/i);
    expect(() =>
      getCardArtV3ReviewedAttemptRecord(
        files,
        "cups-page",
        "art/card-art-v3-retry-constraints/cups-page-attempt-004.json",
        repositoryRoot,
      ),
    ).toThrow(/already recorded/i);
    expect(() =>
      getCardArtV3PromptRecord(files, "wands-2", repositoryRoot),
    ).not.toThrow();
  });

  it("rejects repair authorization drift and self-repinned reviewer evidence", () => {
    const mutations = [
      (files) => {
        files.repairAuthorizations.entries[0].binding.retryArtifact.sha256 =
          "0".repeat(64);
      },
      (files) => {
        files.repairAuthorizations.entries[0].binding.base = {
          attemptId: "cups-page-attempt-003",
          path: files.generationRecords.records.at(-1).rawOutputPath,
          sha256: files.generationRecords.records.at(-1).rawOutputSha256,
        };
      },
      (files) => {
        const authorization = files.repairAuthorizations.entries[0];
        authorization.independentReviews[1].reviewer = "Planck ";
        authorization.decisionFingerprintSha256 = sha256StableForTest({
          binding: authorization.binding,
          independentReviews: authorization.independentReviews,
          status: authorization.status,
          authorizedAt: authorization.authorizedAt,
        });
      },
    ];

    for (const mutate of mutations) {
      const files = structuredClone(loadCardArtV3Files(repositoryRoot));
      mutate(files);
      expect(() =>
        validateCardArtV3System(files, repositoryRoot, null),
      ).toThrow(/repair authorization|externally frozen/i);
    }
  });

  it("rejects repair authorization envelope metadata drift at the renderer boundary", () => {
    const envelope = loadCardArtV3Files(repositoryRoot).repairAuthorizations;

    expect(() =>
      assertCupsPageRepairAuthorizationEnvelope(envelope),
    ).not.toThrow();
    for (const mutate of [
      (copy) => {
        copy.schemaVersion = 2;
      },
      (copy) => {
        copy.systemId = "forged-system";
      },
      (copy) => {
        copy.version = "v4";
      },
      (copy) => {
        copy.entries.push(structuredClone(copy.entries[0]));
      },
    ]) {
      const copy = structuredClone(envelope);
      mutate(copy);
      expect(() => assertCupsPageRepairAuthorizationEnvelope(copy)).toThrow(
        /envelope metadata has drifted/i,
      );
    }
  });

  it("rejects unrelated sheets, path aliases, normalized duplicate reviewers and late batch assets", () => {
    const mutations = [
      (files) => {
        const evidence = files.supersessions.entries[0].reviewEvidence;
        evidence.full.path =
          "art/card-art-v3-reviews/pilot-contact-sheet-v1.jpg";
        evidence.full.sha256 =
          "55517bc20c86b5405e10de4e2ca42b7c10a2fe6a562df4159ea8abd09d56be9c";
        evidence.full.bytes = 700046;
        evidence.full.width = 890;
        evidence.full.height = 1246;
      },
      (files) => {
        const evidence = files.supersessions.entries[0].reviewEvidence;
        evidence.mobile = {
          ...evidence.full,
          path: `art/card-art-v3-reviews//${evidence.full.path.split("/").at(-1)}`,
        };
      },
      (files) => {
        files.supersessions.entries[0].independentReviews = [
          ...files.supersessions.entries[0].independentReviews,
        ].map((review, index) => ({
          ...review,
          reviewer: ["Planck", "Planck ", "Planck\t"][index],
        }));
      },
      (files) => {
        files.generationRecords.records.find(
          ({ id }) => id === "cups-king-attempt-002",
        ).generatedAt = "2026-08-06T09:14:00.000Z";
      },
      (files) => {
        files.supersessions.entries[0].reason = "Changed after review.";
      },
      (files) => {
        files.supersessions.entries[0].reviewEvidence.blocker =
          "Changed blocker after review.";
      },
      (files) => {
        const reviews = files.supersessions.entries[0].independentReviews;
        reviews[0].result = "approved";
        reviews[1].result = "rejected";
      },
    ];

    for (const mutate of mutations) {
      const files = structuredClone(loadCardArtV3Files(repositoryRoot));
      mutate(files);
      expect(() =>
        validateCardArtV3System(files, repositoryRoot, null),
      ).toThrow(/validation failed/i);
    }
  }, 60_000);

  it("rejects self-repinned review changes and visually duplicate reviewer identities", () => {
    const files = structuredClone(loadCardArtV3Files(repositoryRoot));
    const entry = files.supersessions.entries[0];
    entry.reason = "Repinned full regeneration authorization.";
    entry.reviewEvidence.blocker = "Repinned blocker.";
    entry.replacementContract.allowedChange = "Full regeneration is allowed.";
    entry.independentReviews[0].reviewer = "Planck";
    entry.independentReviews[1].reviewer = "Planck\u200B";
    entry.independentReviews[2].reviewer = "Planck\u2060";
    entry.independentReviews[0].result = "approved";
    entry.independentReviews[1].result = "rejected";
    entry.decisionFingerprintSha256 = sha256StableForTest(
      supersessionDecisionPayload(entry),
    );

    expect(() => validateCardArtV3System(files, repositoryRoot, null)).toThrow(
      /externally frozen independent-review contract/i,
    );
  });

  it("preserves supersession < retry review chronology and the exact hair-only contract", () => {
    const files = loadAuditCardArtV3Files();
    const record = getCardArtV3ReviewedAttemptAuditRecord(
      files,
      "cups-page",
      "art/card-art-v3-retry-constraints/cups-page-attempt-003.json",
      repositoryRoot,
    );

    expect(record.editSource?.attemptId).toBe("cups-page-attempt-002");
    expect(record.retryConstraint).toContain(
      "Change only the Page character's hair pigment",
    );
    expect(
      Date.parse(files.supersessions.entries[0].supersededAt),
    ).toBeLessThan(Date.parse(record.retryReview.reviewedAt));

    const retroactive = structuredClone(files);
    retroactive.supersessions.entries[0].supersededAt =
      "2026-08-06T09:33:00.000Z";
    expect(() =>
      validateCardArtV3System(retroactive, repositoryRoot, null),
    ).toThrow(/replacementContract|decisionFingerprint|validation failed/i);
  });

  it("locks attempt-004, gate-002 and all six court approvals as one transition", () => {
    const files = loadCardArtV3Files(repositoryRoot);
    const rejected = files.generationRecords.records.find(
      ({ id }) => id === "cups-page-attempt-003",
    );
    const replacement = files.generationRecords.records.find(
      ({ id }) => id === "cups-page-attempt-004",
    );
    const gate = files.replacementGates.entries[0];

    expect(rejected).toMatchObject({ selectionStatus: "rejected" });
    expect(replacement).toMatchObject({
      editSource: null,
      previousAttemptId: "cups-page-attempt-003",
      promptSha256: null,
      selectionStatus: "selected",
      generator: {
        mode: "deterministic-local-color-repair",
        tool: "Sharp",
        toolVersion: "0.34.5",
      },
      repair: {
        base: { attemptId: "cups-page-attempt-002" },
        changedInside: 25523,
        changedOutside: 0,
      },
    });
    expect(gate).toMatchObject({
      id: "court-validation-a-cups-page-replacement-002",
      replacementAttemptId: replacement.id,
      decisionFingerprintSha256:
        "8f3be269b77e192210ee74d6ab25ed8941a430629843ba5aae31610169343eff",
    });
    for (const cardId of gate.reviewEvidence.cardIds) {
      expect(files.approvals.records[cardId]).toMatchObject({
        status: "approved",
      });
    }

    const mutations = [
      (copy) => {
        copy.replacementGates.entries = [];
      },
      (copy) => {
        copy.generationRecords.records = copy.generationRecords.records.filter(
          ({ id }) => id !== replacement.id,
        );
      },
      (copy) => {
        delete copy.approvals.records["wands-knight"];
      },
      (copy) => {
        copy.generationRecords.records.find(
          ({ id }) => id === replacement.id,
        ).repair.base.attemptId = "cups-page-attempt-003";
      },
      (copy) => {
        copy.generationRecords.records.find(
          ({ id }) => id === replacement.id,
        ).repair.changedOutside = 1;
      },
      (copy) => {
        copy.generationRecords.records.find(
          ({ id }) => id === replacement.id,
        ).repair.forbiddenIntersections.face = 1;
      },
      (copy) => {
        const forgedGate = copy.replacementGates.entries[0];
        forgedGate.independentReviews[0].scope += " drift";
        forgedGate.decisionFingerprintSha256 = sha256StableForTest({
          independentReviews: forgedGate.independentReviews,
          replacementAttemptId: forgedGate.replacementAttemptId,
          result: forgedGate.result,
          reviewEvidence: forgedGate.reviewEvidence,
          reviewedAt: forgedGate.reviewedAt,
          status: forgedGate.status,
          supersessionId: forgedGate.supersessionId,
        });
      },
      (copy) => {
        copy.replacementGates.entries[0].reviewEvidence.full.path =
          "art/card-art-v3-reviews/court-validation-a-contact-sheet-v2.jpg";
      },
    ];
    for (const mutate of mutations) {
      const copy = structuredClone(files);
      mutate(copy);
      expect(() => validateCardArtV3System(copy, repositoryRoot, null)).toThrow(
        /validation failed/i,
      );
    }
  }, 30_000);

  it("locks Court B attempts, deterministic sheets, three reviews and six approvals atomically", () => {
    const files = loadCardArtV3Files(repositoryRoot);
    const gate = files.batchReviewGates.entries[0];

    expect(gate).toMatchObject({
      id: "court-validation-b-review-001",
      batchId: "court-validation-b",
      decisionFingerprintSha256:
        "cec1850d348cec411d54d8b72139d5ab3225ad71077fe90fc3a4e43ab6c46539",
      result: "approved",
      status: "passed",
    });
    expect(gate.reviewEvidence.attemptIds).toEqual([
      "swords-page-attempt-002",
      "swords-knight-attempt-001",
      "swords-king-attempt-002",
      "pentacles-page-attempt-001",
      "pentacles-knight-attempt-001",
      "pentacles-queen-attempt-007",
    ]);
    expect(gate.decisionFingerprintSha256).toBe(
      sha256StableForTest(batchReviewGateDecisionPayload(gate)),
    );
    for (const cardId of gate.reviewEvidence.cardIds) {
      expect(files.approvals.records[cardId]).toMatchObject({
        batchReviewGateId: gate.id,
        status: "approved",
      });
    }

    const mutations = [
      (copy) => {
        copy.batchReviewGates.entries = [];
      },
      (copy) => {
        delete copy.approvals.records["pentacles-queen"].batchReviewGateId;
      },
      (copy) => {
        copy.batchReviewGates.entries[0].reviewEvidence.assetSha256[
          "swords-page"
        ] = "0".repeat(64);
      },
      (copy) => {
        const forged = copy.batchReviewGates.entries[0];
        forged.independentReviews[0].scope += " drift";
        forged.decisionFingerprintSha256 = sha256StableForTest(
          batchReviewGateDecisionPayload(forged),
        );
      },
      (copy) => {
        copy.batchReviewGates.entries[0].reviewEvidence.full.path =
          "art/card-art-v3-reviews/court-validation-b-contact-sheet-v6.jpg";
      },
      (copy) => {
        copy.generationRecords.records = copy.generationRecords.records.filter(
          ({ id }) => id !== "pentacles-queen-attempt-007",
        );
      },
    ];
    for (const mutate of mutations) {
      const copy = structuredClone(files);
      mutate(copy);
      expect(() => validateCardArtV3System(copy, repositoryRoot, null)).toThrow(
        /validation failed/i,
      );
    }
  }, 30_000);

  it("locks the exact-five legacy final gate across generated, retouched and byte-reused assets", () => {
    const files = loadCardArtV3Files(repositoryRoot);
    const gate = files.batchReviewGates.entries.find(
      ({ id }) => id === "legacy-keep-review-001",
    );

    expect(gate).toMatchObject({
      batchId: "legacy-keep",
      decisionFingerprintSha256:
        "b97da1410675002298bbf351d315258c4aafd1d990d8c24bc1c6e502002d935f",
      result: "approved",
      status: "passed",
    });
    expect(gate.reviewEvidence.cardIds).toEqual([
      "the-fool",
      "the-lovers",
      "the-chariot",
      "strength",
      "wheel-of-fortune",
    ]);
    expect(gate.reviewEvidence.attemptIds).toEqual([
      "the-fool-retouch-001",
      null,
      null,
      null,
      "wheel-of-fortune-attempt-005",
    ]);
    expect(gate.decisionFingerprintSha256).toBe(
      sha256StableForTest(batchReviewGateDecisionPayload(gate)),
    );
    expect(files.approvals.records["the-fool"]).toMatchObject({
      batchReviewGateBoundAt: "2026-08-07T02:01:30.000Z",
      batchReviewGateId: gate.id,
      generationRecordId: "the-fool-retouch-001",
      provenance: "retouched-v3",
    });
    for (const cardId of ["the-lovers", "the-chariot", "strength"]) {
      expect(files.approvals.records[cardId]).toMatchObject({
        batchReviewGateId: gate.id,
        generationRecordId: null,
        provenance: "legacy-v2",
        status: "approved",
      });
    }
    expect(files.approvals.records["wheel-of-fortune"]).toMatchObject({
      batchReviewGateId: gate.id,
      generationRecordId: "wheel-of-fortune-attempt-005",
      provenance: "generated-v3",
    });
    expect(() => validateCardArtV3System(files, repositoryRoot)).not.toThrow();

    const mutations = [
      (copy) => {
        copy.batchReviewGates.entries = copy.batchReviewGates.entries.filter(
          ({ id }) => id !== gate.id,
        );
      },
      (copy) => {
        copy.batchReviewGates.entries.find(
          ({ id }) => id === gate.id,
        ).reviewEvidence.attemptIds[1] = "the-fool-retouch-001";
      },
      (copy) => {
        copy.approvals.records["the-lovers"].generationRecordId =
          "the-fool-retouch-001";
      },
      (copy) => {
        delete copy.approvals.records["the-fool"].batchReviewGateBoundAt;
      },
      (copy) => {
        copy.batchReviewGates.entries
          .find(({ id }) => id === gate.id)
          .reviewEvidence.cardIds.push("the-hermit");
      },
    ];
    for (const mutate of mutations) {
      const copy = structuredClone(files);
      mutate(copy);
      expect(() => validateCardArtV3System(copy, repositoryRoot, null)).toThrow(
        /validation failed/i,
      );
    }
  }, 30_000);

  it("locks the reviewed five-card Major replacement batch atomically", () => {
    const files = loadCardArtV3Files(repositoryRoot);
    const gate = files.batchReviewGates.entries.find(
      ({ id }) => id === "major-replacements-review-001",
    );

    expect(gate).toMatchObject({
      batchId: "major-replacements",
      decisionFingerprintSha256:
        "06473bc4289b767b2b0a7dbf5d6651de4417a6f1689d5d66fdb7c8e3913dc230",
      result: "approved",
      status: "passed",
    });
    expect(gate.reviewEvidence.cardIds).toEqual([
      "the-magician",
      "the-high-priestess",
      "the-empress",
      "the-emperor",
      "the-star",
    ]);
    expect(gate.reviewEvidence.attemptIds).toEqual([
      "the-magician-attempt-002",
      "the-high-priestess-attempt-002",
      "the-empress-attempt-001",
      "the-emperor-attempt-002",
      "the-star-attempt-003",
    ]);
    expect(gate.decisionFingerprintSha256).toBe(
      sha256StableForTest(batchReviewGateDecisionPayload(gate)),
    );
    for (const cardId of gate.reviewEvidence.cardIds) {
      expect(files.approvals.records[cardId]).toMatchObject({
        batchReviewGateId: gate.id,
        generationRecordId:
          gate.reviewEvidence.attemptIds[
            gate.reviewEvidence.cardIds.indexOf(cardId)
          ],
        status: "approved",
      });
    }
    expect(() => validateCardArtV3System(files, repositoryRoot)).not.toThrow();

    const mutations = [
      (copy) => {
        copy.batchReviewGates.entries = copy.batchReviewGates.entries.filter(
          ({ id }) => id !== gate.id,
        );
      },
      (copy) => {
        delete copy.approvals.records["the-star"].batchReviewGateId;
      },
      (copy) => {
        copy.batchReviewGates.entries.find(
          ({ id }) => id === gate.id,
        ).reviewEvidence.attemptIds[4] = "the-star-attempt-002";
      },
      (copy) => {
        copy.batchReviewGates.entries.find(
          ({ id }) => id === gate.id,
        ).reviewEvidence.assetSha256["the-empress"] = "0".repeat(64);
      },
      (copy) => {
        const forged = copy.batchReviewGates.entries.find(
          ({ id }) => id === gate.id,
        );
        forged.independentReviews[2].scope += " drift";
        forged.decisionFingerprintSha256 = sha256StableForTest(
          batchReviewGateDecisionPayload(forged),
        );
      },
    ];
    for (const mutate of mutations) {
      const copy = structuredClone(files);
      mutate(copy);
      expect(() => validateCardArtV3System(copy, repositoryRoot, null)).toThrow(
        /validation failed/i,
      );
    }
  }, 30_000);

  it("uses newly approved v3 Major references without rewriting historical inputs", () => {
    const files = loadCardArtV3Files(repositoryRoot);
    const current = getCardArtV3PromptAuditRecord(
      files,
      "the-magician",
      repositoryRoot,
    );
    const historical = files.generationRecords.records.find(
      ({ id }) => id === "wheel-of-fortune-attempt-002",
    );

    expect(current.referenceSha256["wheel-of-fortune"]).toBe(
      files.approvals.records["wheel-of-fortune"].assetSha256,
    );
    expect(current.referenced_image_paths).toContain(
      resolve(repositoryRoot, "public/cards/v3/wheel-of-fortune.jpg"),
    );
    expect(historical.referenceSha256["wheel-of-fortune"]).toBe(
      files.manifest.legacySources.find(({ id }) => id === "wheel-of-fortune")
        .sha256,
    );
    expect(() => validateCardArtV3System(files, repositoryRoot)).not.toThrow();

    const rewrittenHistory = structuredClone(files);
    rewrittenHistory.generationRecords.records.find(
      ({ id }) => id === historical.id,
    ).referenceSha256["wheel-of-fortune"] =
      files.approvals.records["wheel-of-fortune"].assetSha256;
    expect(() =>
      validateCardArtV3System(rewrittenHistory, repositoryRoot, null),
    ).toThrow(/actual frozen generation inputs/i);
  }, 30_000);

  it("renders two-to-eight-card review sheets with a count-bound deterministic recipe", async () => {
    const sourcePaths = [
      "the-fool",
      "the-lovers",
      "the-chariot",
      "strength",
      "wheel-of-fortune",
    ].map((cardId) => resolve(repositoryRoot, `public/cards/${cardId}.jpg`));
    const recipe = getCardArtV3BatchContactSheetRecipe(sourcePaths.length);
    const rendered = await renderCardArtV3BatchContactSheet({ sourcePaths });

    expect(recipe).toMatchObject({
      id: "batch-contact-sheet-v1",
      sourceCount: 5,
      columns: 3,
      rows: 2,
    });
    expect(rendered).toMatchObject({
      recipe,
      recipeFingerprintSha256:
        "d6ddee0961f4ff2ad522b03ba78fa0a2efa5cc2a315ec285dbbd121a0aad1ab6",
      full: {
        bytes: 246986,
        sha256:
          "586765a22451d56fc98f837535ce4dfbd7089c831bdc05ca90136e3fbf0fb8c4",
      },
      mobile: {
        bytes: 76912,
        sha256:
          "8ca70ab1be4a89de400732af4f68eb72ab00a3750f043b9ada6eb16406b29934",
      },
    });
    expect(() => getCardArtV3BatchContactSheetRecipe(1)).toThrow(
      /two to eight/i,
    );
    expect(() => getCardArtV3BatchContactSheetRecipe(9)).toThrow(
      /two to eight/i,
    );
  });

  it("rejects neutral-output drift and simultaneous selected/rejected branches", async () => {
    const neutralPath = resolve(
      repositoryRoot,
      "art/card-art-v3-candidates/cups-page-attempt-004.raw.png",
    );
    const rejectedPath = resolve(
      repositoryRoot,
      "art/card-art-v3-raw/court-validation-a/cups-page-candidate-004-rejected.png",
    );
    const neutralBytes = await readFile(neutralPath);
    temporaryFileRestorations.push({
      contents: neutralBytes,
      path: neutralPath,
    });
    const drifted = Buffer.from(neutralBytes);
    drifted[drifted.length - 1] ^= 1;
    await writeFile(neutralPath, drifted);
    expect(() =>
      validateCardArtV3System(
        loadCardArtV3Files(repositoryRoot),
        repositoryRoot,
      ),
    ).toThrow(/neutral raw outputs|reproduce the authorized neutral output/i);
    await writeFile(neutralPath, neutralBytes);
    temporaryFileRestorations.pop();

    const selectedBytes = await readFile(
      resolve(
        repositoryRoot,
        "art/card-art-v3-raw/court-validation-a/cups-page-candidate-004.png",
      ),
    );
    temporaryFiles.push(rejectedPath);
    await writeFile(rejectedPath, selectedBytes, { flag: "wx" });
    expect(() =>
      validateCardArtV3System(
        loadCardArtV3Files(repositoryRoot),
        repositoryRoot,
      ),
    ).toThrow(/exactly one selected canonical output branch/i);
  }, 30_000);

  it("makes prompt changes visible in the prompt fingerprint", () => {
    const files = loadCardArtV3Files(repositoryRoot);
    const original = buildCardArtV3Prompt(files.manifest, "cups-5");
    const changed = structuredClone(files.manifest);
    changed.cards["cups-5"].gesture += " Changed.";

    expect(buildCardArtV3Prompt(changed, "cups-5")).not.toBe(original);
  });

  it("binds every generation record to the exact resolved reference map", async () => {
    const files = loadAuditCardArtV3Files();
    const promptRecord = getCardArtV3PromptAuditRecord(
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
    const files = asPlanningSnapshot(loadCardArtV3Files(repositoryRoot));

    const brokenChain = structuredClone(files);
    const secondAttempt = brokenChain.generationRecords.records.find(
      ({ id }) => id === "wands-10-attempt-002",
    );
    secondAttempt.previousAttemptId = "wands-10-attempt-999";
    expect(() => validateCardArtV3System(brokenChain, repositoryRoot)).toThrow(
      /immediately preceding rejected or independently superseded selected attempt/i,
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
      validateCardArtV3System(editSourceAtReview, repositoryRoot),
    ).toThrow(/edit source/i);
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
