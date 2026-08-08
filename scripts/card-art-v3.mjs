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
import { cardArtV3CourtContactSheetRecipe } from "./card-art-v3-contact-sheet.mjs";
import { getCardArtV3BatchContactSheetRecipe } from "./card-art-v3-batch-contact-sheet.mjs";
import { cardArtV3DeckContactSheetRecipe } from "./card-art-v3-deck-contact-sheet.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = resolve(scriptDirectory, "..");
const fileNames = Object.freeze({
  approvals: "art/card-art-v3-approvals.json",
  batchReviewGates: "art/card-art-v3-batch-review-gates.json",
  controlRegistry: "art/card-art-v3-control-registry.json",
  generationRecords: "art/card-art-v3-generation-records.json",
  legacyAudit: "art/card-art-v3-legacy-audit.json",
  legacyReviewCorrections: "art/card-art-v3-legacy-review-corrections.json",
  manifest: "art/card-art-v3-manifest.json",
  repairAuthorizations: "art/card-art-v3-repair-authorizations.json",
  replacementGates: "art/card-art-v3-replacement-gates.json",
  releaseHistory: "art/card-art-v3-release-history.json",
  styleHistory: "art/card-art-v3-style-history.json",
  supersessions: "art/card-art-v3-supersessions.json",
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
const sequentialProductionBatchIds = Object.freeze([
  "major-new-a",
  "major-new-b",
  "wands-a",
  "wands-b",
  "cups-a",
  "cups-b",
  "swords-a",
  "swords-b",
  "pentacles-a",
  "pentacles-b",
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
const courtRankIds = new Set(["page", "knight", "queen", "king"]);
const postPilotReferenceInstructions = Object.freeze({
  common:
    "Reference 1 is authoritative only for suit-object geometry and material, suit palette, and global ink-and-gouache rendering. Never copy its source count, rank, cast, identity, pose, action, movement, setting, lighting layout or composition; the target card manifest is authoritative for all of them.",
  numbered:
    "Reference 2 demonstrates multi-object separation, density and thumbnail legibility only. Never copy its source count, count arrangement, grid, table, group composition, cast, identity, pose, action, setting, lighting layout or incidental objects. The target card's rank rule and exact count lock exclusively control its object count and arrangement.",
  court:
    "Reference 2 demonstrates natural anatomy, rendering and observable court-action legibility grammar only. Never copy the source rank, action, pose, movement, setting, garment or garment color. The target card's rank rule exclusively controls rank identity and action. When cast IDs match, identity means stable face, hair, skin and body traits only; it never includes the source garment, color, pose, action or setting.",
});
const reviewedPostPilotReferencePairs = Object.freeze({
  numbered: Object.freeze({
    wands: Object.freeze(["wands-ace", "wands-5"]),
    cups: Object.freeze(["cups-ace", "cups-10"]),
    swords: Object.freeze(["swords-ace", "swords-5"]),
    pentacles: Object.freeze(["pentacles-ace", "pentacles-10"]),
  }),
  court: Object.freeze({
    wands: Object.freeze(["wands-ace", "wands-page"]),
    cups: Object.freeze(["cups-ace", "cups-knight"]),
    swords: Object.freeze(["swords-ace", "swords-queen"]),
    pentacles: Object.freeze(["pentacles-ace", "pentacles-king"]),
  }),
});
const pilotContactSheetRecipe = Object.freeze({
  tool: "sharp",
  toolVersion: "0.34.5",
  background: "#e8ddc6",
  columns: 4,
  rows: 4,
  order: "pilotIds row-major",
  tileJpegQuality: 90,
  outputJpegQuality: 92,
  full: Object.freeze({
    width: 890,
    height: 1246,
    tileWidth: 210,
    tileHeight: 294,
    margin: 10,
    columnPitch: 220,
    rowPitch: 304,
  }),
  mobile: Object.freeze({
    width: 590,
    height: 826,
    tileWidth: 140,
    tileHeight: 196,
    margin: 10,
    columnPitch: 145,
    rowPitch: 201,
  }),
});
const reviewedPilotContactSheetContract = Object.freeze({
  assetMapSha256:
    "02da3f5bbe5d8c9c637b2e5723cdda1074afbfc1941544a134a3d8527fbe6e14",
  recipeFingerprintSha256:
    "dad6d6a7d412c2eddc2cff739ca23b392e92352f1e92da553202fe8210d88f7c",
  full: Object.freeze({
    artifactPath: "art/card-art-v3-reviews/pilot-contact-sheet-v1.jpg",
    artifactSha256:
      "55517bc20c86b5405e10de4e2ca42b7c10a2fe6a562df4159ea8abd09d56be9c",
    height: 1246,
    width: 890,
  }),
  mobile: Object.freeze({
    artifactPath: "art/card-art-v3-reviews/pilot-contact-sheet-mobile-v1.jpg",
    artifactSha256:
      "2358327b9c2c1962b9c16ac0311cc3b356121c993248ec69f88a73d6699c0c09",
    height: 826,
    width: 590,
  }),
});
const reviewedSupersessionContracts = Object.freeze({
  "cups-page-attempt-002-batch-supersession-001": Object.freeze({
    decisionFingerprintSha256:
      "32fc34421f00fd315afa34826f209acb339d9da15f0c969510f56b8ca1870682",
    reviewerIds: Object.freeze([
      "tarot-content-review",
      "ux-test-review",
      "final-plan-review",
    ]),
    authorizations: Object.freeze({
      "cups-page-attempt-003": Object.freeze({
        attemptNumber: 3,
        previousAttemptId: "cups-page-attempt-002",
        retryArtifactPath:
          "art/card-art-v3-retry-constraints/cups-page-attempt-003.json",
        retryArtifactSha256:
          "a0fea152f15ae076c5ec3d94f7989ee285bacc8f00bf5bf4c39c92ca2c374536",
        editSource: Object.freeze({
          attemptId: "cups-page-attempt-002",
          path: "art/card-art-v3-raw/court-validation-a/cups-page-candidate-002.png",
          sha256:
            "f492c38bf14b754de6cefe865dca0a191fded8bb7c36567344185be47beb71f5",
        }),
      }),
    }),
  }),
  "wands-3-attempt-001-batch-supersession-001": Object.freeze({
    decisionFingerprintSha256:
      "6d97ca3229da523913d9b0329cd2f5a65272b1668d9a978e0ff81ef39a61ed70",
    reviewerIds: Object.freeze([
      "tarot-content-review",
      "ux-test-review",
      "final-plan-review",
    ]),
    authorizations: Object.freeze({
      "wands-3-attempt-002": Object.freeze({
        attemptNumber: 2,
        previousAttemptId: "wands-3-attempt-001",
        retryArtifactPath:
          "art/card-art-v3-retry-constraints/wands-3-attempt-002.json",
        retryArtifactSha256:
          "9406f1f153c8a026fab1a0ebd480239d6f0d7b3bcf62e9e9df2632a656a58dff",
        editSource: Object.freeze({
          attemptId: "wands-3-attempt-001",
          path: "art/card-art-v3-raw/wands-a/wands-3-candidate-001.png",
          sha256:
            "35d22adc07fb6b779c779598563ca3e9930c2c74fb49051ca6f63f13cf30f7cd",
        }),
      }),
      "wands-3-attempt-003": Object.freeze({
        attemptNumber: 3,
        previousAttemptId: "wands-3-attempt-002",
        retryArtifactPath:
          "art/card-art-v3-retry-constraints/wands-3-attempt-003.json",
        retryArtifactSha256:
          "0b0eceabeb2672066d7c10db8222eb76d201748a015f09e6f952280acb572ff6",
        editSource: Object.freeze({
          attemptId: "wands-3-attempt-002",
          path: "art/card-art-v3-raw/wands-a/wands-3-candidate-002-rejected.png",
          sha256:
            "24898ee7e63df6542c277d5bbc83fffef5a4a78c229a83301211c13babbd226e",
        }),
      }),
      "wands-3-attempt-004": Object.freeze({
        attemptNumber: 4,
        previousAttemptId: "wands-3-attempt-003",
        retryArtifactPath:
          "art/card-art-v3-retry-constraints/wands-3-attempt-004.json",
        retryArtifactSha256:
          "cfb3ae6bcf1f0f411eb3be77cfd1f3350c579794135d0dee5966e6fef8b278e4",
        editSource: Object.freeze({
          attemptId: "wands-3-attempt-003",
          path: "art/card-art-v3-raw/wands-a/wands-3-candidate-003-rejected.png",
          sha256:
            "5b77aaf0fc3eafb2e869a54a65b85a2f7b1375844aff81fa43021192447a5458",
        }),
      }),
      "wands-3-attempt-005": Object.freeze({
        attemptNumber: 5,
        previousAttemptId: "wands-3-attempt-004",
        retryArtifactPath:
          "art/card-art-v3-retry-constraints/wands-3-attempt-005.json",
        retryArtifactSha256:
          "8dc924eb63b9d7eaf97297a16ee2b94d627b5da88b0a1851099d3ab1fd777478",
        editSource: Object.freeze({
          attemptId: "wands-3-attempt-004",
          path: "art/card-art-v3-raw/wands-a/wands-3-candidate-004-rejected.png",
          sha256:
            "2fa0c008bcdbde2fe98e2a40c89b2facb4902020f8095a6f1d579e7ef3d790a8",
        }),
      }),
      "wands-3-attempt-006": Object.freeze({
        attemptNumber: 6,
        previousAttemptId: "wands-3-attempt-005",
        retryArtifactPath:
          "art/card-art-v3-retry-constraints/wands-3-attempt-006.json",
        retryArtifactSha256:
          "16cba11a4dbd8dcee428d9bc63786cff0a288430aee7dfd5091833f44306d94d",
        editSource: null,
      }),
    }),
  }),
});
const reviewedReplacementGateContracts = Object.freeze({
  "court-validation-a-cups-page-replacement-002":
    "8f3be269b77e192210ee74d6ab25ed8941a430629843ba5aae31610169343eff",
  "wands-a-wands-3-replacement-001":
    "ba4a6561ba9d762a06552e10649ff1b7e606f0ec88bfccb9359b9fc692ef088a",
});
const reviewedBatchGateContracts = Object.freeze({
  "court-validation-b-review-001": Object.freeze({
    batchId: "court-validation-b",
    decisionFingerprintSha256:
      "cec1850d348cec411d54d8b72139d5ab3225ad71077fe90fc3a4e43ab6c46539",
    fullReviewPath:
      "art/card-art-v3-reviews/court-validation-b-contact-sheet-v7.jpg",
    mobileReviewPath:
      "art/card-art-v3-reviews/court-validation-b-contact-sheet-mobile-v7.jpg",
    reviewerIds: Object.freeze([
      "tarot-content-review",
      "ux-test-review",
      "final-plan-review",
    ]),
  }),
  "legacy-keep-review-001": Object.freeze({
    batchId: "legacy-keep",
    cardIds: Object.freeze([
      "the-fool",
      "the-lovers",
      "the-chariot",
      "strength",
      "wheel-of-fortune",
    ]),
    legacyReuseCardIds: Object.freeze([
      "the-lovers",
      "the-chariot",
      "strength",
    ]),
    decisionFingerprintSha256:
      "b97da1410675002298bbf351d315258c4aafd1d990d8c24bc1c6e502002d935f",
    fullReviewPath:
      "art/card-art-v3-reviews/legacy-keep-final-contact-sheet-v1.jpg",
    mobileReviewPath:
      "art/card-art-v3-reviews/legacy-keep-final-contact-sheet-mobile-v1.jpg",
    reviewerIds: Object.freeze([
      "tarot-content-review",
      "ux-test-review",
      "final-plan-review",
    ]),
  }),
  "major-replacements-review-001": Object.freeze({
    batchId: "major-replacements",
    decisionFingerprintSha256:
      "06473bc4289b767b2b0a7dbf5d6651de4417a6f1689d5d66fdb7c8e3913dc230",
    fullReviewPath:
      "art/card-art-v3-reviews/major-replacements-contact-sheet-v3.jpg",
    mobileReviewPath:
      "art/card-art-v3-reviews/major-replacements-contact-sheet-mobile-v3.jpg",
    reviewerIds: Object.freeze([
      "tarot-content-review",
      "ux-test-review",
      "final-plan-review",
    ]),
  }),
  "major-new-a-review-001": Object.freeze({
    batchId: "major-new-a",
    decisionFingerprintSha256:
      "f103a0d358547ce35a030a418c517ac4670132479cea1c25d5fa831b6ca46898",
    fullReviewPath: "art/card-art-v3-reviews/major-new-a-contact-sheet-v3.jpg",
    mobileReviewPath:
      "art/card-art-v3-reviews/major-new-a-contact-sheet-mobile-v3.jpg",
    reviewerIds: Object.freeze([
      "tarot-content-review",
      "ux-test-review",
      "final-plan-review",
    ]),
  }),
  "major-new-b-review-001": Object.freeze({
    batchId: "major-new-b",
    decisionFingerprintSha256:
      "d39a84b714454bc1f2087033077cca99d8ae7afa94ed8c6afda376765c3ad4a9",
    fullReviewPath: "art/card-art-v3-reviews/major-new-b-contact-sheet-v1.jpg",
    mobileReviewPath:
      "art/card-art-v3-reviews/major-new-b-contact-sheet-mobile-v1.jpg",
    reviewerIds: Object.freeze([
      "tarot-content-review",
      "ux-test-review",
      "final-plan-review",
    ]),
  }),
  "wands-a-review-001": Object.freeze({
    batchId: "wands-a",
    decisionFingerprintSha256:
      "4a6b2eb4c9455ee3123bb211c5aa41c36364b7f8c3a9ea4168b6915e35244012",
    fullReviewPath: "art/card-art-v3-reviews/wands-a-contact-sheet-v2.jpg",
    mobileReviewPath:
      "art/card-art-v3-reviews/wands-a-contact-sheet-mobile-v2.jpg",
    reviewerIds: Object.freeze([
      "tarot-content-review",
      "ux-test-review",
      "final-plan-review",
    ]),
  }),
  "wands-b-review-001": Object.freeze({
    batchId: "wands-b",
    cardIds: Object.freeze(["wands-8", "wands-9"]),
    decisionFingerprintSha256:
      "cee88a886533d106c28e01bcb19cba9ef697f65f8ae1488428a5ab0eec6ad944",
    fullReviewPath: "art/card-art-v3-reviews/wands-b-contact-sheet-v1.jpg",
    mobileReviewPath:
      "art/card-art-v3-reviews/wands-b-contact-sheet-mobile-v1.jpg",
    reviewerIds: Object.freeze([
      "tarot-content-review",
      "ux-test-review",
      "final-plan-review",
    ]),
  }),
  "cups-a-review-001": Object.freeze({
    batchId: "cups-a",
    cardIds: Object.freeze(["cups-2", "cups-3", "cups-4", "cups-6", "cups-7"]),
    decisionFingerprintSha256:
      "9f5699e5c7855d44ad14b776b1952fe464fa11291141ae5fba436923c449b6c6",
    fullReviewPath: "art/card-art-v3-reviews/cups-a-contact-sheet-v1.jpg",
    mobileReviewPath:
      "art/card-art-v3-reviews/cups-a-contact-sheet-mobile-v1.jpg",
    reviewerIds: Object.freeze([
      "tarot-content-review",
      "ux-test-review",
      "final-plan-review",
    ]),
  }),
  "cups-b-review-001": Object.freeze({
    batchId: "cups-b",
    cardIds: Object.freeze(["cups-8", "cups-9"]),
    decisionFingerprintSha256:
      "27eb62e75e2b1988807e64cbec35e3a5fdfb07c4a3fda6d95b4e566c719e5ac4",
    fullReviewPath: "art/card-art-v3-reviews/cups-b-contact-sheet-v1.jpg",
    mobileReviewPath:
      "art/card-art-v3-reviews/cups-b-contact-sheet-mobile-v1.jpg",
    reviewerIds: Object.freeze([
      "tarot-content-review",
      "ux-test-review",
      "final-plan-review",
    ]),
  }),
  "swords-a-review-001": Object.freeze({
    batchId: "swords-a",
    cardIds: Object.freeze([
      "swords-2",
      "swords-3",
      "swords-4",
      "swords-6",
      "swords-7",
    ]),
    decisionFingerprintSha256:
      "a8f3a25970da3fdae6d134a5ab67a36a12f9ecadfdb6bbd281b5f032059306b6",
    fullReviewPath: "art/card-art-v3-reviews/swords-a-contact-sheet-v1.jpg",
    mobileReviewPath:
      "art/card-art-v3-reviews/swords-a-contact-sheet-mobile-v1.jpg",
    reviewerIds: Object.freeze([
      "tarot-content-review",
      "ux-test-review",
      "final-plan-review",
    ]),
  }),
  "swords-b-review-001": Object.freeze({
    batchId: "swords-b",
    cardIds: Object.freeze(["swords-8", "swords-9"]),
    decisionFingerprintSha256:
      "00a1b0f8582309d88359016672736121dfde8c8a443009ee5915297853818a96",
    fullReviewPath: "art/card-art-v3-reviews/swords-b-contact-sheet-v1.jpg",
    mobileReviewPath:
      "art/card-art-v3-reviews/swords-b-contact-sheet-mobile-v1.jpg",
    reviewerIds: Object.freeze([
      "tarot-content-review",
      "ux-test-review",
      "final-plan-review",
    ]),
  }),
  "pentacles-a-review-001": Object.freeze({
    batchId: "pentacles-a",
    cardIds: Object.freeze([
      "pentacles-2",
      "pentacles-3",
      "pentacles-4",
      "pentacles-6",
      "pentacles-7",
    ]),
    decisionFingerprintSha256:
      "357611b38820ba2e688acee01c29bcb65b2fc0f2581affbde2ca203bdd73f8bb",
    fullReviewPath: "art/card-art-v3-reviews/pentacles-a-contact-sheet-v1.jpg",
    mobileReviewPath:
      "art/card-art-v3-reviews/pentacles-a-contact-sheet-mobile-v1.jpg",
    reviewerIds: Object.freeze([
      "tarot-content-review",
      "ux-test-review",
      "final-plan-review",
    ]),
  }),
  "pentacles-b-review-001": Object.freeze({
    batchId: "pentacles-b",
    cardIds: Object.freeze(["pentacles-8", "pentacles-9"]),
    decisionFingerprintSha256:
      "2408766a5a6d2b6a8be28fd1cd2e3849e0d6a51672249c84bdf5c6a5f31ee437",
    fullReviewPath: "art/card-art-v3-reviews/pentacles-b-contact-sheet-v1.jpg",
    mobileReviewPath:
      "art/card-art-v3-reviews/pentacles-b-contact-sheet-mobile-v1.jpg",
    reviewerIds: Object.freeze([
      "tarot-content-review",
      "ux-test-review",
      "final-plan-review",
    ]),
  }),
});
const reviewedLegacyCorrectionContracts = Object.freeze({
  "legacy-source-review-correction-001": Object.freeze({
    decisionFingerprintSha256:
      "24dafe26da55e5dd750a6c0d70f7e43bc63f580807bc0f89842e8edf8c699ed5",
    decisions: Object.freeze({
      "the-fool": "retouch",
      "the-lovers": "keep",
      "the-chariot": "keep",
      strength: "keep",
      "wheel-of-fortune": "replace",
    }),
    fullReviewPath: "art/card-art-v3-reviews/legacy-keep-contact-sheet-v1.jpg",
    mobileReviewPath:
      "art/card-art-v3-reviews/legacy-keep-contact-sheet-mobile-v1.jpg",
    reviewerIds: Object.freeze([
      "tarot-content-review",
      "ux-test-review",
      "final-plan-review",
    ]),
    reviewerResults: Object.freeze(["approved", "rejected", "approved"]),
  }),
});
const reviewedCorrectedLegacyRetouchContracts = Object.freeze({
  "the-fool": Object.freeze({
    generationRecordId: "the-fool-retouch-001",
    generator: Object.freeze({
      mode: "deterministic-local-restoration",
      tool: "Sharp",
      toolVersion: "0.34.5",
    }),
    maskPath:
      "art/card-art-v3-controls/the-fool-local-restoration-mask-001.png",
    maskSha256:
      "8c920eb6fdacf5b1adb438eed486e59cb75f6735dcb70fb3a9d8344e8d9e4b96",
    rawOutputPath:
      "art/card-art-v3-raw/legacy-retouch/the-fool-candidate-001.png",
    rawOutputSha256:
      "337e97f420d51f2ebf852acdd0c839fc6ec171b7a345b1bc75cbfdd0c39c3a28",
    recipeDefinitionSha256:
      "edc0e8367eb6e8e32970ed15dea3a9dce0043ce683e5608638efcfff965fe390",
    scriptPath: "scripts/card-art-v3-fool-repair.mjs",
    scriptSha256:
      "dff111ed412939266a404af18231e34fe26460c84d88471a45adbfeaca2866e6",
    sourcePath: "public/cards/the-fool.jpg",
    sourceSha256:
      "98c44ed92620968fef950f40b3b33c634f6dac5762de02c267eccf6edbdd78f8",
    changedInside: 2511,
    changedOutside: 0,
  }),
});
const reviewedCardPromptLocks = Object.freeze({
  "the-magician":
    "This reviewed lock replaces the Observable scene's ambiguous four-tool wording. The maker stands behind a sparse worktable, raising the sole brass wand in one hand while the other points down toward the remaining three separated suit tools: exactly one cup, one sword and one pentacle. Exactly four suit objects total, all fully visible, unoccluded and distinct at 140×196; no second rod, wand, vessel, blade, coin, disk, plate or tool. Show one plain physical ribbon infinity loop, never text or a floating glyph. Keep the maker, raised hand and downward hand central, with hierarchy maker > gesture > sparse table. Add no second person, bird, sun disk, traveler, giant wheel, water channel or four-way crossing.",
  "the-high-priestess":
    "Show exactly one seated person and exactly two full columns, one dark and one pale, with the veil behind them. Keep both natural five-digit hands and one featureless closed book visible centrally at 140×196; no third column and no book clasp, line, seal, letter, numeral or mark. The only crescent sits at the figure's feet. Add no lantern, staff, solitary path, observatory dome, vessel, pouring action, water channel, large sky moon or star field.",
  "the-empress":
    "Show exactly twelve and only twelve separated small antique-gold star ornaments in one countable canopy arc at 140×196, visually distinct from flowers and fruit; no other star or star-like ornament. The welcoming gardener is largest, one pomegranate branch is second, and exactly two smaller arriving neighbors share exactly one gathered wheat bundle. Use one discreet non-round Venus-marked shield. Add no crowd, basket, disk, paired meeting pose, bird, sun disk, lion, bandage or stone gate.",
  "the-emperor":
    "This reviewed lock replaces the Supporting symbol's word measured; the charter is not measured or marked. Show exactly one plain blank unmarked rectangular civic charter with no line, grid, diagram, border, seal, letter, numeral, pseudo-writing or decorative mark. Show exactly one compact staff of office, not a walking staff or wand; no other pole. Keep the elder and staff hand central at 140×196, with hierarchy square stone overlook > elder steward > charter. Add no lantern, observatory dome, Hermit-style narrow solitary footpath, giant wheel, water channel, four-way crossing, model or workbench; preserve one broad stable civic mountain road.",
  "the-star":
    "Show exactly eight stars total: one large eight-point star and seven smaller stars, all fully inside the frame and separately countable at 140×196; no other star, dot-light or star-like ornament. Show exactly two vessels total, one in each visible natural five-digit hand, pouring two simultaneous noncrossing streams that end separately in the pool and bare ground; never vessel-to-vessel, merged or exchanged, and no third cup or bowl. Keep hierarchy large star > figure and both vessels > two stream destinations. Add no lantern, staff, path, observatory, building or large moon.",
  "the-hierophant":
    "Use a medium-wide three-quarter side view. Show exactly three people total: one standing elder teacher, largest and central, and exactly two seated learners at visibly different heights and postures. Show exactly two large full crossed keys on one plain low cloth or step, and exactly one shared open book beside but not overlapping the keys, with completely blank featureless pages; no other key, book, paper, document, line, border, seal, letter, numeral, pseudo-writing or decorative mark. Keep the natural teaching hand, teacher, both learners, both keys and book separated and readable at 140×196, with hierarchy teacher > keys and teaching gesture > learners > book. Add no workbench, model, hammer, lantern, staff, solitary path, observatory dome, bird, large sun, wheel, water channel, four-way crossing, throne, worship pose or religious logo.",
  justice:
    "Show exactly one seated adjudicator, exactly one level balance scale with exactly two equal empty pans, exactly one straight upright sword and exactly one plain blank decision sheet. Both natural five-digit hands, the scales and the full sword must remain distinct at 140×196. The sheet has no line, border, grid, seal, letter, numeral, pseudo-writing or decorative mark. Add no second person, no additional blade beyond the required single sword, no second scales apparatus, no third pan, and no weight, coin, key, bird, large sun, giant wheel, traveler, road, path, water channel or four-way crossing.",
  "the-hanged-man":
    "Create a family-friendly contemplative aerial-yoga scene. Show exactly one medium-size full-body adult in a calm controlled inversion on one low living garden acrobatics frame formed by two rooted leafy uprights and one leafy crossbar. Exactly one ankle is comfortably supported inside one broad soft woven-cloth aerial sling attached to the crossbar; every other part of the body moves freely. Keep both relaxed open natural five-digit hands separated from each other and the head, the free leg visibly bent at the knee and separated from the supported leg, the serene face clear, and the head comfortably above a deep cushion of moss at 140×196. Use only diffuse dawn backlight behind the head, never a literal halo, sun disk, star or glyph. The equipment is visibly stable and recreational. Add no second sling, person, animal, dog, bird, lion, path, water, satchel, cliff, bandage, infinity vine or gate.",
  death:
    "Show exactly one living armored human rider on exactly one calm pale horse in a side-profile walking pose. One visible natural hand holds the reins and the other holds exactly one lowered black banner on exactly one pole; keep both hands separate and clear. The fully visible banner carries exactly one plain white rose and no other heraldry, line, letter, numeral, pseudo-writing or mark, and it covers neither face nor horse. Show exactly one fully sealed old gate with no opening or route through it, exactly two distant pillars and diffuse dawn light between them without a sun disk. Keep hierarchy horse, rider and banner > sealed gate > two pillars and dawn at 140×196. Add no other person, horse, animal, flag, pole, additional flower emblem, chariot, cart, wheel, skull, skeleton, bone, corpse, grave, lantern, staff, path, observatory dome, star field, water, weapon attack, text or any symbol beyond the required single plain white rose.",
  "the-devil":
    "Show exactly two living clothed adults and exactly one inanimate horned stone statue with unlit stone eyes and no carved mark. Show exactly two bright thick loose cords total, one oversized slack open removable loop around each adult's clothed torso; each loop is larger than a hand and each adult visibly lifts their own cord away with one visible natural five-digit hand. No cord wraps around, restrains or tightens a neck, collar, wrist, hand, ankle or limb; contact with the lifting hand is allowed only at the visible grasp, and no knot or lock blocks removal. Keep hierarchy the pair and both open self-release loops > background statue > daylight threshold, with both actions and slack readable at 140×196. Add no third person, animal, extra cord, rope, chain, cuff, shackle, collar, cage, flame, wing, living demon, pentagram, inverted star, rune, glyph, text, giant wheel, four-way crossing, water, bird, large sun, lion or flowering infinity vine.",
  "the-tower":
    "Use a medium-wide oblique view with exactly one tall stone watchtower offset in the upper-left, exactly one branching lightning strike, and exactly three fully clothed living adults already standing together at a clearly safe lower-right foreground distance. The tower's stable lower body remains upright while only one visibly newer false upper addition splits and sheds a small number of empty masonry pieces into an unoccupied cordoned fall zone behind the people. Keep a broad unobstructed ground route leading the three separated adults out through the bottom-right, with hierarchy struck false crown > complete tower > safe group and exit route at 140×196. Every person stays grounded, intact and outside the falling-stone zone. Add no second tower, falling or trapped person, injury, flame, smoke inferno, flood, weapon, animal, giant wheel, four-way crossing, sun, moon, star, sign, banner, letter, numeral, mark or disaster spectacle.",
  "the-moon":
    "Show exactly one fully clothed young traveler paused on exactly one continuous winding night road, exactly two full boundary towers, exactly one calm domestic dog on one side and exactly one alert wild wolf on the other. Show exactly one large veiled moon total, fully inside the frame, with no face, text or glyph; add no star or other moon-like disk. Place dog and wolf in opposite lower foreground thirds, fully visible with background gaps; preserve distinct ear, muzzle, tail and four-leg silhouettes, with the road open between them. Neither animal attacks, snarls, merges with the road nor hides the traveler. At 140×196 preserve hierarchy moon > uncertain road and traveler > paired towers > dog and wolf. Add no second person, third animal, observatory, lantern, staff, giant wheel, water channel, four-way crossing, confident forward stride, horror eyes, letter, numeral, pseudo-writing or floating symbol.",
  "the-sun":
    "Show exactly two fully clothed children running together in one open sunflower courtyard and exactly one fully clothed adult watching from a clearly separate respectful background position. Show exactly one immense clear sun disk total, fully inside the frame and visually distinct from the flowers; no other sun, star, halo or circular sky ornament. Arrange the two children side-by-side without body overlap across the central lower half. Show exactly four complete arms ending in four natural five-digit hands and four complete running legs and feet, separated by visible background gaps, with at least one grounded foot per child at 140×196. Keep the distant adult small and not directly behind either child; keep ordinary sunflowers at the side edges so they never resemble extra sun disks. Use one low open garden wall. Keep hierarchy single sun > two running children > open wall and distant adult. Add no fourth person, horse, animal, nudity, banner, sign, letter, numeral, pseudo-writing, floating glyph, wheel, road junction or harsh glare that erases faces or hands.",
  judgement:
    "Use a medium-wide eye-level view of exactly four fully clothed living adults rising from seated rest together in one open civic square and turning toward exactly one large high bronze bell. Place the bell and its one plain sturdy frame alone in the upper third; it is the sole bell or horn-like sound object, with a visible swing and no supernatural figure. Arrange the four adults as two nonoverlapping pairs across the middle, each with a visible seat and a clear bent-to-standing posture. At 140×196 show every face and at least one unobscured action hand per adult; all other limbs remain anatomically complete. Place exactly two plain open wooden record boxes side-by-side in the lower center, clear of every foot. Boxes may show ordinary wood grain and construction edges but contain no paper, writing line, label, seal, emblem, letter, numeral, pseudo-writing or decorative mark. Keep hierarchy bell > shared turn-and-rise action > two boxes. Add no fifth person, grave, coffin, corpse, skeleton, angel, wing, trumpet, religious insignia, animal, banner, sun disk, text or resurrection spectacle.",
  "the-world":
    "Show exactly one fully clothed adult gardener alone in a balanced centered dance inside exactly one complete closed oval living wreath. The dancer holds exactly two short plain cloth ribbons total, one in each visible natural five-digit hand; the ribbons do not join, write, bind or form a glyph. Use exactly four and only four bold high-contrast stone head bas-reliefs, each about 8–12 percent of frame height and physically attached to four separate corner plinths outside the wreath: a human head upper-left, an eagle head and beak upper-right, a bull head and horns lower-left and a lion head and mane lower-right. Keep clear background space between each relief and the wreath. They are inanimate architectural carvings, never living animals, floating icons or a collage, and none overlaps the dancer. Keep the complete wreath, full dancer, both hands, both ribbons and four corner reliefs readable at 140×196, with hierarchy dancer and closed wreath > four guardians > two ribbons. Add no second person, fifth guardian relief, additional animal figure, incomplete wreath, exposed nudity, large star, sun, moon, zodiac mark, letter, numeral, pseudo-writing, border or floating symbol.",
  "wands-2":
    "Show exactly one fully clothed adult maker and exactly two and only two straight bark-textured wooden staffs total. The maker stands behind one solid uninterrupted stone parapet with no railing posts. Staff 1 is held upright in the maker's right natural five-digit hand with both endpoints and its full shaft visible. Staff 2 stands separately upright in one low plain open-front stone holder that does not cover its lower tip; both endpoints and its full shaft remain visible. The left natural five-digit hand rests open on exactly one folded route cloth spread on the parapet. The cloth shows only a few broad unmarked terrain color fields and has no route line, border, grid, arrow, compass, seal, letter, numeral, pseudo-writing or decorative mark. Keep a visible background gap between both staffs, every hand, the cloth and the person at 140×196, with hierarchy maker and two staffs > blank cloth > broad horizon. Use treeless distant hills and solid stone architecture. Add no second person, animal, globe, map symbol, path line, branch, tree, fence, railing post, column, mast, pole, rod, tool handle, third staff or other elongated wooden object.",
  "wands-3":
    "Show exactly three fully clothed people total: one young traveler large in the foreground and exactly two small distant caravan walkers returning together on one continuous valley road. The two distant walkers lead exactly one calm pack mule carrying only soft cloth bundles with no rigid frame, pole or protruding object. Show exactly three and only three straight bark-textured wooden staffs total, all planted upright beside the foreground traveler; each staff has a separately visible top, full unbroken shaft and ground contact, with background gaps between all three and no hand touching them. Keep hierarchy three planted staffs and waiting traveler > returning caravan > widening valley at 140×196. Use treeless slopes, low stone edges and soft cloth cargo. Add no fourth person, second animal, cart, wagon, wheel, harness shaft, ship, ocean, map, banner, sign, branch, tree, fence, post, column, mast, pole, rod, tool handle, fourth staff or other elongated wooden object.",
  "wands-4":
    "Show exactly four fully clothed adults total as two friendly nonromantic neighbor pairs greeting with open natural five-digit hands in one stone harvest courtyard. Show exactly four and only four straight bark-textured vertical staffs as the four distinct support posts of one simple open cream canopy with one restrained flower garland. At 140×196 each post must have its own countable top end or top attachment, independent centerline and substantial visible shaft segment below that attachment. Natural partial occlusion of an inner post by one required adult, canopy perspective or ground scenery is allowed, and its lower endpoint need not be visible; occlusion must never erase a post identity, merge two posts, split one post or create a fifth post. The canopy and garland must read as one coherent four-post structure in believable perspective, never as a wooden crossbar. Keep hierarchy four support-post identities and canopy > shared greeting > open courtyard. Use stone walls and low ground flowers only. Add no fifth person, wedding clothing, bridal veil, arch, paired Lovers path, tree, branch, fence, railing, column, mast, pole, rod, tool handle, fifth staff or other elongated wooden object beyond the required four staffs.",
  "wands-6":
    "Use a medium-wide returning-procession view with exactly six fully clothed people total and exactly one calm horse. One rider carries exactly one upright bark-textured wooden staff tied with one small plain laurel sprig; exactly five walking companions each carry exactly one separate upright bark-textured wooden staff, for exactly six and only six staffs total. Arrange all six staffs in a shallow separated fan with six distinct tops and continuously traceable shafts at 140×196; no two staffs merge, cross, hide behind another staff or resemble the horse tack. Keep the rider and horse largest, the laurel-tied lead staff second and the five companions modestly acknowledging completed work without bowing or worship. Use one broad treeless stone road and low stone walls. Add no seventh person, second animal, chariot, cart, wheel, crown, banner, flag, arch, tree, branch, fence post, column, mast, pole, rod, weapon, tool handle, seventh staff or other elongated wooden object.",
  "wands-7":
    "Use a medium-wide high-oblique boundary-defense view with exactly seven fully clothed adults total at two safe elevations. One gardener stands balanced on a broad upper stone terrace and braces exactly one horizontal bark-textured wooden staff across a narrow open stone gate without striking anyone. Exactly six adults remain on the lower terrace, each holding exactly one separate upright bark-textured wooden staff below shoulder height; they stand with firm but nonattacking postures and clear space from the gate. Show exactly seven and only seven staffs total, with the single horizontal upper staff separated from six vertical lower staffs; every lower staff has a distinct top and continuously traceable shaft at 140×196, and no staff crosses, touches or hides another. Use solid stone walls and treeless bare ground, with no drop beside any person. Add no eighth person, animal, injury, thrusting weapon pose, cliff edge, fall, tree, branch, fence, railing post, column, mast, pole, rod, tool handle, eighth staff or other elongated wooden object.",
  "cups-8":
    "Use a medium-wide rear three-quarter dusk view with exactly one fully clothed young traveler moving away from the cups toward the quiet inland path in a deliberate slowed stride. Honor only the textual young-traveler face, hair, skin and body traits; neither supplied anchor controls identity, and do not recreate The Fool's pose, cliff, satchel, dog, joyful stride or forward-leap silhouette. Show exactly eight and only eight intact blue handled cups on one low stepped stone wall with three shallow ledges: exactly three cups on the lower ledge, exactly three on the middle ledge and exactly two on the upper ledge. Every cup has a complete separately visible gold rim, blue body, flat base and single open handle, with background gaps between all cup silhouettes; no cup nests in, merges with, hides or directly balances on another cup. Keep the traveler, wall, all eight cups and inland path mutually unobstructed at 140×196, with hierarchy eight cups left intact > deliberate departure > calm dusk shoreline and path. Add no second person, animal, ninth cup, spill, bowl, plate, pitcher, jar, bottle, vase, other vessel, tableware, cliff edge, jump, text or mark.",
  "cups-9":
    "This reviewed lock overrides the earlier plural Recurring cast wording for this card: show exactly one host who is one adult member of that community; every other community member is off-frame, with no reciprocal partner, guest or background human silhouette. Use a close three-quarter interior view with that one fully clothed grounded host and exactly one freestanding three-tier wooden serving stand. The stand has four visible floor contacts and clear background gaps from every wall, table and person; it is not a wall niche, alcove shelf, cabinet or built-in fixture. Show exactly nine and only nine blue handled cups on the stand: exactly three complete cups per tier. The ninth cup already rests with its entire flat base on the upper tier while the host stands beside the stand and releases only that cup with fingertips; the hand, arm and body hide no cup. Every cup has a complete separately visible gold rim, blue body, flat base and single open handle, with gaps between all nine silhouettes and no nesting, merging or overlap. Use only the target's textual host direction; neither supplied anchor controls identity, cast, group size, pose, feast layout or composition. Keep one or two bare cleared rectangular wooden tables in the background with nothing on them. Beyond the required nine cups add no cup, mug, bowl, plate, pitcher, jar, bottle, vase, tableware, circular vessel, food, second person, crown, text or mark. At 140×196 require all four stand legs, all three tiers and the three-plus-three-plus-three cup arrangement simultaneously countable, with hierarchy nine cups and stand > releasing hand > satisfied host > bare room.",
  "swords-2":
    "This reviewed lock overrides the earlier plural Recurring cast wording: show exactly one fully clothed seated decision-maker who is one adult member of that community; every other community member is off-frame, with no second person, guest, reflection or background human silhouette. Show exactly two steel swords total, both fully sheathed for safety. The person holds one hilt in each natural five-digit hand; only each assigned hand-to-hilt contact is allowed. The two complete sheathed swords cross once in a low broad X entirely in front of an empty stone seat base, below the shoulders and away from the face, neck, torso and every unrelated limb. At the single X crossing allow only a small sheath-over-sheath occlusion while both continuous silhouettes and endpoints remain traceable. A loose removable plain cloth covers only the eyes, leaving nose and mouth clear. Keep both complete swords, hilts, sheaths and hands readable at 140×196. Place two distant branching routes beyond the seat without signs or marks. Add no scale, rack, shield, third blade, exposed edge, text or symbol.",
  "swords-3":
    "This reviewed lock overrides the earlier plural Recurring cast wording: show exactly one fully clothed grieving adult who is one member of that community; every other community member is off-frame, with no second person, guest, reflection or background human silhouette. The adult mends one plain rain-darkened red shield-shaped cloth emblem on a simple rectangular sewing frame. Exactly three and only three complete sheathed steel swords rest on one separate wall rack behind and above the cloth: one centered vertical sword and two diagonals. The two diagonal swords cross the centered sword at two different heights; the diagonals never cross, touch or hide each other, and all three hilts, sheaths and endpoints remain separately traceable at 140×196. No sword touches, pierces or hides the cloth or person. Show one short visible mending thread joined to one ordinary needle in the person's natural hand. Add no anatomical heart, heart decoration, wound, blood, fourth sword, extra needle, weapon in hand, letter, numeral, mark or text.",
  "swords-4":
    "This reviewed lock overrides the earlier plural Recurring cast wording: show exactly one fully clothed traveler who is one adult member of that community; every other community member is off-frame, with no second person, guest, reflection or background human silhouette. Use the required wide afternoon exterior with the traveler sitting upright on one stone bench, eyes closed, both natural hands relaxed and empty. On one low rectangular cream cloth before the bench place exactly four and only four complete sheathed steel swords side by side in one horizontal row, with parallel shafts, four distinct hilts, four distinct tips and gaps between all silhouettes at 140×196. The open shelter is simple stone with no post, decoration or shadow shaped like another sword. Add no lying figure, bed, tomb, rack, planted or wall-mounted blade, fifth sword, injury, text or mark.",
  "swords-6":
    "This reviewed lock overrides the earlier plural Recurring cast wording: show exactly the named three fully clothed people in one small ferry—one grounded ferryperson at the stern and exactly two seated passengers; every other community member is off-frame, with no fourth person, guest, reflection or background human silhouette. Keep all three separated and safe. At the bow, exactly six and only six complete sheathed steel swords stand upright in six individual closed rectangular rack slots, arranged as one evenly spaced row with every hilt, sheath and lower slot separately traceable at 140×196; no sword touches or hides a person. The ferryperson uses one broad wooden paddle with a visibly flat paddle blade and brown wood grain, never a sword-like metal object. Show water changing from textured to calm. Add no second boat, sail, mast, pole, seventh sword, exposed blade, panic, funeral cue, text or mark.",
  "swords-7":
    "This reviewed lock overrides the earlier plural Recurring cast wording: show exactly one fully clothed cautious planner who is one adult member of that community; every other community member is off-frame, with no second person, guest, reflection or background human silhouette. The planner walks on an unguarded side path and looks back without triumph. Exactly five complete sheathed steel swords are secured to one solid padded rectangular cloth backboard on the person's back; the backboard has no visible rod, pole, slat or shaft-like frame edge. Place the five carried swords in five separated noncrossing lanes with visible cloth gaps from hilt to tip and no sword merging with a limb. Exactly two more complete sheathed swords remain upright in two separated slots of one low camp rack. Together show exactly seven swords in a clear five-plus-two arrangement at 140×196. Keep one small unfinished camp model made only of angular blocks and one blank cloth, with no round object or writing. Add no tent pole, flag, eighth sword, exposed blade, theft caricature, text or mark.",
  "swords-8":
    "This reviewed lock overrides the earlier plural Recurring cast wording: show exactly one fully clothed grounded adult who is one member of that community; every other community member is off-frame, with no second person, guest, reflection or background human silhouette. The adult wears one loose removable eye cloth and keeps both natural five-digit hands open, visible and completely unbound. Exactly eight and only eight complete sheathed steel swords stand in eight wide stone sockets as an incomplete boundary: four separated swords on viewer-left and four on viewer-right, with a broad obvious exit gap behind the person. Each sword has a distinct hilt, full sheath and socket contact, and no sword touches, crosses or hides another sword or the body at 140×196. Keep stable level ground. Use a visibly hesitant guarded stance—shoulders drawn and feet paused away from the exit that the eye-clothed adult cannot see, while the broad gap remains fully visible to the viewer—so the scene reads as perceived self-restriction and uncertainty. The body remains unbound and safe. Do not depict serene meditation, voluntary rest, a seat, crossed swords or branching decision routes. Add no rope, cord, binding, prison wall, ninth sword, exposed point, injury, text or mark.",
  "swords-9":
    "This reviewed lock overrides the earlier plural Recurring cast wording and replaces the earlier singular repetitive-row wording for this card: show exactly one fully clothed wakeful adult who is one member of that community; every other community member is off-frame, with no second person, guest, reflection or background human silhouette. The adult sits upright on the side of a bed before dawn, both natural hands covering only the lower face while eyes and breathing space remain visible. On the side wall beside—not above—the bed, use only one rectangular rack containing exactly nine and only nine complete sheathed steel swords, each in its own separated horizontal slot, arranged as three distinct rows of three. Every sword has a distinct hilt, sheath and endpoints, with the strict three-by-three grid countable at 140×196 and no sword shadow forming a tenth identity. Keep first light at one plain window and a rumpled but ordinary blanket. Add no monster, ghost, self-harm action, wound, blood, tenth sword, exposed blade, text or mark.",
  "pentacles-2":
    "This reviewed lock overrides the cast description's unavailable The Fool facial-structure reference and replaces the earlier infinity-shaped Supporting symbol with one ordinary nonsymbolic connector cord: honor only the explicit medium-brown skin, short dark curls, open expression and plum-and-cream clothing; neither supplied anchor controls identity. Show exactly one fully clothed young traveler with no second person, guest, reflection or background human silhouette, working calmly at one sparse bench with exactly two antique-gold pentacle disks total. One complete disk lies centered on each of two shallow rectangular wooden work trays, with both disks fully visible, separated and equal in size. Exactly one continuous loose cream cord joins the tray handles in one broad non-self-crossing slack U-curve; it never forms an infinity sign, figure eight, floating glyph or other symbol, and touches neither disk nor hand. The traveler shifts the trays with two visible natural hands while changing weather appears only beyond one window. Add no third disk, coin, plate, bowl, circular tool, juggling pose, four-suit table, letter, numeral, text or mark.",
  "pentacles-3":
    "This reviewed lock overrides the earlier open-ended Recurring cast wording: show exactly the three named fully clothed collaborators at one stone arch under construction; every other community member is off-frame, with no fourth person, guest, reflection or background human silhouette. Give each collaborator a distinct role and unobstructed face: one aligns a rectangular block, one points with an open natural hand, and one holds a single blank unmarked planning cloth. Integrate exactly three and only three complete antique-gold pentacle disks into three separated square joint recesses across the arch, with background gaps and no disk hidden by hand, person, block or tool at 140×196. Use only angular stone blocks and one plain wooden straightedge. Add no round tool, button, plate, model, workbench clutter, fourth disk, writing, text or mark.",
  "pentacles-4":
    "This reviewed lock overrides the earlier open-ended Recurring cast wording and replaces the earlier busy-market wording: show exactly one fully clothed storekeeper with a guarded but humane posture; every other community member is off-frame, with no second person, guest, reflection or background human silhouette. Show exactly four antique-gold pentacle disks total. The storekeeper holds one complete disk flat against the upper chest with both natural hands around its outer edge without hiding its center. Exactly three more complete disks sit separately in three square open-front shelf slots arranged in one horizontal row behind, for a clear one-plus-three count at 140×196. Keep one closed plain rectangular ledger with a completely blank cover. Outside show only unoccupied angular stalls and cloth awnings, with no person, human silhouette, circular sign or round ware. Add no crown, plate, coin pile, fifth disk, round fruit, letter, numeral, text or mark.",
  "pentacles-6":
    "This reviewed lock overrides the earlier open-ended Recurring cast wording: show exactly three fully clothed adults total standing at equal eye level around one open market desk—one neutral steward centered and exactly two recipients on opposite sides; every other community member is off-frame, with no fourth person, guest, reflection or background human silhouette. Use no kneeling or savior pose. The explicit Pentacles-6 direction overrides only the general Major-signature warning: show exactly one small utilitarian level market balance with two equal empty shallow rectangular pans behind the desk as a secondary fairness cue, never a monumental Justice silhouette. On the desk place exactly two shallow rectangular allocation trays, one before each recipient, with exactly three complete antique-gold pentacle disks per tray. The steward slides one tray toward each recipient with two open hands touching only tray edges while both recipients reach toward their own tray without covering any disk. Keep all six disks separated and countable as three-plus-three at 140×196. Keep one open blank ledger with featureless pages. Add no round scale weight, loose coin, plate, seventh disk, sword, crown, writing, text or mark.",
  "pentacles-7":
    "This reviewed lock overrides the cast description's unavailable The Lovers facial-structure reference: honor only the explicit deep-brown skin, long braids with thin linear gold thread wraps and blue-and-ochre clothing; use no round bead, disk, coin, medallion or pentacle-shaped hair detail, and neither supplied anchor controls identity. Show exactly one fully clothed braided gardener with no second person, guest, reflection or background human silhouette, paused in patient review beside exactly one trellised crop row. Attach exactly seven and only seven complete antique-gold pentacle marker disks to seven separated square wooden plaques along the row, arranged four lower and three upper with every disk fully visible and gaps between all silhouettes at 140×196. The gardener holds exactly one lowered broad-headed garden hoe, clearly wood and iron and not another marker; its head has no circular hole, rivet or disk-like detail. Use leafy nonfruiting vines and small angular leaves only. Add no pomegranate, wheat bundle, round fruit, flower center resembling a disk, eighth disk, seated Empress pose, text or mark.",
  "pentacles-8":
    "This reviewed lock overrides the cast description's unavailable The Lovers facial-structure reference: honor only the explicit olive skin, short copper curls and green-and-cream clothing; neither supplied anchor controls identity. Show exactly one fully clothed copper-haired maker with no second person, guest, reflection or background human silhouette, at one sparse apprenticeship bench with exactly eight antique-gold pentacle disks total. One complete disk lies flat on one square work pad beneath a single small engraving tool held by one natural hand; the engraving tip touches only the outer rim and covers neither the disk perimeter nor its central five-point mark. Exactly seven completed disks hang separately on one tall open rectangular rack as four disks in the upper row and three in the lower row, with all seven plus the work disk fully visible and countable at 140×196. Keep every disk clear of buttons, plates and round tool parts; the other hand steadies only the square pad. Add no four-suit tools, architectural model, ninth disk, writing, text or mark.",
  "pentacles-9":
    "This reviewed lock overrides the cast description's unavailable The Star facial-structure reference: honor only the explicit older East Asian appearance, silver bob and indigo-and-ochre clothing; neither supplied anchor controls identity. Show exactly one fully clothed elder steward with no second person, guest, reflection or background human silhouette, walking alone through a mature walled herb garden. Show exactly one natural falcon resting calmly on one gloved hand and no other animal. Mark the completed garden with exactly nine and only nine complete antique-gold pentacle disks fixed to nine separated low square stone plot markers, arranged as three visible groups of three along one open path. Every disk remains fully inside the frame, separated from foliage, glove, bird and wall, and countable at 140×196. Use herbs, grasses and angular leaves without fruit or round flower centers. Add no pomegranate, grape, coin pile, decorative star, tenth disk, text or mark.",
});
const reviewedCardPromptLockHistory = Object.freeze({
  "wands-4-v1": Object.freeze({
    cardId: "wands-4",
    throughAttemptNumber: 7,
    lock: "Show exactly four fully clothed adults total, arranged as two friendly nonromantic neighbor pairs greeting with open natural five-digit hands in one stone harvest courtyard. Show exactly four and only four straight bark-textured wooden staffs total, one at each corner of a simple open canopy; all four vertical staffs must have separately visible tops, continuous shafts and ground contacts at 140×196. Suspend one plain square cloth canopy and one restrained flower garland from soft ropes tied directly between the four staff tops; use no wooden crossbar, beam or additional support. Keep all people separated from the four staffs and hierarchy four-staff canopy > shared greeting > open courtyard. Use stone walls and low ground flowers only. Add no fifth person, wedding clothing, bridal veil, arch, paired Lovers path, tree, branch, fence, railing, column, mast, pole, rod, tool handle, fifth staff or any other elongated wooden object.",
  }),
});
const reviewedAnimalRuleCardIds = new Set([
  "swords-2",
  "swords-3",
  "swords-4",
  "swords-6",
  "swords-7",
  "swords-8",
  "swords-9",
  "pentacles-2",
  "pentacles-3",
  "pentacles-4",
  "pentacles-6",
  "pentacles-7",
  "pentacles-8",
  "pentacles-9",
]);
const reviewedMajorReferenceIds = Object.freeze({
  "the-devil": Object.freeze(["the-lovers", "strength"]),
});
const reviewedMajorIdentityReferenceRoles = Object.freeze({
  "the-devil": Object.freeze({
    "the-lovers":
      "Reference 1 (The Lovers) controls only both matching recurring adults' faces, hair, skin tones, ages and body proportions—the copper-haired maker and the braided gardener. Ignore every other source feature and do not copy clothing, pose, action, setting or composition.",
  }),
});
const reviewedCardPromptDirections = Object.freeze({
  "the-hanged-man": Object.freeze({
    name: "The Hanged Man—safe voluntary inversion archetype",
    gesture:
      "A serene adult aerial-yoga practitioner chooses a controlled one-ankle inverted pose on a low living garden acrobatics frame, with the free leg bent behind and both open hands relaxed.",
    avoid:
      "Keep the scene family-friendly, supervised in feeling, stable, padded by deep moss and unmistakably voluntary; show no distress, falling motion or unsafe equipment.",
  }),
  "wands-2": Object.freeze({
    gesture:
      "The maker studies one folded route cloth showing only broad unlabeled terrain color fields at a high solid stone parapet, holding one upright staff while a second stands upright in a low plain open-front stone holder that leaves its lower tip visible.",
    dominantSymbol:
      "exactly two separated upright wooden staffs against a broad horizon",
  }),
  "wands-6": Object.freeze({
    supportingSymbols: Object.freeze([
      "a returning rider",
      "exactly five walking companions and no other person",
    ]),
  }),
});
const reviewedRepairAuthorizationContracts = Object.freeze({
  "cups-page-attempt-004-repair-authorization-001": Object.freeze({
    decisionFingerprintSha256:
      "55fc3d953eaadffc0c9a895b622d7138144eaf74f0f1ceb3b71c387e391678d9",
    reviewerIds: Object.freeze([
      "tarot-content-review",
      "ux-test-review",
      "final-plan-review",
    ]),
  }),
});
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
const deterministicRepairCheckCache = new Map();
const contactSheetCheckCache = new Map();
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
        "batchReviewGates",
        "controlRegistry",
        "generationRecords",
        "legacyAudit",
        "legacyReviewCorrections",
        "repairAuthorizations",
        "replacementGates",
        "releaseHistory",
        "styleHistory",
        "supersessions",
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

function buildMajorReferenceControl(manifest, cardId, card) {
  const referenceIds =
    reviewedMajorReferenceIds[cardId] ?? card.legacySeedReferenceIds;
  const targetCastIds = new Set(card.castIds);
  const identityReferenceIndex = referenceIds.findIndex((referenceId) =>
    manifest.cards?.[referenceId]?.castIds?.some((castId) =>
      targetCastIds.has(castId),
    ),
  );
  const referenceRoles = referenceIds.map((referenceId, index) => {
    const referenceName = manifest.cards?.[referenceId]?.name ?? referenceId;
    if (index === identityReferenceIndex) {
      return (
        reviewedMajorIdentityReferenceRoles[cardId]?.[referenceId] ??
        `Reference ${index + 1} (${referenceName}) controls only the matching recurring figure's face, hair, skin tone, age and body proportions. Ignore every other source figure and do not copy clothing, pose, action, setting or composition.`
      );
    }
    return `Reference ${index + 1} (${referenceName}) controls only ink-and-gouache rendering, aged-paper material and compatible palette. It controls no identity, figure, pose, action, object, animal, architecture, path, water, celestial layout or composition.`;
  });
  return [
    "The target card manifest exclusively controls scene, cast, count and composition.",
    ...referenceRoles,
    "Do not import any incidental person, garment, object, animal, building, road, water feature, celestial symbol or layout from either reference.",
  ].join(" ");
}

function buildReviewedMinorReferenceControl() {
  return "Follow the Post-pilot reference role lock above; it exclusively controls both supplied anchors. Use neither anchor for cast or recurring-character identity. Do not copy either anchor's source count, pose, action, movement, setting, lighting layout, composition or incidental objects.";
}

function getReviewedCardPromptLock(cardId, promptLockVersion) {
  if (promptLockVersion === "current") {
    return reviewedCardPromptLocks[cardId];
  }
  const historical = reviewedCardPromptLockHistory[promptLockVersion];
  if (!historical || historical.cardId !== cardId) {
    throw new Error(
      `Unknown reviewed prompt-lock version "${promptLockVersion}" for ${cardId}.`,
    );
  }
  return historical.lock;
}

function getGenerationPromptLockVersion(record) {
  const historical = reviewedCardPromptLockHistory["wands-4-v1"];
  return record.cardId === historical.cardId &&
    record.attemptNumber <= historical.throughAttemptNumber
    ? "wands-4-v1"
    : "current";
}

export function buildCardArtV3Prompt(
  manifest,
  cardId,
  referenceRoute = null,
  promptLockVersion = "current",
) {
  const card = getCard(manifest, cardId);
  const reviewedDirection = reviewedCardPromptDirections[cardId];
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
    if (referenceRoute !== null) {
      rules.push(
        `Post-pilot reference role lock: ${referenceRoute.instruction}`,
      );
    }
  }

  const reviewedPromptLock = getReviewedCardPromptLock(
    cardId,
    promptLockVersion,
  );
  if (reviewedAnimalRuleCardIds.has(cardId)) {
    rules.push(
      "Animal lock: unless the card direction explicitly requires a living animal or animal-form object, add no animal, bird, fish, insect, animal silhouette or animal-shaped ornament. When one is explicitly required, show exactly the named count and type and no other animal.",
    );
  }
  if (reviewedPromptLock) {
    rules.push(`Reviewed card lock: ${reviewedPromptLock}`);
  }

  const safety = manifest.difficultCardSafety[cardId];
  if (safety) rules.push(`Safety lock: ${safety}`);
  if (card.needsRetouch) {
    rules.push(`Retouch-only lock: ${card.retouchInstruction}`);
  }

  return [
    manifest.prompt.shared,
    "",
    `CARD DIRECTION — ${reviewedDirection?.name ?? card.name} (${cardId})`,
    `Observable scene: ${reviewedDirection?.gesture ?? card.gesture}`,
    `Recurring cast: ${cast.join(" ")}`,
    `Location family: ${location.description}`,
    `Dominant symbol: ${reviewedDirection?.dominantSymbol ?? card.dominantSymbol}.`,
    `Supporting symbols: ${(reviewedDirection?.supportingSymbols ?? card.supportingSymbols).join("; ")}.`,
    `Card-specific exclusions: ${reviewedDirection?.avoid ?? card.avoid}`,
    "",
    "DECK AND SYMBOL RULES",
    ...rules.map((rule) => `- ${rule}`),
    "",
    "REFERENCE CONTROL",
    card.arcana === "major" && reviewedPromptLock
      ? buildMajorReferenceControl(manifest, cardId, card)
      : card.arcana === "minor" &&
          reviewedPromptLock &&
          referenceRoute?.kind === "numbered"
        ? buildReviewedMinorReferenceControl()
        : manifest.referencePolicy.instruction,
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

function buildCardArtV3FreshControlBasePrompt(basePrompt, controlId = null) {
  const genericReferenceBlock =
    /REFERENCE CONTROL\n[\s\S]*?\n\nOUTPUT CONTRACT/;
  if (!genericReferenceBlock.test(basePrompt)) {
    throw new Error(
      "Fresh-control prompt requires one canonical reference block.",
    );
  }
  const usesExplicitGeometryStyleAuthority = new Set([
    "wands-4-four-clear-staff-lanes-v1",
    "wands-7-six-isolated-slots-v1",
  ]).has(controlId);
  const authoritySafeBasePrompt = usesExplicitGeometryStyleAuthority
    ? basePrompt.replace(/\n- Post-pilot reference role lock:[^\n]*/g, "")
    : basePrompt;
  return authoritySafeBasePrompt.replace(
    genericReferenceBlock,
    usesExplicitGeometryStyleAuthority
      ? [
          "REFERENCE CONTROL",
          "Reference image 1 is authoritative only for the reviewed geometry count, connectivity, contact and topology named by the retry constraint. Never copy its color, material, background, vector rendering, identity, cast or diagram style.",
          "Reference image 2 is authoritative only for Quiet Celestial Storybook rendering, natural body proportion, Wands bark material and the target palette. Never copy its identity, cast, count, action, scene, composition or incidental objects.",
          "No other image, prior attempt or recent conversation image is an input.",
          "",
          "OUTPUT CONTRACT",
        ].join("\n")
      : [
          "REFERENCE CONTROL",
          "Reference image 1 is authoritative only for the reviewed geometry count, connectivity and topology named by the retry constraint. Never copy its color, background, vector rendering, dimensions or absolute placement.",
          "Reference image 2 is authoritative only for Quiet Celestial Storybook rendering, natural body proportion, recurring character identity and the target palette. Never copy its scene, pose, path layout, animal or incidental objects.",
          "No other image, prior attempt or recent conversation image is an input.",
          "",
          "OUTPUT CONTRACT",
        ].join("\n"),
  );
}

export function assertCardArtV3RepairAuthorization(authorization) {
  const reviewed = reviewedRepairAuthorizationContracts[authorization?.id];
  const reviewerIds = (authorization?.independentReviews ?? []).map(
    ({ reviewerId }) => reviewerId,
  );
  const decisionPayload = {
    binding: authorization?.binding,
    independentReviews: authorization?.independentReviews,
    status: authorization?.status,
    authorizedAt: authorization?.authorizedAt,
  };
  if (
    !reviewed ||
    authorization?.status !== "authorized" ||
    authorization?.decisionFingerprintSha256 !==
      sha256(stableStringify(decisionPayload)) ||
    authorization?.decisionFingerprintSha256 !==
      reviewed.decisionFingerprintSha256 ||
    stableStringify(reviewerIds) !== stableStringify(reviewed.reviewerIds) ||
    new Set(reviewerIds).size !== reviewerIds.length ||
    (authorization?.independentReviews ?? []).some(
      (review) =>
        review.independent !== true ||
        review.result !== "approved" ||
        !isCanonicalUtcTimestamp(review.reviewedAt),
    )
  ) {
    throw new Error(
      "Repair authorization does not match its externally frozen independent-review contract.",
    );
  }
  return authorization;
}

function getCardArtV3PromptRecordInternal(
  files,
  cardId,
  repositoryRoot = defaultRepositoryRoot,
  stageAuthorization = null,
  auditOnly = false,
) {
  validateForPrompt(files, repositoryRoot);
  const manifest = files.manifest;
  const card = getCard(manifest, cardId);
  if (!auditOnly) {
    assertGenerationStageOpen(files, cardId, stageAuthorization);
  }
  const referenceRoute = getCardArtV3PostPilotReferenceRoute(
    files.styleHistory,
    card,
  );
  const referenceRecords = resolveReferenceRecords(
    files,
    cardId,
    repositoryRoot,
    referenceRoute,
  );
  const prompt = buildCardArtV3Prompt(manifest, cardId, referenceRoute);
  const generator =
    getCorrectedLegacyRetouchContract(files, cardId)?.generator ??
    (card.needsRetouch ? manifest.retouchGenerator : manifest.generator);

  return {
    cardId,
    cardSpecSha256: getCardArtV3CardSpecSha256(
      manifest,
      cardId,
      referenceRoute,
    ),
    manifestSha256: getCardArtV3ManifestSha256(manifest),
    mode: generator.mode,
    prompt,
    promptSha256: sha256(prompt),
    referenceSha256: Object.fromEntries(
      referenceRecords.map(({ id, sha256: hash }) => [id, hash]),
    ),
    ...(referenceRoute === null ? {} : { referenceRoute }),
    referenced_image_paths: referenceRecords.map(
      ({ absolutePath }) => absolutePath,
    ),
    systemId: manifest.systemId,
    version: manifest.version,
  };
}

export function getCardArtV3PromptRecord(
  files,
  cardId,
  repositoryRoot = defaultRepositoryRoot,
) {
  return getCardArtV3PromptRecordInternal(files, cardId, repositoryRoot, null);
}

export function getCardArtV3PromptAuditRecord(
  files,
  cardId,
  repositoryRoot = defaultRepositoryRoot,
) {
  return {
    ...getCardArtV3PromptRecordInternal(
      files,
      cardId,
      repositoryRoot,
      null,
      true,
    ),
    auditOnly: true,
  };
}

function getCardArtV3AttemptRecordInternal(
  files,
  cardId,
  retryConstraint = null,
  repositoryRoot = defaultRepositoryRoot,
  stageAuthorization = null,
  auditOnly = false,
) {
  const promptRecord = getCardArtV3PromptRecordInternal(
    files,
    cardId,
    repositoryRoot,
    stageAuthorization,
    auditOnly,
  );
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

export function getCardArtV3AttemptRecord(
  files,
  cardId,
  retryConstraint = null,
  repositoryRoot = defaultRepositoryRoot,
) {
  return getCardArtV3AttemptRecordInternal(
    files,
    cardId,
    retryConstraint,
    repositoryRoot,
    null,
  );
}

export function getCardArtV3AttemptAuditRecord(
  files,
  cardId,
  retryConstraint = null,
  repositoryRoot = defaultRepositoryRoot,
) {
  return {
    ...getCardArtV3AttemptRecordInternal(
      files,
      cardId,
      retryConstraint,
      repositoryRoot,
      null,
      true,
    ),
    auditOnly: true,
  };
}

function getCardArtV3ReviewedAttemptRecordInternal(
  files,
  cardId,
  retryConstraintArtifactPath,
  repositoryRoot = defaultRepositoryRoot,
  auditOnly = false,
) {
  const artifact = loadRetryConstraintArtifact(
    retryConstraintArtifactPath,
    cardId,
    repositoryRoot,
  );
  const attemptId = `${cardId}-attempt-${String(
    artifact.attemptNumber,
  ).padStart(3, "0")}`;
  if (
    !auditOnly &&
    (files.generationRecords.records ?? []).some(
      (record) => record.id === attemptId,
    )
  ) {
    throw new Error(`${attemptId} is already recorded and cannot be rerun.`);
  }
  const previousAttempt = (files.generationRecords.records ?? []).find(
    ({ id }) => id === artifact.previousAttemptId,
  );
  const previousSupersession = (files.supersessions?.entries ?? []).find(
    ({ attemptId }) => attemptId === previousAttempt?.id,
  );
  const lineageSupersession = getLineageSupersession(
    files.supersessions?.entries ?? [],
    cardId,
    artifact.attemptNumber,
  );
  if (
    !previousAttempt ||
    previousAttempt.cardId !== cardId ||
    previousAttempt.attemptNumber !== artifact.attemptNumber - 1 ||
    (previousAttempt.selectionStatus !== "rejected" &&
      !(
        previousAttempt.selectionStatus === "selected" &&
        previousSupersession?.status === "superseded" &&
        previousSupersession?.result === "rejected"
      ))
  ) {
    throw new Error(
      `Retry constraint must reference the immediately preceding rejected attempt for ${cardId}.`,
    );
  }
  const stageAuthorization = lineageSupersession
    ? getReviewedSupersessionRetryAuthorization(
        files,
        lineageSupersession,
        artifact,
        cardId,
        repositoryRoot,
      )
    : null;
  if (
    !isCanonicalUtcTimestamp(previousAttempt.generatedAt) ||
    Date.parse(previousAttempt.generatedAt) >=
      Date.parse(artifact.reviewedAt) ||
    (lineageSupersession &&
      Date.parse(lineageSupersession.supersededAt) >=
        Date.parse(artifact.reviewedAt))
  ) {
    throw new Error(
      `Retry review must occur after its preceding attempt and supersession decision for ${cardId}.`,
    );
  }
  const editSource = artifact.editSource;
  const controlReference = artifact.controlReference;
  const styleReference = artifact.styleReference;
  if (editSource !== null) {
    const sourceAttempt = (files.generationRecords.records ?? []).find(
      ({ id }) => id === editSource.attemptId,
    );
    const sourceSupersession = (files.supersessions?.entries ?? []).find(
      ({ attemptId }) => attemptId === sourceAttempt?.id,
    );
    if (
      !sourceAttempt ||
      sourceAttempt.cardId !== cardId ||
      (sourceAttempt.selectionStatus !== "rejected" &&
        !(
          sourceAttempt.selectionStatus === "selected" &&
          sourceSupersession?.status === "superseded" &&
          sourceSupersession?.result === "rejected"
        )) ||
      sourceAttempt.attemptNumber >= artifact.attemptNumber ||
      sourceAttempt.rawOutputPath !== editSource.path ||
      sourceAttempt.rawOutputSha256 !== editSource.sha256 ||
      !isCanonicalUtcTimestamp(sourceAttempt.generatedAt) ||
      Date.parse(sourceAttempt.generatedAt) >=
        Date.parse(artifact.reviewedAt) ||
      (sourceSupersession &&
        Date.parse(sourceSupersession.supersededAt) >=
          Date.parse(artifact.reviewedAt))
    ) {
      throw new Error(
        `Precision edit source must bind an immutable rejected attempt for ${cardId}.`,
      );
    }
  }
  if (stageAuthorization?.repairAuthorizationId) {
    validateForPrompt(files, repositoryRoot);
    assertGenerationStageOpen(files, cardId, stageAuthorization);
    const repair = getRepairAuthorizationForAttempt(
      files,
      `${cardId}-attempt-${String(artifact.attemptNumber).padStart(3, "0")}`,
      repositoryRoot,
    );
    return {
      systemId: files.manifest.systemId,
      version: files.manifest.version,
      cardId,
      attemptNumber: artifact.attemptNumber,
      previousAttemptId: artifact.previousAttemptId,
      repairMode: repair.recipe.mode,
      generator: {
        tool: repair.recipe.tool,
        toolVersion: repair.recipe.toolVersion,
        mode: repair.recipe.mode,
      },
      base: repair.authorization.binding.base,
      mask: repair.authorization.binding.mask,
      maskSource: repair.authorization.binding.maskSource,
      neutralOutputPath: repair.neutralOutputPath,
      recipe: repair.authorization.binding.recipe,
      retryArtifact: repair.authorization.binding.retryArtifact,
      script: repair.authorization.binding.script,
      replacementGate: repair.gateContract,
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
  const attemptRecord =
    editSource === null
      ? getCardArtV3AttemptRecordInternal(
          files,
          cardId,
          artifact.constraint,
          repositoryRoot,
          stageAuthorization,
          auditOnly,
        )
      : {
          ...getCardArtV3PromptRecordInternal(
            files,
            cardId,
            repositoryRoot,
            stageAuthorization,
            auditOnly,
          ),
          editSource: null,
          retryConstraint: artifact.constraint.trim(),
        };
  const effectivePrompt =
    editSource === null && controlReference !== null
      ? buildCardArtV3AttemptPrompt(
          buildCardArtV3FreshControlBasePrompt(
            attemptRecord.prompt,
            controlReference.id,
          ),
          artifact.constraint,
        )
      : editSource === null
        ? attemptRecord.effectivePrompt
        : buildCardArtV3PrecisionEditPrompt(artifact.constraint);
  return {
    ...attemptRecord,
    ...(editSource === null && controlReference === null
      ? {}
      : editSource === null
        ? {
            referenceSha256: {
              [controlReference.id]: controlReference.sha256,
              [styleReference.id]: styleReference.sha256,
            },
            referenced_image_paths: [
              resolve(repositoryRoot, controlReference.path),
              resolve(repositoryRoot, styleReference.path),
            ],
          }
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
    styleReference,
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

export function getCardArtV3ReviewedAttemptRecord(
  files,
  cardId,
  retryConstraintArtifactPath,
  repositoryRoot = defaultRepositoryRoot,
) {
  return getCardArtV3ReviewedAttemptRecordInternal(
    files,
    cardId,
    retryConstraintArtifactPath,
    repositoryRoot,
    false,
  );
}

export function getCardArtV3ReviewedAttemptAuditRecord(
  files,
  cardId,
  retryConstraintArtifactPath,
  repositoryRoot = defaultRepositoryRoot,
) {
  return {
    ...getCardArtV3ReviewedAttemptRecordInternal(
      files,
      cardId,
      retryConstraintArtifactPath,
      repositoryRoot,
      true,
    ),
    auditOnly: true,
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
  const styleReferenceFields = [
    artifact.styleReferenceId,
    artifact.styleReferencePath,
    artifact.styleReferenceSha256,
  ];
  const hasStyleReference = styleReferenceFields.some(
    (value) => value !== undefined,
  );
  const styleReference = hasStyleReference
    ? {
        id: artifact.styleReferenceId,
        path: artifact.styleReferencePath,
        sha256: artifact.styleReferenceSha256,
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
        `^art/card-art-v3-raw/[^/]+/${cardId}-candidate-[0-9]{3}(?:-rejected)?\\.png$`,
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
      (editSource === null && styleReference === null) ||
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
  if (hasStyleReference) {
    const styleApproval = readJson(resolve(repositoryRoot, fileNames.approvals))
      .records?.[styleReference.id ?? ""];
    const stylePath = resolve(repositoryRoot, styleReference.path ?? "");
    if (
      editSource !== null ||
      controlReference === null ||
      typeof styleReference.id !== "string" ||
      styleReference.path !== `public/cards/v3/${styleReference.id}.jpg` ||
      styleApproval?.status !== "approved" ||
      styleApproval?.assetSha256 !== styleReference.sha256 ||
      !existsSync(stylePath) ||
      sha256(readFileSync(stylePath)) !== styleReference.sha256
    ) {
      throw new Error(`Invalid approved style reference for ${cardId}.`);
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
    styleReference,
    projectRelativePath,
    sha256: sha256(buffer),
  };
}

function validateForPrompt(files, repositoryRoot) {
  const fingerprint = sha256(
    stableStringify({
      approvals: files.approvals,
      batchReviewGates: files.batchReviewGates,
      controlRegistry: files.controlRegistry,
      generationRecords: files.generationRecords,
      legacyAudit: files.legacyAudit,
      legacyReviewCorrections: files.legacyReviewCorrections,
      manifest: files.manifest,
      repairAuthorizations: files.repairAuthorizations,
      replacementGates: files.replacementGates,
      releaseHistory: files.releaseHistory,
      repositoryRoot,
      styleHistory: files.styleHistory,
      supersessions: files.supersessions,
    }),
  );
  if (promptValidationCache.get(files) === fingerprint) return;
  validateCardArtV3System(files, repositoryRoot);
  promptValidationCache.set(files, fingerprint);
}

function resolveReferenceRecords(
  files,
  cardId,
  repositoryRoot,
  frozenReferenceRoute = undefined,
  generatedAt = null,
) {
  const { approvals, manifest } = files;
  const card = getCard(manifest, cardId);
  const correctedRetouchContract = getCorrectedLegacyRetouchContract(
    files,
    cardId,
  );
  const legacySources = new Map(
    manifest.legacySources.map((source) => [source.id, source]),
  );
  const usesPromotedSuitAnchors =
    card.arcana === "minor" && !card.batch.startsWith("pilot-");
  const referenceRoute = usesPromotedSuitAnchors ? frozenReferenceRoute : null;
  const referenceIds =
    card.needsRetouch || correctedRetouchContract
      ? [cardId]
      : usesPromotedSuitAnchors
        ? referenceRoute?.anchorIds
        : (reviewedMajorReferenceIds[cardId] ?? card.legacySeedReferenceIds);

  if (usesPromotedSuitAnchors && !referenceRoute) {
    throw new Error(
      `No independently frozen post-pilot reference route exists for ${cardId}.`,
    );
  }

  return referenceIds.map((referenceId) => {
    const legacySource = legacySources.get(referenceId);
    const approval = approvals.records?.[referenceId];
    const referenceCard = manifest.cards?.[referenceId];
    const approvalAvailableAtGeneration =
      approval?.status === "approved" &&
      (generatedAt === null ||
        Date.parse(approval.batchReviewGateBoundAt ?? approval.reviewedAt) <=
          Date.parse(generatedAt));
    const isCorrectedRetouchReference =
      getCorrectedLegacyRetouchContract(files, referenceId) !== null;
    const correctedRetouchWasNotYetApproved =
      isCorrectedRetouchReference &&
      generatedAt !== null &&
      (!approval?.reviewedAt ||
        Date.parse(approval.reviewedAt) > Date.parse(generatedAt));
    const isRetouchedLegacy =
      manifest.referenceResolution.retouchedLegacyIds.includes(referenceId) ||
      (isCorrectedRetouchReference && !correctedRetouchWasNotYetApproved);
    const mayUseLegacyRetouchSource =
      (card.needsRetouch === true || correctedRetouchContract !== null) &&
      referenceId === cardId;
    const mustUseApprovedV3 =
      usesPromotedSuitAnchors ||
      (approvalAvailableAtGeneration && !mayUseLegacyRetouchSource) ||
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

function getReviewedSupersessionRetryAuthorization(
  files,
  supersession,
  artifact,
  cardId,
  repositoryRoot = defaultRepositoryRoot,
) {
  const attemptId = `${cardId}-attempt-${String(
    artifact.attemptNumber,
  ).padStart(3, "0")}`;
  const contract =
    reviewedSupersessionContracts[supersession?.id]?.authorizations?.[
      attemptId
    ];
  if (!contract) {
    const repair = getRepairAuthorizationForAttempt(
      files,
      attemptId,
      repositoryRoot,
    );
    if (
      !repair ||
      repair.attemptNumber !== artifact.attemptNumber ||
      repair.previousAttemptId !== artifact.previousAttemptId ||
      repair.retryArtifactPath !== artifact.projectRelativePath ||
      repair.retryArtifactSha256 !== artifact.sha256 ||
      stableStringify(repair.editSource) !==
        stableStringify(artifact.editSource)
    ) {
      throw new Error(
        `Superseded ${cardId} may only use its exact independently reviewed repair authorization.`,
      );
    }
    return {
      attemptNumber: artifact.attemptNumber,
      repairAuthorizationId: repair.authorization.id,
      retryArtifactSha256: artifact.sha256,
      supersessionId: supersession.id,
    };
  }
  const exactArtifactBinding = {
    attemptNumber: artifact.attemptNumber,
    editSource: artifact.editSource,
    previousAttemptId: artifact.previousAttemptId,
    retryArtifactPath: artifact.projectRelativePath,
    retryArtifactSha256: artifact.sha256,
  };
  const expectedArtifactBinding = {
    attemptNumber: contract?.attemptNumber,
    editSource: contract?.editSource,
    previousAttemptId: contract?.previousAttemptId,
    retryArtifactPath: contract?.retryArtifactPath,
    retryArtifactSha256: contract?.retryArtifactSha256,
  };
  if (
    supersession.cardId !== cardId ||
    stableStringify(exactArtifactBinding) !==
      stableStringify(expectedArtifactBinding)
  ) {
    throw new Error(
      `Superseded ${cardId} may only use its exact independently reviewed bounded replacement artifact.`,
    );
  }
  return {
    attemptNumber: artifact.attemptNumber,
    retryArtifactSha256: artifact.sha256,
    supersessionId: supersession.id,
  };
}

function getLineageSupersession(entries, cardId, attemptNumber) {
  return entries
    .filter(
      (entry) => entry.cardId === cardId && entry.attemptNumber < attemptNumber,
    )
    .sort((left, right) => left.attemptNumber - right.attemptNumber)
    .at(-1);
}

function getUnresolvedSupersessions(files) {
  const passingSupersessionIds = new Set(
    (files.replacementGates?.entries ?? [])
      .filter(
        (entry) => entry?.status === "passed" && entry?.result === "approved",
      )
      .map((entry) => entry.supersessionId),
  );
  return (files.supersessions?.entries ?? []).filter(
    (entry) => !passingSupersessionIds.has(entry.id),
  );
}

function assertGenerationStageOpen(files, cardId, stageAuthorization = null) {
  const { approvals, manifest, styleHistory } = files;
  const card = getCard(manifest, cardId);
  const effectiveLegacyDecision = getEffectiveLegacyDecision(files, cardId);
  const unresolvedSupersessions = getUnresolvedSupersessions(files);
  if (unresolvedSupersessions.length > 0) {
    const supersession = unresolvedSupersessions.find(
      (entry) => entry.id === stageAuthorization?.supersessionId,
    );
    const attemptId = `${cardId}-attempt-${String(
      stageAuthorization?.attemptNumber,
    ).padStart(3, "0")}`;
    const reviewedAuthorization =
      reviewedSupersessionContracts[supersession?.id]?.authorizations?.[
        attemptId
      ];
    const repairAuthorization = stageAuthorization?.repairAuthorizationId
      ? getRepairAuthorizationForAttempt(files, attemptId)
      : null;
    const hasReviewedAuthorization =
      (reviewedAuthorization?.attemptNumber ===
        stageAuthorization?.attemptNumber &&
        reviewedAuthorization?.retryArtifactSha256 ===
          stageAuthorization?.retryArtifactSha256) ||
      (repairAuthorization?.authorization?.id ===
        stageAuthorization?.repairAuthorizationId &&
        repairAuthorization?.attemptNumber ===
          stageAuthorization?.attemptNumber &&
        repairAuthorization?.retryArtifactSha256 ===
          stageAuthorization?.retryArtifactSha256);
    if (
      unresolvedSupersessions.length !== 1 ||
      !supersession ||
      supersession.cardId !== cardId ||
      !hasReviewedAuthorization
    ) {
      throw new Error(
        `${cardId} generation is closed until the unresolved court replacement passes its exact reviewed retry and replacement contact-sheet gate.`,
      );
    }
    const authorizedAttemptId = `${cardId}-attempt-${String(
      stageAuthorization.attemptNumber,
    ).padStart(3, "0")}`;
    if (
      (files.generationRecords.records ?? []).some(
        (record) => record.id === authorizedAttemptId,
      )
    ) {
      throw new Error(
        `${authorizedAttemptId} is already recorded and cannot be rerun.`,
      );
    }
  }
  if (
    card.disposition === "keep" &&
    effectiveLegacyDecision === "keep" &&
    card.needsRetouch !== true
  ) {
    throw new Error(
      `${cardId} is approved for byte-identical legacy reuse and must not be regenerated.`,
    );
  }
  if (
    card.needsRetouch === true ||
    (card.disposition === "keep" && effectiveLegacyDecision === "retouch")
  ) {
    return;
  }

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
  const productionBatchIndex = sequentialProductionBatchIds.indexOf(card.batch);
  if (productionBatchIndex === -1) return;
  for (const requiredBatchId of sequentialProductionBatchIds.slice(
    0,
    productionBatchIndex,
  )) {
    const gate = (files.batchReviewGates?.entries ?? []).find(
      (entry) => entry.batchId === requiredBatchId,
    );
    const missingApprovalIds = canonicalTarotCardIds
      .filter((id) => manifest.cards[id].batch === requiredBatchId)
      .filter(
        (id) =>
          approvals.records?.[id]?.status !== "approved" ||
          approvals.records[id].batchReviewGateId !== gate?.id,
      );
    if (
      !gate ||
      gate.status !== "passed" ||
      gate.result !== "approved" ||
      missingApprovalIds.length > 0
    ) {
      throw new Error(
        `${cardId} is closed until ${requiredBatchId} passes its exact frozen batch review and every card approval is committed atomically.`,
      );
    }
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

export function getCardArtV3CardSpecSha256(
  manifest,
  cardId,
  referenceRoute = null,
) {
  const card = getCard(manifest, cardId);
  const cardSpec = {
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
  };
  if (referenceRoute !== null) cardSpec.referenceRoute = referenceRoute;
  return sha256(stableStringify(cardSpec));
}

export function validateCardArtV3System(
  files,
  repositoryRoot = defaultRepositoryRoot,
  baselineFiles = loadCardArtV3Baseline(repositoryRoot),
) {
  const {
    approvals,
    batchReviewGates,
    controlRegistry,
    generationRecords,
    legacyAudit,
    legacyReviewCorrections,
    manifest,
    repairAuthorizations,
    replacementGates,
    releaseHistory,
    styleHistory,
    supersessions,
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
  const frozenPromotedAnchorIds = new Set(
    (styleHistory.entries?.length ?? 0) === 0
      ? [...plannedSuitAnchorIds]
      : styleHistory.entries.flatMap(
          ({ promotedSuitAnchorIds }) => promotedSuitAnchorIds ?? [],
        ),
  );
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
  validateLegacyReviewCorrections({
    errors,
    legacyAudit,
    legacyReviewCorrections,
    repositoryRoot,
  });

  validateEnvelope(approvals, manifest, "approvals", errors);
  validateEnvelope(batchReviewGates, manifest, "batchReviewGates", errors);
  validateEnvelope(generationRecords, manifest, "generationRecords", errors);
  validateEnvelope(
    repairAuthorizations,
    manifest,
    "repairAuthorizations",
    errors,
  );
  validateEnvelope(replacementGates, manifest, "replacementGates", errors);
  validateEnvelope(styleHistory, manifest, "styleHistory", errors, false);
  validateEnvelope(releaseHistory, manifest, "releaseHistory", errors, false);
  validateEnvelope(supersessions, manifest, "supersessions", errors);
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
  validateRepairAuthorizations({
    errors,
    repairAuthorizations,
    repositoryRoot,
  });
  const supersessionByAttemptId = validateSupersessions({
    errors,
    generationById,
    manifest,
    repositoryRoot,
    supersessions,
  });
  const replacementGateByAttemptId = validateReplacementGates({
    errors,
    files,
    generationById,
    manifest,
    replacementGates,
    repositoryRoot,
    supersessionByAttemptId,
    supersessions,
  });
  const batchReviewGateByCardId = validateBatchReviewGates({
    batchReviewGates,
    errors,
    files,
    generationById,
    manifest,
    repositoryRoot,
    supersessions,
  });
  const supersededNormalizedShaByCard = new Map();
  for (const supersession of supersessionByAttemptId.values()) {
    const hashes =
      supersededNormalizedShaByCard.get(supersession.cardId) ?? new Set();
    hashes.add(supersession.archive?.sha256);
    supersededNormalizedShaByCard.set(supersession.cardId, hashes);
  }
  const approvalEntries = Object.entries(approvals.records ?? {});
  let approvedDeckBytes = 0;
  for (const [cardId, approval] of approvalEntries) {
    const label = `approvals.records.${cardId}`;
    const generation = generationById.get(approval.generationRecordId);
    const cardBatch = manifest.cards?.[cardId]?.batch;
    const batchReviewGate = batchReviewGateByCardId.get(cardId);
    const requiresBatchReviewGate =
      Boolean(batchReviewGate) ||
      (typeof cardBatch === "string" &&
        !cardBatch.startsWith("pilot-") &&
        cardBatch !== "court-validation-a" &&
        approval.provenance !== "retouched-v3");
    if (requiresBatchReviewGate && !batchReviewGate) {
      errors.push(`${label} requires an externally frozen batch review gate.`);
    } else if (
      batchReviewGate &&
      approval.batchReviewGateId !== batchReviewGate.id
    ) {
      errors.push(
        `${label}.batchReviewGateId must bind its passing batch gate.`,
      );
    } else if (
      !requiresBatchReviewGate &&
      approval.batchReviewGateId !== undefined
    ) {
      errors.push(`${label}.batchReviewGateId is not allowed for this stage.`);
    }
    if (
      approval.batchReviewGateBoundAt !== undefined &&
      (!batchReviewGate ||
        !isCanonicalUtcTimestamp(approval.batchReviewGateBoundAt) ||
        Date.parse(approval.batchReviewGateBoundAt) <
          Date.parse(batchReviewGate.reviewedAt))
    ) {
      errors.push(
        `${label}.batchReviewGateBoundAt must be a canonical time at or after its passing gate.`,
      );
    }
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
      !frozenPromotedAnchorIds.has(cardId)
    ) {
      errors.push(`${label} cannot be promoted as an unplanned suit anchor.`);
    }
    let approvalReferenceRoute = null;
    try {
      const card = manifest.cards?.[cardId];
      const isPostPilotMinor =
        card?.arcana === "minor" && !card.batch.startsWith("pilot-");
      approvalReferenceRoute = getCardArtV3PostPilotReferenceRoute(
        styleHistory,
        card,
        isPostPilotMinor ? approval.referenceRoute?.styleVersion : undefined,
      );
      if (
        isPostPilotMinor &&
        (stableStringify(approval.referenceRoute) !==
          stableStringify(approvalReferenceRoute) ||
          stableStringify(generation?.referenceRoute) !==
            stableStringify(approvalReferenceRoute))
      ) {
        errors.push(
          `${label}.referenceRoute must match its selected generation and historical style entry.`,
        );
      }
    } catch (error) {
      errors.push(`${label}.referenceRoute is invalid: ${error.message}`);
    }
    const expectedPromptSha256 = sha256(
      buildCardArtV3Prompt(manifest, cardId, approvalReferenceRoute),
    );
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
    const effectiveLegacyDecision = getEffectiveLegacyDecision(files, cardId);
    const needsRetouch =
      manifest.cards?.[cardId]?.needsRetouch === true ||
      effectiveLegacyDecision === "retouch";
    const expectedProvenance = needsRetouch
      ? "retouched-v3"
      : effectiveLegacyDecision === "keep"
        ? "legacy-v2"
        : "generated-v3";
    if (approval.provenance !== expectedProvenance) {
      errors.push(
        `${label}.provenance must be ${expectedProvenance} for its reviewed disposition.`,
      );
    }
    if (
      approval.provenance === "legacy-v2" &&
      effectiveLegacyDecision !== "keep"
    ) {
      errors.push(
        `${label} can reuse v2 bytes only after a keep audit decision.`,
      );
    }
    if (approval.provenance !== "legacy-v2") {
      const lineageSupersession = getLineageSupersession(
        supersessions?.entries ?? [],
        cardId,
        generation?.attemptNumber,
      );
      const replacementGate = replacementGateByAttemptId.get(generation?.id);
      if (lineageSupersession) {
        if (!replacementGate) {
          errors.push(
            `${label} requires a passing replacement contact-sheet gate for its full supersession lineage.`,
          );
        } else if (
          !isCanonicalUtcTimestamp(approval.reviewedAt) ||
          Date.parse(generation.generatedAt) >=
            Date.parse(replacementGate.reviewedAt) ||
          Date.parse(replacementGate.reviewedAt) >
            Date.parse(approval.reviewedAt)
        ) {
          errors.push(
            `${label} must preserve replacement generation < passing gate <= approval chronology.`,
          );
        }
      }
      if (
        !generation ||
        generation.cardId !== cardId ||
        generation.selectionStatus !== "selected" ||
        supersessionByAttemptId.has(generation.id) ||
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
    if (!isCanonicalUtcTimestamp(approval.reviewedAt)) {
      errors.push(`${label}.reviewedAt must be canonical UTC.`);
    }
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
    const correctedLegacyRetouchContract = getCorrectedLegacyRetouchContract(
      files,
      record.cardId,
    );
    const isLegacyRetouch =
      card?.needsRetouch === true || correctedLegacyRetouchContract !== null;
    const lineageSupersession = getLineageSupersession(
      supersessions?.entries ?? [],
      record.cardId,
      record.attemptNumber,
    );
    let reviewedLineageAuthorization =
      reviewedSupersessionContracts[lineageSupersession?.id]?.authorizations?.[
        record.id
      ];
    if (lineageSupersession && !reviewedLineageAuthorization) {
      try {
        const repairAuthorization = getRepairAuthorizationForAttempt(
          files,
          record.id,
          repositoryRoot,
        );
        if (repairAuthorization) {
          reviewedLineageAuthorization = {
            attemptNumber: repairAuthorization.attemptNumber,
            editSource: repairAuthorization.editSource,
            previousAttemptId: repairAuthorization.previousAttemptId,
            retryArtifactPath: repairAuthorization.retryArtifactPath,
            retryArtifactSha256: repairAuthorization.retryArtifactSha256,
          };
        }
      } catch (error) {
        errors.push(
          `${label} repair authorization is invalid: ${error.message}`,
        );
      }
    }
    const isDeterministicLocalComposite =
      !isLegacyRetouch &&
      record.generator?.tool === "Sharp" &&
      record.generator?.mode === "deterministic-local-composite";
    const isDeterministicLocalColorRepair =
      !isLegacyRetouch &&
      record.generator?.tool === "Sharp" &&
      record.generator?.mode === "deterministic-local-color-repair";
    const isDeterministicLocalRepair =
      isDeterministicLocalComposite || isDeterministicLocalColorRepair;
    let localRepairReferenceSha256 = null;
    if (record.batchId !== card?.batch) {
      errors.push(`${label}.batchId does not match the card manifest.`);
    }
    let recordReferenceRoute = null;
    try {
      const isPostPilotMinor =
        card?.arcana === "minor" && !card.batch.startsWith("pilot-");
      if (
        isPostPilotMinor &&
        typeof record.referenceRoute?.styleVersion !== "string"
      ) {
        throw new Error("missing historical styleVersion");
      }
      recordReferenceRoute = getCardArtV3PostPilotReferenceRoute(
        styleHistory,
        card,
        isPostPilotMinor ? record.referenceRoute.styleVersion : undefined,
      );
    } catch (error) {
      errors.push(`${label}.referenceRoute is invalid: ${error.message}`);
    }
    const recordPromptLockVersion = getGenerationPromptLockVersion(record);
    if (
      record.manifestSha256 !== getCardArtV3ManifestSha256(manifest) ||
      record.cardSpecSha256 !==
        getCardArtV3CardSpecSha256(
          manifest,
          record.cardId,
          recordReferenceRoute,
        )
    ) {
      errors.push(`${label} manifest or card-spec SHA-256 is stale.`);
    }
    if (
      recordReferenceRoute !== null &&
      stableStringify(record.referenceRoute) !==
        stableStringify(recordReferenceRoute)
    ) {
      errors.push(
        `${label}.referenceRoute must bind the frozen post-pilot style route.`,
      );
    }
    const expectedGenerator =
      correctedLegacyRetouchContract?.generator ??
      (card?.needsRetouch ? manifest.retouchGenerator : manifest.generator);
    if (
      !isDeterministicLocalRepair &&
      (record.generator?.tool !== expectedGenerator?.tool ||
        record.generator?.mode !== expectedGenerator?.mode)
    ) {
      errors.push(
        `${label}.generator must match the applicable manifest tool and mode.`,
      );
    }
    if (
      isDeterministicLocalRepair &&
      record.generator?.toolVersion !== "0.34.5"
    ) {
      errors.push(
        `${label}.generator.toolVersion must bind the reviewed Sharp version.`,
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
    } else if (correctedLegacyRetouchContract) {
      const contract = correctedLegacyRetouchContract;
      const expectedRepair = {
        changedInside: contract.changedInside,
        changedOutside: contract.changedOutside,
        mask: {
          path: contract.maskPath,
          sha256: contract.maskSha256,
        },
        script: {
          path: contract.scriptPath,
          sha256: contract.scriptSha256,
        },
      };
      if (
        record.id !== contract.generationRecordId ||
        record.rawOutputPath !== contract.rawOutputPath ||
        record.rawOutputSha256 !== contract.rawOutputSha256 ||
        record.retouchRecipeSha256 !== contract.scriptSha256 ||
        record.retouchRecipeDefinitionSha256 !==
          contract.recipeDefinitionSha256 ||
        record.retouchSourceSha256 !== contract.sourceSha256 ||
        stableStringify(record.repair) !== stableStringify(expectedRepair)
      ) {
        errors.push(
          `${label} must bind the exact independently reviewed corrected-legacy restoration.`,
        );
      }
      for (const [kind, path, hash] of [
        ["script", contract.scriptPath, contract.scriptSha256],
        ["mask", contract.maskPath, contract.maskSha256],
        ["source", contract.sourcePath, contract.sourceSha256],
      ]) {
        const absolutePath = resolve(repositoryRoot, path);
        if (
          !existsSync(absolutePath) ||
          sha256(readFileSync(absolutePath)) !== hash
        ) {
          errors.push(`${label} corrected-legacy ${kind} bytes do not match.`);
        }
      }
      try {
        const rendered = JSON.parse(
          execFileSync(
            process.execPath,
            [resolve(repositoryRoot, contract.scriptPath), "--check"],
            {
              cwd: repositoryRoot,
              encoding: "utf8",
              stdio: ["ignore", "pipe", "pipe"],
              timeout: 120000,
            },
          ),
        );
        if (
          rendered.outputSha256 !== contract.rawOutputSha256 ||
          rendered.maskSha256 !== contract.maskSha256 ||
          rendered.sourceSha256 !== contract.sourceSha256 ||
          rendered.changedInside !== contract.changedInside ||
          rendered.changedOutside !== contract.changedOutside ||
          rendered.recipeDefinitionSha256 !== contract.recipeDefinitionSha256
        ) {
          errors.push(
            `${label} corrected-legacy restoration is not reproducible.`,
          );
        }
      } catch (error) {
        errors.push(
          `${label} corrected-legacy restoration reproduction failed: ${error.message}`,
        );
      }
    } else if (
      record.retouchRecipeSha256 !== null ||
      record.retouchRecipeDefinitionSha256 !== null ||
      record.retouchSourceSha256 !== null
    ) {
      errors.push(
        `${label} retouch provenance must be null for generated cards.`,
      );
    }
    if (!isLegacyRetouch) {
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
      if (lineageSupersession && !reviewedLineageAuthorization) {
        errors.push(
          `${label} is an unauthorized descendant of supersession ${lineageSupersession.id}.`,
        );
      }
      if (
        lineageSupersession &&
        record.selectionStatus === "selected" &&
        !replacementGateByAttemptId.has(record.id)
      ) {
        errors.push(
          `${label} replacement selection must be committed atomically with its externally frozen passing contact-sheet gate.`,
        );
      }
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
        (previousAttempt.selectionStatus !== "rejected" &&
          !supersessionByAttemptId.has(previousAttempt.id))
      ) {
        errors.push(
          `${label} must reference the immediately preceding rejected or independently superseded selected attempt.`,
        );
      } else if (
        Date.parse(previousAttempt.generatedAt) >=
        Date.parse(record.generatedAt)
      ) {
        errors.push(`${label} must be generated after its preceding attempt.`);
      }
      if (
        lineageSupersession &&
        (typeof record.retryConstraint !== "string" ||
          record.retryConstraint.trim() === "" ||
          record.retryReview === null ||
          record.retryReview === undefined)
      ) {
        errors.push(
          `${label} must use an externally frozen bounded retry throughout its supersession lineage.`,
        );
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
      if (isDeterministicLocalComposite) {
        if (
          record.promptSha256 !== null ||
          record.effectivePromptSha256 !== null ||
          record.retryConstraint !== null ||
          record.retryReview !== null ||
          record.editSource !== null ||
          record.controlReference !== null ||
          (record.styleReference !== null &&
            record.styleReference !== undefined)
        ) {
          errors.push(
            `${label} deterministic local repair prompt and retry fields must all be null.`,
          );
        }
        localRepairReferenceSha256 =
          record.cardId === "the-devil"
            ? validateDevilDeterministicLocalComposite({
                errors,
                label,
                previousAttempt,
                record,
                repositoryRoot,
                seenAttemptsById: seenImageGenAttemptsById,
              })
            : validateDeterministicLocalComposite({
                errors,
                label,
                previousAttempt,
                record,
                repositoryRoot,
                seenAttemptsById: seenImageGenAttemptsById,
              });
      } else if (isDeterministicLocalColorRepair) {
        if (
          record.promptSha256 !== null ||
          record.effectivePromptSha256 !== null ||
          record.editSource !== null ||
          record.controlReference !== null ||
          (record.styleReference !== null &&
            record.styleReference !== undefined) ||
          typeof record.retryConstraint !== "string" ||
          record.retryConstraint.trim() === "" ||
          record.retryReview === null ||
          record.retryReview === undefined
        ) {
          errors.push(
            `${label} deterministic local color repair must keep ImageGen fields null and bind one reviewed retry artifact.`,
          );
        }
        localRepairReferenceSha256 = validateDeterministicLocalColorRepair({
          errors,
          files,
          label,
          previousAttempt,
          record,
          repositoryRoot,
          seenAttemptsById: seenImageGenAttemptsById,
        });
      } else if (record.retryConstraint === null) {
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
        if (
          record.styleReference !== null &&
          record.styleReference !== undefined
        ) {
          errors.push(
            `${label}.styleReference must be null without a constraint.`,
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
              stableStringify(
                isDeterministicLocalColorRepair
                  ? record.repair?.base
                  : (record.editSource ?? null),
              ) ||
            stableStringify(retryArtifact.controlReference) !==
              stableStringify(record.controlReference ?? null) ||
            stableStringify(retryArtifact.styleReference) !==
              stableStringify(record.styleReference ?? null) ||
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
          if (
            lineageSupersession &&
            (Date.parse(lineageSupersession.supersededAt) >=
              Date.parse(retryArtifact.reviewedAt) ||
              stableStringify({
                attemptNumber: retryArtifact.attemptNumber,
                editSource: retryArtifact.editSource,
                previousAttemptId: retryArtifact.previousAttemptId,
                retryArtifactPath: retryArtifact.projectRelativePath,
                retryArtifactSha256: retryArtifact.sha256,
              }) !==
                stableStringify({
                  attemptNumber: reviewedLineageAuthorization?.attemptNumber,
                  editSource: reviewedLineageAuthorization?.editSource,
                  previousAttemptId:
                    reviewedLineageAuthorization?.previousAttemptId,
                  retryArtifactPath:
                    reviewedLineageAuthorization?.retryArtifactPath,
                  retryArtifactSha256:
                    reviewedLineageAuthorization?.retryArtifactSha256,
                }))
          ) {
            errors.push(
              `${label} must bind the supersession's exact later bounded replacement artifact.`,
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
      if (!isDeterministicLocalRepair) {
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
                    record.controlReference !== null &&
                      record.controlReference !== undefined &&
                      record.styleReference !== null &&
                      record.styleReference !== undefined
                      ? buildCardArtV3FreshControlBasePrompt(
                          buildCardArtV3Prompt(
                            manifest,
                            record.cardId,
                            recordReferenceRoute,
                            recordPromptLockVersion,
                          ),
                          record.controlReference.id,
                        )
                      : buildCardArtV3Prompt(
                          manifest,
                          record.cardId,
                          recordReferenceRoute,
                          recordPromptLockVersion,
                        ),
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
            errors.push(
              `${label}.retryConstraint is invalid: ${error.message}`,
            );
          }
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
      !isDeterministicLocalRepair &&
      record.promptSha256 !==
        sha256(
          buildCardArtV3Prompt(
            manifest,
            record.cardId,
            recordReferenceRoute,
            recordPromptLockVersion,
          ),
        )
    ) {
      errors.push(`${label}.promptSha256 does not match the current prompt.`);
    }
    let expectedReferenceSha256 = {};
    try {
      if (isDeterministicLocalRepair) {
        expectedReferenceSha256 = localRepairReferenceSha256 ?? {};
      } else if (
        record.editSource !== null &&
        record.editSource !== undefined
      ) {
        const sourceAttempt = seenImageGenAttemptsById.get(
          record.editSource.attemptId,
        );
        const sourceSupersession = supersessionByAttemptId.get(
          sourceAttempt?.id,
        );
        if (
          !sourceAttempt ||
          sourceAttempt.cardId !== record.cardId ||
          (sourceAttempt.selectionStatus !== "rejected" &&
            !(
              sourceAttempt.selectionStatus === "selected" && sourceSupersession
            )) ||
          sourceAttempt.attemptNumber >= record.attemptNumber ||
          sourceAttempt.rawOutputPath !== record.editSource.path ||
          sourceAttempt.rawOutputSha256 !== record.editSource.sha256 ||
          Date.parse(sourceAttempt.generatedAt) >=
            Date.parse(record.generatedAt) ||
          (sourceSupersession &&
            (Date.parse(sourceSupersession.supersededAt) >=
              Date.parse(record.retryReview?.reviewedAt) ||
              sourceSupersession.id !== lineageSupersession?.id))
        ) {
          throw new Error(
            "editSource must bind an immutable rejected or superseded selected attempt of the same card with valid chronology",
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
      } else if (
        record.controlReference !== null &&
        record.controlReference !== undefined &&
        record.styleReference !== null &&
        record.styleReference !== undefined
      ) {
        const controlPath = resolve(
          repositoryRoot,
          record.controlReference.path ?? "",
        );
        const stylePath = resolve(
          repositoryRoot,
          record.styleReference.path ?? "",
        );
        const styleApproval =
          files.approvals?.records?.[record.styleReference.id];
        if (
          record.controlReference.path !==
            `art/card-art-v3-controls/${record.controlReference.id}.png` ||
          !existsSync(controlPath) ||
          sha256(readFileSync(controlPath)) !==
            record.controlReference.sha256 ||
          record.styleReference.path !==
            `public/cards/v3/${record.styleReference.id}.jpg` ||
          styleApproval?.status !== "approved" ||
          styleApproval?.assetSha256 !== record.styleReference.sha256 ||
          !existsSync(stylePath) ||
          sha256(readFileSync(stylePath)) !== record.styleReference.sha256
        ) {
          throw new Error(
            "fresh control and style references must bind their reviewed bytes",
          );
        }
        expectedReferenceSha256 = {
          [record.controlReference.id]: record.controlReference.sha256,
          [record.styleReference.id]: record.styleReference.sha256,
        };
      } else {
        expectedReferenceSha256 = Object.fromEntries(
          resolveReferenceRecords(
            files,
            record.cardId,
            repositoryRoot,
            recordReferenceRoute,
            record.generatedAt,
          ).map(({ id, sha256: hash }) => [id, hash]),
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
    if (!isLegacyRetouch) {
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
      const supersession = supersessionByAttemptId.get(record.id);
      if (
        !supersession &&
        supersededNormalizedShaByCard
          .get(record.cardId)
          ?.has(normalized?.assetSha256)
      ) {
        errors.push(
          `${label}.normalized.assetSha256 must differ from every superseded selection for the same card.`,
        );
      }
      const normalizedAsset = resolve(
        repositoryRoot,
        supersession?.archive?.path ?? normalized?.assetPath ?? "",
      );
      if (!isProjectRelativePath(normalized?.assetPath)) {
        errors.push(`${label}.normalized.assetPath must be project-relative.`);
      }
      if (!existsSync(normalizedAsset)) {
        errors.push(
          supersession
            ? `${label} superseded normalized archive is missing.`
            : `${label}.normalized.assetPath is missing.`,
        );
      } else if (
        sha256(readFileSync(normalizedAsset)) !== normalized.assetSha256
      ) {
        errors.push(
          supersession
            ? `${label} superseded normalized archive SHA-256 does not match.`
            : `${label}.normalized.assetSha256 does not match.`,
        );
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
  let previousStyleReviewedAt = null;
  for (const [index, entry] of (styleHistory.entries ?? []).entries()) {
    const label = `styleHistory.entries[${index}]`;
    requireString(entry.version, `${label}.version`);
    requireString(entry.reviewedAt, `${label}.reviewedAt`);
    requireString(entry.reviewer, `${label}.reviewer`);
    if (styleVersions.has(entry.version)) {
      errors.push(`${label}.version must be append-only and unique.`);
    }
    styleVersions.add(entry.version);
    if (!isCanonicalUtcTimestamp(entry.reviewedAt)) {
      errors.push(`${label}.reviewedAt must be canonical UTC.`);
    } else if (
      previousStyleReviewedAt !== null &&
      Date.parse(entry.reviewedAt) <= Date.parse(previousStyleReviewedAt)
    ) {
      errors.push(`${label}.reviewedAt must increase append-only.`);
    } else {
      previousStyleReviewedAt = entry.reviewedAt;
    }
    const routedIds = new Set();
    if (
      entry.referenceRouting?.commonInstruction !==
      postPilotReferenceInstructions.common
    ) {
      errors.push(`${label}.referenceRouting.commonInstruction is invalid.`);
    }
    for (const kind of ["numbered", "court"]) {
      const route = entry.referenceRouting?.[kind];
      if (route?.instruction !== postPilotReferenceInstructions[kind]) {
        errors.push(
          `${label}.referenceRouting.${kind}.instruction is invalid.`,
        );
      }
      if (
        stableStringify(route?.pairs) !==
        stableStringify(reviewedPostPilotReferencePairs[kind])
      ) {
        errors.push(
          `${label}.referenceRouting.${kind}.pairs must exactly match the independently reviewed route.`,
        );
      }
      requireExactIds(
        Object.keys(route?.pairs ?? {}),
        minorArcanaSuitIds,
        `${label}.referenceRouting.${kind}.pairs`,
      );
      for (const suit of minorArcanaSuitIds) {
        const ids = route?.pairs?.[suit];
        if (
          !Array.isArray(ids) ||
          ids.length !== 2 ||
          ids[0] !== `${suit}-ace` ||
          ids.some(
            (id) =>
              !pilotIds.includes(id) || manifest.cards?.[id]?.suit !== suit,
          ) ||
          (kind === "numbered" &&
            !/^\d+$/u.test(manifest.cards?.[ids?.[1]]?.rank ?? "")) ||
          (kind === "court" &&
            !courtRankIds.has(manifest.cards?.[ids?.[1]]?.rank))
        ) {
          errors.push(
            `${label}.referenceRouting.${kind}.pairs.${suit} must bind Ace plus one same-suit ${kind} pilot.`,
          );
          continue;
        }
        for (const id of ids) routedIds.add(id);
      }
    }
    for (const plannedId of plannedSuitAnchorIds) {
      if (!routedIds.has(plannedId)) {
        errors.push(
          `${label}.referenceRouting must preserve planned anchor ${plannedId}.`,
        );
      }
    }
    const orderedRoutedIds = pilotIds.filter((id) => routedIds.has(id));
    requireExactIds(
      entry.promotedSuitAnchorIds,
      orderedRoutedIds,
      `${label}.promotedSuitAnchorIds`,
    );
    requireExactIds(
      Object.keys(entry.assetSha256 ?? {}),
      orderedRoutedIds,
      `${label}.assetSha256`,
    );
    for (const cardId of orderedRoutedIds) {
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
    const expectedPilotAssetSha256 = {};
    for (const cardId of pilotIds) {
      const approval = approvals.records?.[cardId];
      const generation = generationById.get(approval?.generationRecordId);
      if (
        approval?.status !== "approved" ||
        typeof approval.assetSha256 !== "string" ||
        approval.assetSha256 === "" ||
        generation?.cardId !== cardId ||
        generation.selectionStatus !== "selected" ||
        generation.normalized?.assetSha256 !== approval.assetSha256
      ) {
        errors.push(
          `${label}.pilotContactSheet requires an approved selected asset for ${cardId}.`,
        );
      }
      expectedPilotAssetSha256[cardId] = approval?.assetSha256;
    }
    requireExactIds(
      entry.pilotContactSheet?.cardIds,
      pilotIds,
      `${label}.pilotContactSheet.cardIds`,
    );
    if (
      entry.pilotContactSheet?.assetMapSha256 !==
      sha256(
        stableStringify({
          assetSha256: expectedPilotAssetSha256,
          cardIds: pilotIds,
        }),
      )
    ) {
      errors.push(
        `${label}.pilotContactSheet.assetMapSha256 must bind all 16 approved pilots.`,
      );
    }
    if (
      entry.pilotContactSheet?.assetMapSha256 !==
      reviewedPilotContactSheetContract.assetMapSha256
    ) {
      errors.push(
        `${label}.pilotContactSheet.assetMapSha256 must match the independently reviewed pilot map.`,
      );
    }
    if (
      stableStringify(entry.pilotContactSheet?.recipe) !==
        stableStringify(pilotContactSheetRecipe) ||
      entry.pilotContactSheet?.recipeFingerprintSha256 !==
        sha256(stableStringify(pilotContactSheetRecipe)) ||
      entry.pilotContactSheet?.recipeFingerprintSha256 !==
        reviewedPilotContactSheetContract.recipeFingerprintSha256
    ) {
      errors.push(
        `${label}.pilotContactSheet recipe must match the reviewed 4x4 and 140-pixel layouts.`,
      );
    }
    for (const artifactId of ["full", "mobile"]) {
      const artifact = entry.pilotContactSheet?.[artifactId];
      const contract = reviewedPilotContactSheetContract[artifactId];
      requireString(
        artifact?.artifactPath,
        `${label}.pilotContactSheet.${artifactId}.artifactPath`,
      );
      requireString(
        artifact?.artifactSha256,
        `${label}.pilotContactSheet.${artifactId}.artifactSha256`,
      );
      if (
        artifact?.artifactPath !== contract.artifactPath ||
        artifact?.artifactSha256 !== contract.artifactSha256
      ) {
        errors.push(
          `${label}.pilotContactSheet.${artifactId} must match the reviewed artifact contract.`,
        );
      }
      if (!isProjectRelativePath(artifact?.artifactPath)) {
        errors.push(
          `${label}.pilotContactSheet.${artifactId}.artifactPath must be project-relative.`,
        );
      } else {
        const artifactPath = resolve(repositoryRoot, artifact.artifactPath);
        if (!existsSync(artifactPath)) {
          errors.push(
            `${label}.pilotContactSheet.${artifactId}.artifactPath is missing.`,
          );
        } else if (
          sha256(readFileSync(artifactPath)) !== artifact.artifactSha256
        ) {
          errors.push(
            `${label}.pilotContactSheet.${artifactId}.artifactSha256 does not match.`,
          );
        } else {
          const image = readJpegMetadata(readFileSync(artifactPath));
          if (
            image.width !== contract.width ||
            image.height !== contract.height ||
            image.components !== 3
          ) {
            errors.push(
              `${label}.pilotContactSheet.${artifactId} must be the reviewed ${contract.width}x${contract.height} three-component JPEG layout.`,
            );
          }
        }
      }
    }
    if (
      entry.pilotContactSheet?.full?.artifactPath ===
      entry.pilotContactSheet?.mobile?.artifactPath
    ) {
      errors.push(
        `${label}.pilotContactSheet full and mobile artifacts must be distinct.`,
      );
    }
    const independentReviews = entry.pilotContactSheet?.independentReviews;
    if (!Array.isArray(independentReviews) || independentReviews.length !== 3) {
      errors.push(
        `${label}.pilotContactSheet.independentReviews must contain exactly three reviews.`,
      );
    } else {
      const reviewers = new Set();
      for (const [reviewIndex, review] of independentReviews.entries()) {
        const reviewLabel = `${label}.pilotContactSheet.independentReviews[${reviewIndex}]`;
        requireString(review.reviewer, `${reviewLabel}.reviewer`);
        requireString(review.scope, `${reviewLabel}.scope`);
        if (!isCanonicalUtcTimestamp(review.reviewedAt)) {
          errors.push(`${reviewLabel}.reviewedAt must be canonical UTC.`);
        } else if (
          isCanonicalUtcTimestamp(entry.reviewedAt) &&
          Date.parse(review.reviewedAt) > Date.parse(entry.reviewedAt)
        ) {
          errors.push(
            `${reviewLabel}.reviewedAt cannot follow the style freeze.`,
          );
        }
        if (review.independent !== true || review.result !== "approved") {
          errors.push(`${reviewLabel} must be independently approved.`);
        }
        if (reviewers.has(review.reviewer)) {
          errors.push(`${reviewLabel}.reviewer must be unique.`);
        }
        reviewers.add(review.reviewer);
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
        pilotContactSheet: {
          assetMapSha256: entry.pilotContactSheet?.assetMapSha256,
          full: entry.pilotContactSheet?.full,
          mobile: entry.pilotContactSheet?.mobile,
          recipeFingerprintSha256:
            entry.pilotContactSheet?.recipeFingerprintSha256,
        },
        prompt: manifest.prompt,
        referencePolicy: manifest.referencePolicy,
        referenceRouting: entry.referenceRouting,
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
    const expectedRuntimeMap = {
      cardCount: canonicalTarotCardIds.length,
      cardIds: canonicalTarotCardIds,
      cards: Object.fromEntries(
        canonicalTarotCardIds.map((cardId) => [
          cardId,
          {
            assetSha256: release.assetSha256?.[cardId],
            src: `/cards/v3/${cardId}.jpg`,
          },
        ]),
      ),
      runtimeMapSha256: expectedRuntimeMapSha256,
      version: "v3",
    };

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
    const expectedDeckSourceSha256 = canonicalTarotCardIds.map(
      (cardId) => release.assetSha256?.[cardId],
    );
    if (
      deckReview?.recipeFingerprintSha256 !==
        sha256(stableStringify(cardArtV3DeckContactSheetRecipe)) ||
      stableStringify(deckReview?.sourceSha256) !==
        stableStringify(expectedDeckSourceSha256)
    ) {
      errors.push(
        `${label}.independentReviews.deckContactSheet must lock the deterministic 13x6 recipe and all 78 ordered source SHAs.`,
      );
    }
    if (isProjectRelativePath(deckReview?.artifactPath)) {
      const deckArtifactPath = resolve(repositoryRoot, deckReview.artifactPath);
      if (existsSync(deckArtifactPath)) {
        const deckBuffer = readFileSync(deckArtifactPath);
        const deckImage = readJpegMetadata(deckBuffer);
        if (
          deckReview?.bytes !== deckBuffer.length ||
          deckReview?.width !== cardArtV3DeckContactSheetRecipe.output.width ||
          deckReview?.height !==
            cardArtV3DeckContactSheetRecipe.output.height ||
          deckImage.width !== cardArtV3DeckContactSheetRecipe.output.width ||
          deckImage.height !== cardArtV3DeckContactSheetRecipe.output.height
        ) {
          errors.push(
            `${label}.independentReviews.deckContactSheet frame or byte count is invalid.`,
          );
        }
        try {
          const cacheKey = `deck:${stableStringify({
            artifactSha256: deckReview.artifactSha256,
            recipeFingerprintSha256: deckReview.recipeFingerprintSha256,
            repositoryRoot,
            sourceSha256: deckReview.sourceSha256,
          })}`;
          let rendered = contactSheetCheckCache.get(cacheKey);
          if (!rendered) {
            rendered = JSON.parse(
              execFileSync(
                process.execPath,
                [
                  resolve(
                    repositoryRoot,
                    "scripts/card-art-v3-deck-contact-sheet.mjs",
                  ),
                ],
                {
                  cwd: repositoryRoot,
                  encoding: "utf8",
                  stdio: ["ignore", "pipe", "pipe"],
                  timeout: 120000,
                },
              ),
            );
            contactSheetCheckCache.set(cacheKey, rendered);
          }
          if (
            rendered.recipeFingerprintSha256 !==
              deckReview.recipeFingerprintSha256 ||
            stableStringify(rendered.sourceSha256) !==
              stableStringify(deckReview.sourceSha256) ||
            rendered.output?.sha256 !== deckReview.artifactSha256 ||
            rendered.output?.bytes !== deckReview.bytes
          ) {
            errors.push(
              `${label}.independentReviews.deckContactSheet must exactly reproduce from the released assets.`,
            );
          }
        } catch (error) {
          errors.push(
            `${label}.independentReviews.deckContactSheet could not be reproduced: ${error.message}`,
          );
        }
      }
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
    const runtimeReview = release.independentReviews?.runtimeMap;
    if (isProjectRelativePath(runtimeReview?.artifactPath)) {
      const runtimeArtifactPath = resolve(
        repositoryRoot,
        runtimeReview.artifactPath,
      );
      if (existsSync(runtimeArtifactPath)) {
        try {
          const runtimeArtifact = JSON.parse(
            readFileSync(runtimeArtifactPath, "utf8"),
          );
          if (
            stableStringify(runtimeArtifact) !==
            stableStringify(expectedRuntimeMap)
          ) {
            errors.push(
              `${label}.independentReviews.runtimeMap artifact must equal the complete approved release map.`,
            );
          }
        } catch (error) {
          errors.push(
            `${label}.independentReviews.runtimeMap artifact is invalid JSON: ${error.message}`,
          );
        }
      }
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

function getRepairAuthorizationForAttempt(
  files,
  attemptId,
  repositoryRoot = defaultRepositoryRoot,
) {
  const authorization = (files.repairAuthorizations?.entries ?? []).find(
    (entry) => entry?.binding?.attemptId === attemptId,
  );
  if (!authorization) return null;
  assertCardArtV3RepairAuthorization(authorization);
  const binding = authorization.binding;
  const expectedBindingKeys = [
    "attemptId",
    "base",
    "mask",
    "maskSource",
    "neutralOutputPath",
    "recipe",
    "retryArtifact",
    "script",
  ];
  if (
    JSON.stringify(Object.keys(binding)) !== JSON.stringify(expectedBindingKeys)
  ) {
    throw new Error("Repair authorization binding shape has drifted.");
  }
  for (const [label, artifact] of Object.entries(binding)) {
    if (label === "attemptId" || label === "neutralOutputPath") continue;
    if (
      !isProjectRelativePath(artifact?.path) ||
      !/^[a-f0-9]{64}$/.test(artifact?.sha256 ?? "")
    ) {
      throw new Error(`Repair authorization ${label} binding is invalid.`);
    }
    const absolutePath = resolve(repositoryRoot, artifact.path);
    if (
      !existsSync(absolutePath) ||
      sha256(readFileSync(absolutePath)) !== artifact.sha256
    ) {
      throw new Error(`Repair authorization ${label} bytes have drifted.`);
    }
  }
  if (!isProjectRelativePath(binding.neutralOutputPath)) {
    throw new Error("Repair authorization neutral output path is invalid.");
  }
  const retryArtifact = loadRetryConstraintArtifact(
    binding.retryArtifact.path,
    attemptId.replace(/-attempt-[0-9]{3}$/, ""),
    repositoryRoot,
  );
  const recipe = JSON.parse(
    readFileSync(resolve(repositoryRoot, binding.recipe.path), "utf8"),
  );
  const expectedAttemptId = `${retryArtifact.cardId}-attempt-${String(
    retryArtifact.attemptNumber,
  ).padStart(3, "0")}`;
  if (
    expectedAttemptId !== attemptId ||
    retryArtifact.repairRecipePath !== binding.recipe.path ||
    retryArtifact.repairRecipeSha256 !== binding.recipe.sha256 ||
    stableStringify(retryArtifact.editSource) !==
      stableStringify(binding.base) ||
    recipe.id !== "cups-page-local-repair-001" ||
    recipe.cardId !== retryArtifact.cardId ||
    recipe.mode !== "deterministic-local-color-repair" ||
    stableStringify(recipe.base) !== stableStringify(binding.base) ||
    stableStringify(recipe.mask) !==
      stableStringify({
        path: binding.mask.path,
        sha256: binding.mask.sha256,
        width: 1060,
        height: 1484,
        forbiddenIntersectionCount: 0,
      }) ||
    recipe.maskSource?.path !== binding.maskSource.path ||
    recipe.maskSource?.sha256 !== binding.maskSource.sha256 ||
    recipe.script?.path !== binding.script.path ||
    recipe.script?.sha256 !== binding.script.sha256 ||
    recipe.neutralOutputPath !== binding.neutralOutputPath ||
    recipe.replacementGate?.id !==
      "court-validation-a-cups-page-replacement-002" ||
    recipe.replacementGate?.fullReviewPath !==
      "art/card-art-v3-reviews/court-validation-a-contact-sheet-v3.jpg" ||
    recipe.replacementGate?.mobileReviewPath !==
      "art/card-art-v3-reviews/court-validation-a-contact-sheet-mobile-v3.jpg"
  ) {
    throw new Error(
      "Repair authorization does not bind its exact reviewed retry and recipe chain.",
    );
  }
  return {
    authorization,
    attemptNumber: retryArtifact.attemptNumber,
    editSource: retryArtifact.editSource,
    gateContract: recipe.replacementGate,
    neutralOutputPath: binding.neutralOutputPath,
    previousAttemptId: retryArtifact.previousAttemptId,
    recipe,
    retryArtifactPath: retryArtifact.projectRelativePath,
    retryArtifactSha256: retryArtifact.sha256,
  };
}

function validateRepairAuthorizations({
  errors,
  repairAuthorizations,
  repositoryRoot,
}) {
  if (
    repairAuthorizations?.schemaVersion !== 1 ||
    repairAuthorizations?.systemId !== "quiet-celestial-storybook-full-deck" ||
    repairAuthorizations?.version !== "v3" ||
    !Array.isArray(repairAuthorizations?.entries)
  ) {
    errors.push("repairAuthorizations must match the reviewed v3 schema.");
    return;
  }
  const ids = new Set();
  for (const [index, authorization] of repairAuthorizations.entries.entries()) {
    const label = `repairAuthorizations.entries[${index}]`;
    if (
      typeof authorization?.id !== "string" ||
      ids.has(authorization.id) ||
      !isCanonicalUtcTimestamp(authorization.authorizedAt)
    ) {
      errors.push(`${label} must have a unique id and canonical timestamp.`);
    }
    ids.add(authorization?.id);
    const latestReviewAt = (authorization?.independentReviews ?? [])
      .map(({ reviewedAt }) => reviewedAt)
      .sort()
      .at(-1);
    if (
      !isCanonicalUtcTimestamp(latestReviewAt) ||
      Date.parse(latestReviewAt) >= Date.parse(authorization.authorizedAt)
    ) {
      errors.push(
        `${label} must be authorized after every independent review.`,
      );
    }
    try {
      getRepairAuthorizationForAttempt(
        { repairAuthorizations },
        authorization?.binding?.attemptId,
        repositoryRoot,
      );
    } catch (error) {
      errors.push(`${label} is invalid: ${error.message}`);
    }
  }
}

function validateDevilDeterministicLocalComposite({
  errors,
  label,
  previousAttempt,
  record,
  repositoryRoot,
  seenAttemptsById,
}) {
  const repair = record.repair;
  const expectedRecipe = Object.freeze({
    id: "the-devil-local-repair-001",
    path: "art/card-art-v3-repair-recipes/the-devil-local-repair-001.json",
    sha256: "9c4216490b1ceb7b25f1cd4b606239fa4f22b89fd8d3e78ac0a9c0c3611ae3a1",
  });
  const expectedScript = Object.freeze({
    path: "scripts/card-art-v3-thedevil-repair.mjs",
    sha256: "5bbd6c36a0528188c1da386c34af52cb4b012f77dd3d5d83a6e6c8a12dbaf8fd",
  });
  const expectedOutputSha256 =
    "648c7f38d91294f21b25c99d494818b8894385a0e25b2d5494ac39767df627e2";
  const layerNames = Object.freeze([
    "leftErase",
    "leftNew",
    "rightErase",
    "rightConnector",
    "rightNew",
  ]);
  const expectedBboxes = Object.freeze({
    leftErase: Object.freeze({
      maxX: 454,
      maxY: 909,
      minX: 320,
      minY: 720,
      nonzero: 18777,
    }),
    leftNew: Object.freeze({
      maxX: 464,
      maxY: 769,
      minX: 295,
      minY: 600,
      nonzero: 18166,
    }),
    rightErase: Object.freeze({
      maxX: 704,
      maxY: 979,
      minX: 601,
      minY: 750,
      nonzero: 18481,
    }),
    rightConnector: Object.freeze({
      maxX: 718,
      maxY: 958,
      minX: 627,
      minY: 886,
      nonzero: 3080,
    }),
    rightNew: Object.freeze({
      maxX: 709,
      maxY: 769,
      minX: 495,
      minY: 500,
      nonzero: 25659,
    }),
  });
  const expectedLayerChanges = Object.freeze({
    leftErase: 18431,
    leftNew: 16095,
    rightErase: 18090,
    rightConnector: 754,
    rightNew: 24986,
  });
  const expectedMappingResidual = Object.freeze({
    left: 0.46465598491982973,
    right: 0.46465598491982973,
  });
  const expectedRepairKeys = Object.freeze([
    "base",
    "bboxes",
    "centralBridgeChanged",
    "changedInside",
    "changedOutside",
    "donors",
    "expectedOutputSha256",
    "layerChanges",
    "leftRightOverlap",
    "mappingResidual",
    "masks",
    "recipe",
    "registeredDonors",
    "reviewedAt",
    "rightGuideChanged",
    "script",
    "unionNonzero",
  ]);
  if (
    !repair ||
    stableStringify(Object.keys(repair).sort()) !==
      stableStringify(expectedRepairKeys) ||
    stableStringify(repair.recipe) !== stableStringify(expectedRecipe) ||
    stableStringify(repair.script) !== stableStringify(expectedScript) ||
    repair.expectedOutputSha256 !== expectedOutputSha256 ||
    record.rawOutputSha256 !== expectedOutputSha256 ||
    repair.changedInside !== 77004 ||
    repair.changedOutside !== 0 ||
    repair.leftRightOverlap !== 0 ||
    repair.centralBridgeChanged !== 0 ||
    repair.rightGuideChanged !== 0 ||
    repair.unionNonzero !== 78560 ||
    stableStringify(repair.layerChanges) !==
      stableStringify(expectedLayerChanges) ||
    stableStringify(repair.mappingResidual) !==
      stableStringify(expectedMappingResidual) ||
    stableStringify(repair.bboxes) !== stableStringify(expectedBboxes) ||
    !isCanonicalUtcTimestamp(repair.reviewedAt)
  ) {
    errors.push(
      `${label}.repair must exactly match the reviewed Devil five-layer deterministic repair contract.`,
    );
    return {};
  }

  const recipeAbsolutePath = resolve(repositoryRoot, expectedRecipe.path);
  const scriptAbsolutePath = resolve(repositoryRoot, expectedScript.path);
  let recipe = null;
  if (
    !existsSync(recipeAbsolutePath) ||
    sha256(readFileSync(recipeAbsolutePath)) !== expectedRecipe.sha256
  ) {
    errors.push(`${label}.repair.recipe does not match its frozen bytes.`);
  } else {
    try {
      recipe = JSON.parse(readFileSync(recipeAbsolutePath, "utf8"));
    } catch {
      errors.push(`${label}.repair.recipe must contain valid JSON.`);
    }
  }
  if (
    !existsSync(scriptAbsolutePath) ||
    sha256(readFileSync(scriptAbsolutePath)) !== expectedScript.sha256
  ) {
    errors.push(`${label}.repair.script does not match its frozen bytes.`);
  }
  if (!recipe) return {};

  const expectedReviewers = [
    "Planck (independent two-loop tarot meaning and four-hand audit)",
    "Harvey (independent full/mobile mask, anatomy and seam audit)",
    "Halley (independent registration, byte-identity and provenance audit)",
  ];
  const expectedReviewChecks = [
    "exactRegistration",
    "maskBounds",
    "leftRightDisjoint",
    "outsideUnionPixelIdentity",
    "protectedGuideIdentity",
    "centralBridgeAbsent",
    "fourNaturalHands",
    "mobileSeparation",
  ];
  if (
    recipe.schemaVersion !== 1 ||
    recipe.id !== expectedRecipe.id ||
    recipe.cardId !== record.cardId ||
    recipe.tool !== record.generator.tool ||
    recipe.toolVersion !== record.generator.toolVersion ||
    recipe.mode !== record.generator.mode ||
    stableStringify(recipe.script) !== stableStringify(expectedScript) ||
    recipe.frame?.width !== 1060 ||
    recipe.frame?.height !== 1484 ||
    recipe.frame?.channels !== 3 ||
    stableStringify(recipe.precedence) !== stableStringify(layerNames) ||
    stableStringify(Object.keys(recipe.layers ?? {})) !==
      stableStringify(layerNames) ||
    recipe.outputPath !== record.rawOutputPath ||
    recipe.expectedOutputSha256 !== expectedOutputSha256 ||
    recipe.review?.result !== "approved" ||
    recipe.review?.reviewedAt !== repair.reviewedAt ||
    stableStringify(recipe.review?.reviewers) !==
      stableStringify(expectedReviewers) ||
    stableStringify(Object.keys(recipe.review?.checks ?? {})) !==
      stableStringify(expectedReviewChecks) ||
    expectedReviewChecks.some((check) => recipe.review.checks[check] !== true)
  ) {
    errors.push(
      `${label}.repair recipe must exactly bind the independently reviewed Devil inputs, layers, output, reviewers, and checks.`,
    );
  }

  if (
    stableStringify(repair.base) !== stableStringify(recipe.base) ||
    stableStringify(repair.donors) !== stableStringify(recipe.donors) ||
    stableStringify(repair.registeredDonors) !==
      stableStringify(recipe.registeredDonors)
  ) {
    errors.push(
      `${label}.repair sources and registered donors must exactly match the frozen recipe.`,
    );
    return {};
  }

  const sourceEntries = [
    ["base", repair.base],
    ["donors.left", repair.donors?.left],
    ["donors.right", repair.donors?.right],
  ];
  for (const [name, source] of sourceEntries) {
    const sourceAttempt = seenAttemptsById.get(source?.attemptId);
    if (
      !sourceAttempt ||
      sourceAttempt.cardId !== record.cardId ||
      sourceAttempt.selectionStatus !== "rejected" ||
      sourceAttempt.attemptNumber >= record.attemptNumber ||
      sourceAttempt.rawOutputPath !== source.path ||
      sourceAttempt.rawOutputSha256 !== source.sha256 ||
      Date.parse(sourceAttempt.generatedAt) >= Date.parse(repair.reviewedAt)
    ) {
      errors.push(
        `${label}.repair.${name} must bind an earlier rejected Devil attempt generated before review.`,
      );
    }
  }
  if (
    new Set(sourceEntries.map(([, source]) => source?.attemptId)).size !== 3 ||
    previousAttempt?.id !== repair.donors?.right?.attemptId ||
    Date.parse(previousAttempt?.generatedAt) >= Date.parse(repair.reviewedAt) ||
    Date.parse(repair.reviewedAt) >= Date.parse(record.generatedAt)
  ) {
    errors.push(
      `${label}.repair must preserve three distinct sources and predecessor generation < independent review < repair generation order.`,
    );
  }

  for (const [side, registered] of Object.entries(
    repair.registeredDonors ?? {},
  )) {
    const absolutePath = resolve(repositoryRoot, registered?.path ?? "");
    if (
      !["left", "right"].includes(side) ||
      !isProjectRelativePath(registered?.path) ||
      !/^[a-f0-9]{64}$/.test(registered?.sha256 ?? "") ||
      !existsSync(absolutePath)
    ) {
      errors.push(
        `${label}.repair.registeredDonors.${side} must bind a present project PNG.`,
      );
      continue;
    }
    const bytes = readFileSync(absolutePath);
    const frame = readPngFrame(bytes);
    if (
      sha256(bytes) !== registered.sha256 ||
      frame.width !== 1060 ||
      frame.height !== 1484
    ) {
      errors.push(
        `${label}.repair.registeredDonors.${side} bytes or frame have drifted.`,
      );
    }
  }

  const expectedMasks = Object.fromEntries(
    layerNames.map((name) => [
      name,
      {
        bbox: expectedBboxes[name],
        height: 1484,
        path: recipe.layers[name]?.path,
        sha256: recipe.layers[name]?.sha256,
        width: 1060,
      },
    ]),
  );
  if (stableStringify(repair.masks) !== stableStringify(expectedMasks)) {
    errors.push(
      `${label}.repair.masks must exactly bind all five reviewed masks and bounds.`,
    );
    return {};
  }
  for (const name of layerNames) {
    const mask = repair.masks?.[name];
    const absolutePath = resolve(repositoryRoot, mask?.path ?? "");
    if (!isProjectRelativePath(mask?.path) || !existsSync(absolutePath)) {
      errors.push(`${label}.repair.masks.${name} is missing.`);
      continue;
    }
    const bytes = readFileSync(absolutePath);
    const frame = readPngFrame(bytes);
    if (
      sha256(bytes) !== mask.sha256 ||
      frame.width !== mask.width ||
      frame.height !== mask.height
    ) {
      errors.push(`${label}.repair.masks.${name} bytes or frame have drifted.`);
    }
  }
  const overlay = recipe.maskReviewOverlay;
  const overlayAbsolutePath = resolve(repositoryRoot, overlay?.path ?? "");
  if (
    !isProjectRelativePath(overlay?.path) ||
    !/^[a-f0-9]{64}$/.test(overlay?.sha256 ?? "") ||
    !existsSync(overlayAbsolutePath) ||
    sha256(readFileSync(overlayAbsolutePath)) !== overlay.sha256
  ) {
    errors.push(`${label}.repair mask review overlay has drifted.`);
  }

  const cacheKey = stableStringify({
    masks: Object.fromEntries(
      layerNames.map((name) => [name, repair.masks[name].sha256]),
    ),
    output: record.rawOutputSha256,
    recipe: expectedRecipe.sha256,
    registeredDonors: repair.registeredDonors,
    script: expectedScript.sha256,
  });
  let rendered = deterministicRepairCheckCache.get(cacheKey);
  if (!rendered) {
    try {
      rendered = JSON.parse(
        execFileSync(process.execPath, [scriptAbsolutePath, "--check"], {
          cwd: repositoryRoot,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
          timeout: 120000,
        }),
      );
      deterministicRepairCheckCache.set(cacheKey, rendered);
    } catch (error) {
      errors.push(
        `${label}.repair could not reproduce the frozen Devil output: ${error.message}`,
      );
    }
  }
  if (
    rendered &&
    (rendered.baseSha256 !== repair.base.sha256 ||
      rendered.recipeSha256 !== expectedRecipe.sha256 ||
      rendered.outputPath !== record.rawOutputPath ||
      rendered.toolVersion !== record.generator.toolVersion ||
      stableStringify(rendered.artifacts) !==
        stableStringify({
          masks: Object.fromEntries(
            layerNames.map((name) => [name, repair.masks[name].sha256]),
          ),
          output: expectedOutputSha256,
          registeredLeft: repair.registeredDonors.left.sha256,
          registeredRight: repair.registeredDonors.right.sha256,
        }) ||
      stableStringify(rendered.bboxes) !== stableStringify(repair.bboxes) ||
      rendered.centralBridgeChanged !== repair.centralBridgeChanged ||
      rendered.changedInside !== repair.changedInside ||
      rendered.changedOutside !== repair.changedOutside ||
      stableStringify(rendered.layerChanges) !==
        stableStringify(repair.layerChanges) ||
      rendered.leftRightOverlap !== repair.leftRightOverlap ||
      stableStringify(rendered.mappingResidual) !==
        stableStringify(repair.mappingResidual) ||
      rendered.rightGuideChanged !== repair.rightGuideChanged ||
      rendered.unionNonzero !== repair.unionNonzero)
  ) {
    errors.push(
      `${label}.repair reproduction result does not match its immutable five-layer provenance.`,
    );
  }

  return {
    [repair.base.attemptId]: repair.base.sha256,
    [repair.donors.left.attemptId]: repair.donors.left.sha256,
    [repair.donors.right.attemptId]: repair.donors.right.sha256,
    [expectedRecipe.id]: expectedRecipe.sha256,
    "the-devil-local-repair-script": expectedScript.sha256,
    "the-devil-left-donor-registered-001": repair.registeredDonors.left.sha256,
    "the-devil-right-donor-registered-001":
      repair.registeredDonors.right.sha256,
    ...Object.fromEntries(
      layerNames.map((name) => [
        `the-devil-local-repair-${name}-mask-001`,
        repair.masks[name].sha256,
      ]),
    ),
  };
}

function validateDeterministicLocalComposite({
  errors,
  label,
  previousAttempt,
  record,
  repositoryRoot,
  seenAttemptsById,
}) {
  const repair = record.repair;
  const expectedRecipeId = `${record.cardId}-local-repair-001`;
  const expectedRecipePath = `art/card-art-v3-repair-recipes/${expectedRecipeId}.json`;
  const expectedScriptPath = `scripts/card-art-v3-${record.cardId.replaceAll("-", "")}-repair.mjs`;
  const expectedMaskPath = `art/card-art-v3-controls/${expectedRecipeId.replace("repair-001", "repair-mask-001")}.png`;
  if (
    !repair ||
    repair.recipe?.id !== expectedRecipeId ||
    repair.recipe?.path !== expectedRecipePath ||
    repair.script?.path !== expectedScriptPath ||
    repair.mask?.path !== expectedMaskPath ||
    repair.mask?.width !== 1060 ||
    repair.mask?.height !== 1484 ||
    repair.expectedOutputSha256 !== record.rawOutputSha256 ||
    repair.changedInside !== 57212 ||
    repair.changedOutside !== 0 ||
    !isCanonicalUtcTimestamp(repair.reviewedAt)
  ) {
    errors.push(
      `${label}.repair must match the reviewed card-specific deterministic repair contract.`,
    );
    return {};
  }
  for (const [name, entry] of [
    ["recipe", repair.recipe],
    ["script", repair.script],
    ["mask", repair.mask],
    ["base", repair.base],
    ["donor", repair.donor],
  ]) {
    if (
      !isProjectRelativePath(entry?.path) ||
      !/^[a-f0-9]{64}$/.test(entry?.sha256 ?? "")
    ) {
      errors.push(
        `${label}.repair.${name} must bind a project path and SHA-256.`,
      );
    }
  }
  const sourceEntries = [
    ["base", repair.base],
    ["donor", repair.donor],
  ];
  for (const [name, source] of sourceEntries) {
    const sourceAttempt = seenAttemptsById.get(source?.attemptId);
    if (
      !sourceAttempt ||
      sourceAttempt.cardId !== record.cardId ||
      sourceAttempt.selectionStatus !== "rejected" ||
      sourceAttempt.attemptNumber >= record.attemptNumber ||
      sourceAttempt.rawOutputPath !== source.path ||
      sourceAttempt.rawOutputSha256 !== source.sha256 ||
      Date.parse(sourceAttempt.generatedAt) >= Date.parse(repair.reviewedAt)
    ) {
      errors.push(
        `${label}.repair.${name} must bind an earlier rejected attempt of the same card.`,
      );
    }
  }
  if (
    repair.base?.attemptId === repair.donor?.attemptId ||
    !previousAttempt ||
    Date.parse(previousAttempt.generatedAt) >= Date.parse(repair.reviewedAt) ||
    Date.parse(repair.reviewedAt) >= Date.parse(record.generatedAt)
  ) {
    errors.push(
      `${label}.repair must preserve predecessor generation < independent review < repair generation order.`,
    );
  }

  const recipeAbsolutePath = resolve(repositoryRoot, repair.recipe.path);
  const scriptAbsolutePath = resolve(repositoryRoot, repair.script.path);
  const maskAbsolutePath = resolve(repositoryRoot, repair.mask.path);
  let recipe = null;
  if (
    !existsSync(recipeAbsolutePath) ||
    sha256(readFileSync(recipeAbsolutePath)) !== repair.recipe.sha256
  ) {
    errors.push(`${label}.repair.recipe does not match its reviewed bytes.`);
  } else {
    try {
      recipe = JSON.parse(readFileSync(recipeAbsolutePath, "utf8"));
    } catch {
      errors.push(`${label}.repair.recipe must contain valid JSON.`);
    }
  }
  if (
    !existsSync(scriptAbsolutePath) ||
    sha256(readFileSync(scriptAbsolutePath)) !== repair.script.sha256
  ) {
    errors.push(`${label}.repair.script does not match its reviewed bytes.`);
  }
  if (!existsSync(maskAbsolutePath)) {
    errors.push(`${label}.repair.mask is missing.`);
  } else {
    const maskBytes = readFileSync(maskAbsolutePath);
    const frame = readPngFrame(maskBytes);
    if (
      sha256(maskBytes) !== repair.mask.sha256 ||
      frame.width !== repair.mask.width ||
      frame.height !== repair.mask.height
    ) {
      errors.push(
        `${label}.repair.mask does not match its reviewed bytes and frame.`,
      );
    }
  }
  const repairChecks = [
    "exactThreeRowRemoval",
    "preserveRowsFourThroughThirteen",
    "preserveHarness",
    "noStaffGhost",
    "outsideMaskPixelIdentity",
    "thumbnailCountable",
  ];
  if (
    recipe?.schemaVersion !== 1 ||
    recipe?.id !== repair.recipe.id ||
    recipe?.cardId !== record.cardId ||
    recipe?.tool !== record.generator.tool ||
    recipe?.toolVersion !== record.generator.toolVersion ||
    recipe?.mode !== record.generator.mode ||
    stableStringify(recipe?.script) !== stableStringify(repair.script) ||
    stableStringify(recipe?.base) !== stableStringify(repair.base) ||
    stableStringify(recipe?.donor) !== stableStringify(repair.donor) ||
    recipe?.mask?.path !== repair.mask.path ||
    recipe?.mask?.sha256 !== repair.mask.sha256 ||
    recipe?.mask?.width !== repair.mask.width ||
    recipe?.mask?.height !== repair.mask.height ||
    recipe?.outputPath !== record.rawOutputPath ||
    recipe?.expectedOutputSha256 !== record.rawOutputSha256 ||
    recipe?.review?.result !== "approved" ||
    recipe?.review?.reviewedAt !== repair.reviewedAt ||
    !Array.isArray(recipe?.review?.reviewers) ||
    new Set(recipe.review.reviewers).size < 2 ||
    recipe.review.reviewers.some(
      (reviewer) => typeof reviewer !== "string" || reviewer.trim() === "",
    ) ||
    JSON.stringify(Object.keys(recipe?.review?.checks ?? {})) !==
      JSON.stringify(repairChecks) ||
    repairChecks.some((check) => recipe.review.checks[check] !== true)
  ) {
    errors.push(
      `${label}.repair recipe must exactly bind the independently reviewed inputs, mask, script, output, and checks.`,
    );
  }

  if (recipe) {
    const cacheKey = stableStringify({
      mask: repair.mask.sha256,
      output: record.rawOutputSha256,
      recipe: repair.recipe.sha256,
      script: repair.script.sha256,
    });
    let rendered = deterministicRepairCheckCache.get(cacheKey);
    if (!rendered) {
      try {
        rendered = JSON.parse(
          execFileSync(process.execPath, [scriptAbsolutePath, "--check"], {
            cwd: repositoryRoot,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
            timeout: 120000,
          }),
        );
        deterministicRepairCheckCache.set(cacheKey, rendered);
      } catch (error) {
        errors.push(
          `${label}.repair could not reproduce the reviewed output: ${error.message}`,
        );
      }
    }
    if (
      rendered &&
      (rendered.baseSha256 !== repair.base.sha256 ||
        rendered.donorSha256 !== repair.donor.sha256 ||
        rendered.maskSha256 !== repair.mask.sha256 ||
        rendered.outputSha256 !== record.rawOutputSha256 ||
        rendered.recipeSha256 !== repair.recipe.sha256 ||
        rendered.toolVersion !== record.generator.toolVersion ||
        rendered.changedInside !== repair.changedInside ||
        rendered.changedOutside !== repair.changedOutside)
    ) {
      errors.push(
        `${label}.repair reproduction result does not match its immutable provenance.`,
      );
    }
  }

  return {
    [repair.base.attemptId]: repair.base.sha256,
    [repair.donor.attemptId]: repair.donor.sha256,
    [repair.recipe.id]: repair.recipe.sha256,
    [`${record.cardId}-local-repair-mask-001`]: repair.mask.sha256,
    [`${record.cardId}-local-repair-script`]: repair.script.sha256,
  };
}

function validateDeterministicLocalColorRepair({
  errors,
  files,
  label,
  previousAttempt,
  record,
  repositoryRoot,
  seenAttemptsById,
}) {
  const repair = record.repair;
  let reviewedRepair = null;
  try {
    reviewedRepair = getRepairAuthorizationForAttempt(
      files,
      record.id,
      repositoryRoot,
    );
  } catch (error) {
    errors.push(`${label}.repair authorization is invalid: ${error.message}`);
  }
  if (!reviewedRepair) {
    errors.push(
      `${label}.repair requires its exact externally frozen authorization.`,
    );
    return {};
  }

  const { authorization, recipe } = reviewedRepair;
  const binding = authorization.binding;
  const retryArtifact = loadRetryConstraintArtifact(
    binding.retryArtifact.path,
    record.cardId,
    repositoryRoot,
  );
  const selectedOutputPath = recipe.canonicalOutputPaths?.selected;
  const rejectedOutputPath = recipe.canonicalOutputPaths?.rejected;
  const expectedRepairKeys = [
    "authorization",
    "base",
    "changedInside",
    "changedOutside",
    "expectedOutputSha256",
    "forbiddenIntersections",
    "mask",
    "maskSource",
    "neutralOutput",
    "normalizedCandidate",
    "recipe",
    "retryArtifact",
    "script",
  ];
  const expectedForbiddenRegions = [
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
    !repair ||
    stableStringify(Object.keys(repair).sort()) !==
      stableStringify(expectedRepairKeys) ||
    record.generator?.toolVersion !== recipe.toolVersion ||
    record.rawOutputPath !== selectedOutputPath ||
    repair.expectedOutputSha256 !== record.rawOutputSha256 ||
    repair.changedInside !== 25523 ||
    repair.changedOutside !== 0 ||
    stableStringify(Object.keys(repair.forbiddenIntersections ?? {})) !==
      stableStringify(expectedForbiddenRegions) ||
    expectedForbiddenRegions.some(
      (region) => repair.forbiddenIntersections?.[region] !== 0,
    ) ||
    stableStringify(repair.authorization) !==
      stableStringify({
        id: authorization.id,
        authorizedAt: authorization.authorizedAt,
        decisionFingerprintSha256: authorization.decisionFingerprintSha256,
      }) ||
    stableStringify(repair.base) !== stableStringify(binding.base) ||
    stableStringify(repair.mask) !==
      stableStringify({
        ...binding.mask,
        height: recipe.mask.height,
        width: recipe.mask.width,
      }) ||
    stableStringify(repair.maskSource) !==
      stableStringify(binding.maskSource) ||
    stableStringify(repair.recipe) !==
      stableStringify({ id: recipe.id, ...binding.recipe }) ||
    stableStringify(repair.retryArtifact) !==
      stableStringify(binding.retryArtifact) ||
    stableStringify(repair.script) !== stableStringify(binding.script) ||
    stableStringify(repair.neutralOutput) !==
      stableStringify({
        path: binding.neutralOutputPath,
        sha256: record.rawOutputSha256,
      }) ||
    stableStringify(repair.normalizedCandidate) !==
      stableStringify({
        bytes: record.normalized?.assetBytes,
        path: `art/card-art-v3-candidates/${record.id}.jpg`,
        sha256: record.normalized?.assetSha256,
      })
  ) {
    errors.push(
      `${label}.repair must exactly bind the authorized color-repair inputs, proof and staged outputs.`,
    );
  }

  const baseAttempt = seenAttemptsById.get(binding.base.attemptId);
  if (
    !baseAttempt ||
    baseAttempt.id !== "cups-page-attempt-002" ||
    baseAttempt.cardId !== record.cardId ||
    baseAttempt.selectionStatus !== "selected" ||
    baseAttempt.rawOutputPath !== binding.base.path ||
    baseAttempt.rawOutputSha256 !== binding.base.sha256 ||
    !previousAttempt ||
    previousAttempt.id !== "cups-page-attempt-003" ||
    previousAttempt.selectionStatus !== "rejected" ||
    previousAttempt.id === binding.base.attemptId ||
    Date.parse(previousAttempt.generatedAt) >=
      Date.parse(retryArtifact.reviewedAt) ||
    Date.parse(retryArtifact.reviewedAt) >=
      Date.parse(authorization.authorizedAt) ||
    Date.parse(authorization.authorizedAt) >= Date.parse(record.generatedAt)
  ) {
    errors.push(
      `${label}.repair must preserve rejected predecessor < retry review < authorization < generation while using attempt-002 as its sole pixel base.`,
    );
  }

  const selectedOutput = resolve(repositoryRoot, selectedOutputPath ?? "");
  const rejectedOutput = resolve(repositoryRoot, rejectedOutputPath ?? "");
  const neutralOutput = resolve(repositoryRoot, binding.neutralOutputPath);
  const normalizedCandidate = resolve(
    repositoryRoot,
    repair?.normalizedCandidate?.path ?? "",
  );
  const normalizedPublic = resolve(
    repositoryRoot,
    record.normalized?.assetPath ?? "",
  );
  if (
    !isProjectRelativePath(selectedOutputPath) ||
    !isProjectRelativePath(rejectedOutputPath) ||
    selectedOutputPath === rejectedOutputPath ||
    !existsSync(selectedOutput) ||
    !existsSync(neutralOutput) ||
    existsSync(rejectedOutput)
  ) {
    errors.push(
      `${label}.repair must preserve neutral staging and exactly one selected canonical output branch.`,
    );
  } else {
    const selectedBytes = readFileSync(selectedOutput);
    const neutralBytes = readFileSync(neutralOutput);
    if (
      sha256(selectedBytes) !== record.rawOutputSha256 ||
      sha256(neutralBytes) !== record.rawOutputSha256 ||
      !selectedBytes.equals(neutralBytes)
    ) {
      errors.push(
        `${label}.repair canonical and neutral raw outputs must be byte-identical to the reviewed result.`,
      );
    }
  }
  if (!existsSync(normalizedCandidate) || !existsSync(normalizedPublic)) {
    errors.push(
      `${label}.repair normalized candidate and public asset must both exist.`,
    );
  } else {
    const candidateBytes = readFileSync(normalizedCandidate);
    const publicBytes = readFileSync(normalizedPublic);
    if (
      candidateBytes.length !== record.normalized?.assetBytes ||
      sha256(candidateBytes) !== record.normalized?.assetSha256 ||
      sha256(publicBytes) !== record.normalized?.assetSha256 ||
      !candidateBytes.equals(publicBytes)
    ) {
      errors.push(
        `${label}.repair normalized candidate and public asset must remain byte-identical.`,
      );
    }
  }

  const cacheKey = stableStringify({
    authorization: authorization.decisionFingerprintSha256,
    output: record.rawOutputSha256,
    recipe: binding.recipe.sha256,
    script: binding.script.sha256,
  });
  let rendered = deterministicRepairCheckCache.get(cacheKey);
  if (!rendered) {
    try {
      rendered = JSON.parse(
        execFileSync(
          process.execPath,
          [resolve(repositoryRoot, binding.script.path), "--check"],
          {
            cwd: repositoryRoot,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
            timeout: 120000,
          },
        ),
      );
      deterministicRepairCheckCache.set(cacheKey, rendered);
    } catch (error) {
      errors.push(
        `${label}.repair could not reproduce the authorized neutral output: ${error.message}`,
      );
    }
  }
  if (
    rendered &&
    (rendered.authorizationId !== authorization.id ||
      rendered.baseSha256 !== binding.base.sha256 ||
      rendered.changedInside !== repair.changedInside ||
      rendered.changedOutside !== repair.changedOutside ||
      stableStringify(rendered.forbiddenIntersections) !==
        stableStringify(repair.forbiddenIntersections) ||
      rendered.maskSha256 !== binding.mask.sha256 ||
      rendered.maskSourceSha256 !== binding.maskSource.sha256 ||
      rendered.outputPath !== binding.neutralOutputPath ||
      rendered.outputSha256 !== record.rawOutputSha256 ||
      rendered.recipeSha256 !== binding.recipe.sha256 ||
      rendered.toolVersion !== record.generator.toolVersion)
  ) {
    errors.push(
      `${label}.repair deterministic reproduction does not match its immutable provenance.`,
    );
  }

  return {
    [binding.base.attemptId]: binding.base.sha256,
    [authorization.id]: authorization.decisionFingerprintSha256,
    [`${record.id}-neutral-output`]: record.rawOutputSha256,
    [`${record.id}-retry-artifact`]: binding.retryArtifact.sha256,
    [recipe.id]: binding.recipe.sha256,
    [`${record.cardId}-local-repair-mask-001`]: binding.mask.sha256,
    [`${record.cardId}-local-repair-mask-source-001`]:
      binding.maskSource.sha256,
    [`${record.cardId}-local-repair-script`]: binding.script.sha256,
  };
}

function validateAppendOnlyV3Records(baseline, current, errors) {
  if (!baseline) return;
  for (const key of [
    "batchReviewGates",
    "generationRecords",
    "legacyReviewCorrections",
    "repairAuthorizations",
    "replacementGates",
    "releaseHistory",
    "styleHistory",
    "supersessions",
  ]) {
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

function normalizeReviewerIdentity(value) {
  return typeof value === "string"
    ? value.normalize("NFKC").trim().toLocaleLowerCase("en-US")
    : "";
}

function getBatchCardIds(manifest, batchId) {
  return canonicalTarotCardIds.filter(
    (cardId) => manifest.cards?.[cardId]?.batch === batchId,
  );
}

function getReviewSourcePath(generation, supersessionEntries, repositoryRoot) {
  const supersession = supersessionEntries.find(
    (entry) => entry.attemptId === generation.id,
  );
  return resolve(
    repositoryRoot,
    supersession?.archive?.path ?? generation.normalized?.assetPath ?? "",
  );
}

function validateIndependentReviews({
  decisionAt,
  errors,
  expectedReviewerIds,
  label,
  minimumGeneratedAt,
  requireAllApproved,
  reviews,
}) {
  const reviewers = new Set();
  let rejectedReviewCount = 0;
  if (!Array.isArray(reviews) || reviews.length !== 3) {
    errors.push(`${label} must contain exactly three reviews.`);
    return;
  }
  for (const [index, review] of reviews.entries()) {
    const reviewLabel = `${label}[${index}]`;
    const normalizedReviewer = normalizeReviewerIdentity(review?.reviewer);
    if (
      normalizedReviewer === "" ||
      review?.reviewerId !== expectedReviewerIds?.[index] ||
      reviewers.has(normalizedReviewer) ||
      typeof review?.scope !== "string" ||
      review.scope.trim() === "" ||
      review.independent !== true ||
      !["approved", "rejected"].includes(review.result) ||
      (requireAllApproved && review.result !== "approved") ||
      !isCanonicalUtcTimestamp(review.reviewedAt) ||
      Date.parse(review.reviewedAt) <= Date.parse(minimumGeneratedAt) ||
      Date.parse(review.reviewedAt) > Date.parse(decisionAt)
    ) {
      errors.push(
        `${reviewLabel} must be normalized-unique, independent and chronologically valid.`,
      );
    }
    reviewers.add(normalizedReviewer);
    if (review?.result === "rejected") rejectedReviewCount += 1;
  }
  if (!requireAllApproved && rejectedReviewCount < 1) {
    errors.push(`${label} requires at least one rejecting review.`);
  }
}

function validateCourtContactSheetEvidence({
  decisionAt,
  errors,
  evidence,
  expectedBatchId,
  expectedCardIds,
  expectedFullPath,
  expectedMobilePath,
  files,
  generationById,
  label,
  legacyReuseCardIds = [],
  manifest,
  repositoryRoot,
  supersessionEntries,
}) {
  let expectedRecipe = null;
  let rendererScript = null;
  if (evidence?.recipe?.id === cardArtV3CourtContactSheetRecipe.id) {
    if (expectedCardIds.length !== 6) {
      errors.push(`${label} court recipe requires exactly six cards.`);
    }
    expectedRecipe = cardArtV3CourtContactSheetRecipe;
    rendererScript = "scripts/card-art-v3-contact-sheet.mjs";
  } else {
    try {
      expectedRecipe = getCardArtV3BatchContactSheetRecipe(
        expectedCardIds.length,
      );
      rendererScript = "scripts/card-art-v3-batch-contact-sheet.mjs";
    } catch (error) {
      errors.push(
        `${label} has no valid deterministic recipe: ${error.message}`,
      );
    }
  }
  if (
    stableStringify(evidence?.cardIds) !== stableStringify(expectedCardIds) ||
    !Array.isArray(evidence?.attemptIds) ||
    evidence.attemptIds.length !== expectedCardIds.length
  ) {
    errors.push(
      `${label} must bind the exact batch card order and one attempt per card.`,
    );
    return { latestGeneratedAt: decisionAt, sourcePaths: [] };
  }
  const expectedAssetSha256 = {};
  const sourcePaths = [];
  const legacyReuseIds = new Set(legacyReuseCardIds);
  const legacySources = new Map(
    (manifest?.legacySources ?? []).map((source) => [source.id, source]),
  );
  let latestGeneratedAt = "1970-01-01T00:00:00.000Z";
  for (const [index, cardId] of expectedCardIds.entries()) {
    const attemptId = evidence.attemptIds[index];
    if (attemptId === null && legacyReuseIds.has(cardId)) {
      const legacySource = legacySources.get(cardId);
      const legacySourcePath = resolve(
        repositoryRoot,
        legacySource?.assetPath ?? "",
      );
      const reviewedAssetPath = resolve(
        repositoryRoot,
        manifest?.cards?.[cardId]?.assetPath ?? "",
      );
      if (
        getEffectiveLegacyDecision(files, cardId) !== "keep" ||
        manifest?.cards?.[cardId]?.batch !== expectedBatchId ||
        !legacySource ||
        !existsSync(legacySourcePath) ||
        !existsSync(reviewedAssetPath) ||
        sha256(readFileSync(legacySourcePath)) !== legacySource.sha256 ||
        sha256(readFileSync(reviewedAssetPath)) !== legacySource.sha256
      ) {
        errors.push(
          `${label}.attemptIds[${index}] null must bind one byte-identical reviewed legacy keep asset.`,
        );
        continue;
      }
      expectedAssetSha256[cardId] = legacySource.sha256;
      sourcePaths.push(reviewedAssetPath);
      continue;
    }
    const generation = generationById.get(attemptId);
    if (
      legacyReuseIds.has(cardId) ||
      !generation ||
      generation.cardId !== cardId ||
      generation.batchId !== expectedBatchId ||
      generation.selectionStatus !== "selected" ||
      !isCanonicalUtcTimestamp(generation.generatedAt) ||
      Date.parse(generation.generatedAt) >= Date.parse(decisionAt)
    ) {
      errors.push(
        `${label}.attemptIds[${index}] must bind a selected batch asset generated before review.`,
      );
      continue;
    }
    if (Date.parse(generation.generatedAt) > Date.parse(latestGeneratedAt)) {
      latestGeneratedAt = generation.generatedAt;
    }
    expectedAssetSha256[cardId] = generation.normalized?.assetSha256;
    sourcePaths.push(
      getReviewSourcePath(generation, supersessionEntries, repositoryRoot),
    );
  }
  const expectedAssetMapSha256 = sha256(
    stableStringify({
      assetSha256: expectedAssetSha256,
      attemptIds: evidence.attemptIds,
      cardIds: expectedCardIds,
    }),
  );
  if (
    stableStringify(evidence?.assetSha256) !==
      stableStringify(expectedAssetSha256) ||
    evidence?.assetMapSha256 !== expectedAssetMapSha256
  ) {
    errors.push(
      `${label}.assetMapSha256 must bind every reviewed card, attempt and normalized asset SHA-256.`,
    );
  }
  if (
    stableStringify(evidence?.recipe) !== stableStringify(expectedRecipe) ||
    evidence?.recipeFingerprintSha256 !==
      sha256(stableStringify(expectedRecipe))
  ) {
    errors.push(`${label}.recipe must match its deterministic batch contract.`);
  }
  const fullPath = resolve(repositoryRoot, evidence?.full?.path ?? "");
  const mobilePath = resolve(repositoryRoot, evidence?.mobile?.path ?? "");
  if (
    evidence?.full?.path !== expectedFullPath ||
    evidence?.mobile?.path !== expectedMobilePath ||
    fullPath === mobilePath
  ) {
    errors.push(`${label} full and mobile paths must be exact and distinct.`);
  }
  for (const [kind, absolutePath] of [
    ["full", fullPath],
    ["mobile", mobilePath],
  ]) {
    const artifact = evidence?.[kind];
    if (!isProjectRelativePath(artifact?.path) || !existsSync(absolutePath)) {
      errors.push(`${label}.${kind} artifact is missing or non-canonical.`);
      continue;
    }
    const buffer = readFileSync(absolutePath);
    const image = readJpegMetadata(buffer);
    if (
      sha256(buffer) !== artifact.sha256 ||
      buffer.length !== artifact.bytes ||
      image.width !== artifact.width ||
      image.height !== artifact.height ||
      image.components !== 3
    ) {
      errors.push(`${label}.${kind} bytes or frame do not match.`);
    }
  }
  if (sourcePaths.length === expectedCardIds.length) {
    const cacheKey = stableStringify({
      full: evidence.full,
      mobile: evidence.mobile,
      sourceSha256: expectedCardIds.map(
        (cardId) => expectedAssetSha256[cardId],
      ),
    });
    let rendered = contactSheetCheckCache.get(cacheKey);
    if (!rendered) {
      const scriptPath = resolve(repositoryRoot, rendererScript);
      const args = [scriptPath];
      for (const sourcePath of sourcePaths) {
        args.push("--source", sourcePath);
      }
      args.push("--full", fullPath, "--mobile", mobilePath);
      try {
        rendered = JSON.parse(
          execFileSync(process.execPath, args, {
            cwd: repositoryRoot,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
            timeout: 120000,
          }),
        );
        contactSheetCheckCache.set(cacheKey, rendered);
      } catch (error) {
        errors.push(
          `${label} could not reproduce its deterministic artifacts: ${error.message}`,
        );
      }
    }
    if (
      rendered &&
      (rendered.recipeFingerprintSha256 !== evidence.recipeFingerprintSha256 ||
        stableStringify(rendered.sourceSha256) !==
          stableStringify(
            expectedCardIds.map((cardId) => expectedAssetSha256[cardId]),
          ) ||
        rendered.full.sha256 !== evidence.full?.sha256 ||
        rendered.full.bytes !== evidence.full?.bytes ||
        rendered.mobile.sha256 !== evidence.mobile?.sha256 ||
        rendered.mobile.bytes !== evidence.mobile?.bytes)
    ) {
      errors.push(
        `${label} artifacts must exactly reproduce from the bound selected assets.`,
      );
    }
  }
  return { latestGeneratedAt, sourcePaths };
}

function validateBatchReviewGates({
  batchReviewGates,
  errors,
  files,
  generationById,
  manifest,
  repositoryRoot,
  supersessions,
}) {
  const byCardId = new Map();
  const ids = new Set();
  const batchIds = new Set();
  if (
    batchReviewGates?.schemaVersion !== 1 ||
    !Array.isArray(batchReviewGates?.entries)
  ) {
    errors.push("batchReviewGates must match the reviewed v3 schema.");
    return byCardId;
  }
  for (const [index, gate] of batchReviewGates.entries.entries()) {
    const label = `batchReviewGates.entries[${index}]`;
    const contract = reviewedBatchGateContracts[gate?.id];
    const expectedCardIds =
      contract?.cardIds ?? getBatchCardIds(manifest, gate?.batchId);
    if (
      !contract ||
      contract.batchId !== gate?.batchId ||
      gate?.id !== `${gate?.batchId}-review-001` ||
      ids.has(gate?.id) ||
      batchIds.has(gate?.batchId) ||
      gate?.status !== "passed" ||
      gate?.result !== "approved" ||
      !isCanonicalUtcTimestamp(gate?.reviewedAt)
    ) {
      errors.push(
        `${label} must be one externally frozen passing review for its batch.`,
      );
    }
    ids.add(gate?.id);
    batchIds.add(gate?.batchId);
    const { latestGeneratedAt } = validateCourtContactSheetEvidence({
      decisionAt: gate?.reviewedAt,
      errors,
      evidence: gate?.reviewEvidence,
      expectedBatchId: gate?.batchId,
      expectedCardIds,
      expectedFullPath: contract?.fullReviewPath,
      expectedMobilePath: contract?.mobileReviewPath,
      files,
      generationById,
      label: `${label}.reviewEvidence`,
      legacyReuseCardIds: contract?.legacyReuseCardIds ?? [],
      manifest,
      repositoryRoot,
      supersessionEntries: supersessions?.entries ?? [],
    });
    validateIndependentReviews({
      decisionAt: gate?.reviewedAt,
      errors,
      expectedReviewerIds: contract?.reviewerIds,
      label: `${label}.independentReviews`,
      minimumGeneratedAt: latestGeneratedAt,
      requireAllApproved: true,
      reviews: gate?.independentReviews,
    });
    const expectedFingerprint = sha256(
      stableStringify({
        batchId: gate?.batchId,
        independentReviews: gate?.independentReviews,
        result: gate?.result,
        reviewEvidence: {
          assetMapSha256: gate?.reviewEvidence?.assetMapSha256,
          cardIds: gate?.reviewEvidence?.cardIds,
          attemptIds: gate?.reviewEvidence?.attemptIds,
          full: gate?.reviewEvidence?.full,
          mobile: gate?.reviewEvidence?.mobile,
          recipeFingerprintSha256:
            gate?.reviewEvidence?.recipeFingerprintSha256,
        },
        status: gate?.status,
        reviewedAt: gate?.reviewedAt,
      }),
    );
    if (
      gate?.decisionFingerprintSha256 !== expectedFingerprint ||
      gate?.decisionFingerprintSha256 !== contract?.decisionFingerprintSha256
    ) {
      errors.push(
        `${label}.decisionFingerprintSha256 must match its externally frozen batch review.`,
      );
    }
    for (const [cardIndex, cardId] of expectedCardIds.entries()) {
      const attemptId = gate?.reviewEvidence?.attemptIds?.[cardIndex];
      const generation = generationById.get(attemptId);
      const approval = files.approvals?.records?.[cardId];
      const gateBoundAt =
        approval?.batchReviewGateBoundAt ?? approval?.reviewedAt;
      if (
        byCardId.has(cardId) ||
        approval?.status !== "approved" ||
        approval?.batchReviewGateId !== gate?.id ||
        approval?.generationRecordId !== attemptId ||
        approval?.assetSha256 !==
          (generation?.normalized?.assetSha256 ??
            gate?.reviewEvidence?.assetSha256?.[cardId]) ||
        !isCanonicalUtcTimestamp(approval?.reviewedAt) ||
        !isCanonicalUtcTimestamp(gateBoundAt) ||
        Date.parse(gateBoundAt) < Date.parse(gate?.reviewedAt)
      ) {
        errors.push(
          `${label} must be committed atomically with every reviewed batch approval.`,
        );
      }
      byCardId.set(cardId, gate);
    }
  }
  return byCardId;
}

function validateSupersessions({
  errors,
  generationById,
  manifest,
  repositoryRoot,
  supersessions,
}) {
  const byAttemptId = new Map();
  const supersessionIds = new Set();
  const entries = supersessions?.entries ?? [];
  for (const [index, entry] of entries.entries()) {
    const label = `supersessions.entries[${index}]`;
    const generation = generationById.get(entry?.attemptId);
    if (
      typeof entry?.id !== "string" ||
      entry.id !== `${entry.attemptId}-batch-supersession-001` ||
      supersessionIds.has(entry.id)
    ) {
      errors.push(
        `${label}.id must be the unique attempt-bound supersession id.`,
      );
    }
    supersessionIds.add(entry?.id);
    if (
      !generation ||
      generation.cardId !== entry.cardId ||
      generation.attemptNumber !== entry.attemptNumber ||
      generation.batchId !== entry.batchId ||
      generation.selectionStatus !== "selected" ||
      entry.status !== "superseded" ||
      entry.result !== "rejected"
    ) {
      errors.push(
        `${label} must bind one previously selected generation attempt to a rejected batch decision.`,
      );
    }
    if (byAttemptId.has(entry?.attemptId)) {
      errors.push(`${label}.attemptId must be superseded at most once.`);
    }
    byAttemptId.set(entry?.attemptId, entry);
    if (
      typeof entry?.reason !== "string" ||
      entry.reason.trim() === "" ||
      !isCanonicalUtcTimestamp(entry?.supersededAt) ||
      (generation &&
        Date.parse(generation.generatedAt) >= Date.parse(entry.supersededAt))
    ) {
      errors.push(`${label} must record a later canonical reasoned decision.`);
    }

    const archive = entry?.archive;
    const expectedArchivePath = `art/card-art-v3-superseded/${entry?.attemptId}.jpg`;
    const archivePath = resolve(repositoryRoot, archive?.path ?? "");
    if (
      archive?.path !== expectedArchivePath ||
      !isProjectRelativePath(archive?.path) ||
      archive?.sha256 !== generation?.normalized?.assetSha256 ||
      archive?.bytes !== generation?.normalized?.assetBytes ||
      !existsSync(archivePath)
    ) {
      errors.push(
        `${label}.archive must preserve the exact normalized selection.`,
      );
    } else {
      const archiveBuffer = readFileSync(archivePath);
      const image = readJpegMetadata(archiveBuffer);
      if (
        sha256(archiveBuffer) !== archive.sha256 ||
        archiveBuffer.length !== archive.bytes ||
        image.width !== 700 ||
        image.height !== 980 ||
        image.components !== 3
      ) {
        errors.push(`${label}.archive bytes or frame do not match.`);
      }
    }

    const expectedBatchCardIds = getBatchCardIds(manifest, entry.batchId);
    const evidence = entry?.reviewEvidence;
    const { latestGeneratedAt } = validateCourtContactSheetEvidence({
      decisionAt: entry.supersededAt,
      errors,
      evidence,
      expectedBatchId: entry.batchId,
      expectedCardIds: expectedBatchCardIds,
      expectedFullPath: `art/card-art-v3-reviews/${entry.batchId}-contact-sheet-v1.jpg`,
      expectedMobilePath: `art/card-art-v3-reviews/${entry.batchId}-contact-sheet-mobile-v1.jpg`,
      generationById,
      label: `${label}.reviewEvidence`,
      repositoryRoot,
      supersessionEntries: entries,
    });
    if (
      typeof evidence?.blocker !== "string" ||
      evidence.blocker.trim() === ""
    ) {
      errors.push(`${label}.reviewEvidence.blocker must be observable.`);
    }
    validateIndependentReviews({
      decisionAt: entry.supersededAt,
      errors,
      expectedReviewerIds: reviewedSupersessionContracts[entry.id]?.reviewerIds,
      label: `${label}.independentReviews`,
      minimumGeneratedAt: latestGeneratedAt,
      requireAllApproved: false,
      reviews: entry.independentReviews,
    });

    const contract = entry?.replacementContract;
    let retryArtifact = null;
    try {
      retryArtifact = loadRetryConstraintArtifact(
        contract?.retryArtifactPath,
        entry.cardId,
        repositoryRoot,
      );
    } catch (error) {
      errors.push(`${label}.replacementContract is invalid: ${error.message}`);
    }
    if (
      contract?.mode !== "precision-edit-only" ||
      contract?.selectionPolicy !==
        "review candidate before ledger append; commit selected only atomically with an externally frozen passing replacement gate, otherwise commit rejected" ||
      contract?.attemptNumber !== entry.attemptNumber + 1 ||
      contract?.previousAttemptId !== entry.attemptId ||
      contract?.retryArtifactSha256 !== retryArtifact?.sha256 ||
      stableStringify(contract?.editSource) !==
        stableStringify(retryArtifact?.editSource) ||
      typeof contract?.allowedChange !== "string" ||
      contract.allowedChange.trim() === "" ||
      contract?.requiredGateId !==
        `${entry.batchId}-${entry.cardId}-replacement-001` ||
      stableStringify(contract?.requiredBatchCardIds) !==
        stableStringify(expectedBatchCardIds) ||
      contract?.requiredFullReviewPath !==
        `art/card-art-v3-reviews/${entry.batchId}-contact-sheet-v2.jpg` ||
      contract?.requiredMobileReviewPath !==
        `art/card-art-v3-reviews/${entry.batchId}-contact-sheet-mobile-v2.jpg` ||
      (retryArtifact &&
        Date.parse(entry.supersededAt) >= Date.parse(retryArtifact.reviewedAt))
    ) {
      errors.push(
        `${label}.replacementContract must bind the exact later precision-edit artifact and passing replacement gate.`,
      );
    }
    const expectedDecisionFingerprint = sha256(
      stableStringify({
        independentReviews: entry.independentReviews,
        reason: entry.reason,
        replacementContract: entry.replacementContract,
        result: entry.result,
        reviewEvidence: {
          assetMapSha256: evidence?.assetMapSha256,
          blocker: evidence?.blocker,
          cardIds: evidence?.cardIds,
          attemptIds: evidence?.attemptIds,
          full: evidence?.full,
          mobile: evidence?.mobile,
          recipeFingerprintSha256: evidence?.recipeFingerprintSha256,
        },
        status: entry.status,
        supersededAt: entry.supersededAt,
      }),
    );
    if (entry?.decisionFingerprintSha256 !== expectedDecisionFingerprint) {
      errors.push(
        `${label}.decisionFingerprintSha256 must lock the exact blocker, reviews and bounded replacement contract.`,
      );
    }
    if (
      !reviewedSupersessionContracts[entry?.id] ||
      entry?.decisionFingerprintSha256 !==
        reviewedSupersessionContracts[entry?.id]?.decisionFingerprintSha256
    ) {
      errors.push(
        `${label}.decisionFingerprintSha256 must match the externally frozen independent-review contract.`,
      );
    }
    if (!canonicalTarotCardIds.includes(entry?.cardId)) {
      errors.push(`${label}.cardId is not canonical.`);
    }
    if (manifest.cards?.[entry?.cardId]?.batch !== entry?.batchId) {
      errors.push(`${label}.batchId does not match the manifest.`);
    }
  }
  return byAttemptId;
}

function validateReplacementGates({
  errors,
  files,
  generationById,
  manifest,
  replacementGates,
  repositoryRoot,
  supersessionByAttemptId,
  supersessions,
}) {
  const byAttemptId = new Map();
  const supersessionById = new Map(
    [...supersessionByAttemptId.values()].map((entry) => [entry.id, entry]),
  );
  const gateIds = new Set();
  for (const [index, gate] of (replacementGates?.entries ?? []).entries()) {
    const label = `replacementGates.entries[${index}]`;
    const supersession = supersessionById.get(gate?.supersessionId);
    const replacement = generationById.get(gate?.replacementAttemptId);
    let repairAuthorization = null;
    try {
      repairAuthorization = replacement
        ? getRepairAuthorizationForAttempt(
            files,
            replacement.id,
            repositoryRoot,
          )
        : null;
    } catch (error) {
      errors.push(`${label} repair authorization is invalid: ${error.message}`);
    }
    const contract = repairAuthorization?.gateContract
      ? {
          requiredFullReviewPath:
            repairAuthorization.gateContract.fullReviewPath,
          requiredGateId: repairAuthorization.gateContract.id,
          requiredMobileReviewPath:
            repairAuthorization.gateContract.mobileReviewPath,
        }
      : supersession?.replacementContract;
    const reviewedAuthorization =
      reviewedSupersessionContracts[supersession?.id]?.authorizations?.[
        replacement?.id
      ] ??
      (repairAuthorization
        ? {
            attemptNumber: repairAuthorization.attemptNumber,
            previousAttemptId: repairAuthorization.previousAttemptId,
          }
        : null);
    if (
      !supersession ||
      gate?.id !== contract?.requiredGateId ||
      gateIds.has(gate?.id) ||
      gate?.status !== "passed" ||
      gate?.result !== "approved" ||
      replacement?.cardId !== supersession.cardId ||
      replacement?.attemptNumber !== reviewedAuthorization?.attemptNumber ||
      replacement?.previousAttemptId !==
        reviewedAuthorization?.previousAttemptId ||
      replacement?.selectionStatus !== "selected" ||
      supersessionByAttemptId.has(replacement?.id) ||
      !isCanonicalUtcTimestamp(gate?.reviewedAt) ||
      Date.parse(replacement?.generatedAt) >= Date.parse(gate?.reviewedAt)
    ) {
      errors.push(
        `${label} must bind one later active selected replacement and a passing gate.`,
      );
    }
    gateIds.add(gate?.id);
    if (byAttemptId.has(gate?.replacementAttemptId)) {
      errors.push(`${label}.replacementAttemptId must be unique.`);
    }
    byAttemptId.set(gate?.replacementAttemptId, gate);
    const expectedCardIds = getBatchCardIds(manifest, supersession?.batchId);
    const expectedActiveAttemptIds = expectedCardIds.map((cardId) => {
      const selected = [...generationById.values()]
        .filter(
          (record) =>
            record.cardId === cardId &&
            record.selectionStatus === "selected" &&
            !supersessionByAttemptId.has(record.id),
        )
        .at(-1);
      return selected?.id;
    });
    for (const [cardIndex, cardId] of expectedCardIds.entries()) {
      const approval = files.approvals?.records?.[cardId];
      const generation = generationById.get(
        expectedActiveAttemptIds[cardIndex],
      );
      if (
        approval?.status !== "approved" ||
        approval?.generationRecordId !== generation?.id ||
        approval?.assetSha256 !== generation?.normalized?.assetSha256 ||
        !isCanonicalUtcTimestamp(approval?.reviewedAt) ||
        Date.parse(approval.reviewedAt) < Date.parse(gate?.reviewedAt)
      ) {
        errors.push(
          `${label} must be committed atomically with approval for every reviewed batch asset.`,
        );
      }
    }
    if (
      stableStringify(gate?.reviewEvidence?.attemptIds) !==
        stableStringify(expectedActiveAttemptIds) ||
      gate?.reviewEvidence?.attemptIds?.[
        expectedCardIds.indexOf(supersession?.cardId)
      ] !== replacement?.id
    ) {
      errors.push(
        `${label}.reviewEvidence must use the latest active selected attempt for every batch card.`,
      );
    }
    const { latestGeneratedAt } = validateCourtContactSheetEvidence({
      decisionAt: gate?.reviewedAt,
      errors,
      evidence: gate?.reviewEvidence,
      expectedBatchId: supersession?.batchId,
      expectedCardIds,
      expectedFullPath: contract?.requiredFullReviewPath,
      expectedMobilePath: contract?.requiredMobileReviewPath,
      generationById,
      label: `${label}.reviewEvidence`,
      repositoryRoot,
      supersessionEntries: supersessions?.entries ?? [],
    });
    validateIndependentReviews({
      decisionAt: gate?.reviewedAt,
      errors,
      expectedReviewerIds: [
        "tarot-content-review",
        "ux-test-review",
        "final-plan-review",
      ],
      label: `${label}.independentReviews`,
      minimumGeneratedAt: latestGeneratedAt,
      requireAllApproved: true,
      reviews: gate?.independentReviews,
    });
    const expectedFingerprint = sha256(
      stableStringify({
        independentReviews: gate?.independentReviews,
        replacementAttemptId: gate?.replacementAttemptId,
        result: gate?.result,
        reviewEvidence: gate?.reviewEvidence,
        reviewedAt: gate?.reviewedAt,
        status: gate?.status,
        supersessionId: gate?.supersessionId,
      }),
    );
    if (gate?.decisionFingerprintSha256 !== expectedFingerprint) {
      errors.push(
        `${label}.decisionFingerprintSha256 must lock the passing replacement gate.`,
      );
    }
    if (
      gate?.decisionFingerprintSha256 !==
      reviewedReplacementGateContracts[gate?.id]
    ) {
      errors.push(
        `${label}.decisionFingerprintSha256 must match an externally frozen passing-gate review contract.`,
      );
    }
  }
  return byAttemptId;
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
  for (const [controlId, control] of Object.entries(registry.controls)) {
    const label = `controlRegistry.controls.${controlId}`;
    const expectedChecksByCard = {
      "the-devil": [
        "exactTwoCordPaths",
        "continuousEndpointToEndpoint",
        "oneCordPerAdult",
        "noMergeSplitOrLoss",
        "noText",
        "thumbnailLegible",
      ],
      "wheel-of-fortune": [
        "singleMeetingPoint",
        "exactFourArms",
        "continuousArms",
        "noMergeSplitOrLoss",
        "noText",
        "thumbnailLegible",
      ],
      "wands-10": [
        "exactTopCount",
        "exactContinuousShaftCount",
        "exactBottomCount",
        "noMergeSplitOrLoss",
        "singleBundle",
        "noText",
        "thumbnailLegible",
      ],
      "wands-4": [
        "exactFourStaffs",
        "exactFourFigures",
        "continuousIndependentShafts",
        "separatePavingContacts",
        "noSharedRailOrCrossbar",
        "noText",
        "thumbnailLegible",
      ],
      "wands-7": [
        "exactUpperOnePlusLowerSix",
        "exactHorizontalOnePlusUprightSix",
        "oneHandContactPerLowerStaff",
        "twoUpperHandContacts",
        "explicitFeetAndPavingContacts",
        "outwardSideIsolation",
        "stoneEdgeSeparation",
        "noText",
        "thumbnailLegible",
      ],
    };
    const expectedChecks = expectedChecksByCard[control.cardId];
    const sourcePath = `art/card-art-v3-controls/${controlId}.svg`;
    const renderPath = `art/card-art-v3-controls/${controlId}.png`;
    if (
      !manifest.cards?.[control.cardId] ||
      !new RegExp(`^${control.cardId}-[a-z0-9-]+-v[0-9]+$`).test(controlId) ||
      control.status !== "approved" ||
      typeof control.purpose !== "string" ||
      control.purpose.trim() === "" ||
      !expectedChecks
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
      !expectedChecks ||
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

function getEffectiveLegacyDecision(files, cardId) {
  const corrected = [...(files.legacyReviewCorrections?.entries ?? [])]
    .reverse()
    .find((entry) => entry.status === "approved")?.decisions?.[
    cardId
  ]?.decision;
  return corrected ?? files.legacyAudit?.records?.[cardId]?.decision ?? null;
}

function getCorrectedLegacyRetouchContract(files, cardId) {
  return getEffectiveLegacyDecision(files, cardId) === "retouch" &&
    files.legacyAudit?.records?.[cardId]?.decision !== "retouch"
    ? (reviewedCorrectedLegacyRetouchContracts[cardId] ?? null)
    : null;
}

function validateLegacyReviewCorrections({
  errors,
  legacyAudit,
  legacyReviewCorrections,
  repositoryRoot,
}) {
  if (
    legacyReviewCorrections?.schemaVersion !== 1 ||
    legacyReviewCorrections?.systemId !==
      "quiet-celestial-storybook-full-deck" ||
    legacyReviewCorrections?.version !== "v3" ||
    !Array.isArray(legacyReviewCorrections?.entries)
  ) {
    errors.push("legacyReviewCorrections must match the reviewed v3 schema.");
    return;
  }
  const ids = new Set();
  for (const [index, entry] of legacyReviewCorrections.entries.entries()) {
    const label = `legacyReviewCorrections.entries[${index}]`;
    const contract = reviewedLegacyCorrectionContracts[entry?.id];
    const cardIds = Object.keys(entry?.decisions ?? {});
    const expectedCardIds = Object.keys(contract?.decisions ?? {});
    const reviewerIds = (entry?.independentReviews ?? []).map(
      ({ reviewerId }) => reviewerId,
    );
    const reviewerResults = (entry?.independentReviews ?? []).map(
      ({ result }) => result,
    );
    if (
      !contract ||
      ids.has(entry?.id) ||
      entry?.status !== "approved" ||
      entry?.result !== "corrected" ||
      !isCanonicalUtcTimestamp(entry?.reviewedAt) ||
      stableStringify(cardIds) !== stableStringify(expectedCardIds) ||
      stableStringify(reviewerIds) !== stableStringify(contract?.reviewerIds) ||
      stableStringify(reviewerResults) !==
        stableStringify(contract?.reviewerResults)
    ) {
      errors.push(
        `${label} must be one externally frozen, chronologically valid source-review correction.`,
      );
    }
    ids.add(entry?.id);
    for (const cardId of expectedCardIds) {
      const decision = entry?.decisions?.[cardId];
      if (
        decision?.previousDecision !==
          legacyAudit?.records?.[cardId]?.decision ||
        decision?.decision !== contract.decisions[cardId] ||
        typeof decision?.reason !== "string" ||
        decision.reason.trim() === ""
      ) {
        errors.push(
          `${label}.decisions.${cardId} is not the reviewed outcome.`,
        );
      }
    }
    for (const [reviewIndex, review] of (
      entry?.independentReviews ?? []
    ).entries()) {
      if (
        review?.independent !== true ||
        typeof review?.reviewer !== "string" ||
        review.reviewer.trim() === "" ||
        typeof review?.scope !== "string" ||
        review.scope.trim() === "" ||
        !isCanonicalUtcTimestamp(review?.reviewedAt) ||
        Date.parse(review.reviewedAt) > Date.parse(entry?.reviewedAt) ||
        review?.reviewerId !== contract?.reviewerIds[reviewIndex] ||
        review?.result !== contract?.reviewerResults[reviewIndex]
      ) {
        errors.push(
          `${label}.independentReviews[${reviewIndex}] is not the frozen independent source review.`,
        );
      }
    }
    const evidence = entry?.reviewEvidence;
    const expectedSourceSha256 = expectedCardIds.map(
      (cardId) => legacyAudit?.records?.[cardId]?.sourceSha256,
    );
    const expectedRecipe = getCardArtV3BatchContactSheetRecipe(
      expectedCardIds.length,
    );
    if (
      stableStringify(evidence?.cardIds) !== stableStringify(expectedCardIds) ||
      stableStringify(evidence?.sourceSha256) !==
        stableStringify(expectedSourceSha256) ||
      evidence?.recipeFingerprintSha256 !==
        sha256(stableStringify(expectedRecipe)) ||
      evidence?.full?.path !== contract?.fullReviewPath ||
      evidence?.mobile?.path !== contract?.mobileReviewPath
    ) {
      errors.push(
        `${label}.reviewEvidence is not the exact five-source audit.`,
      );
    }
    for (const kind of ["full", "mobile"]) {
      const artifact = evidence?.[kind];
      const absolutePath = resolve(repositoryRoot, artifact?.path ?? "");
      if (!isProjectRelativePath(artifact?.path) || !existsSync(absolutePath)) {
        errors.push(`${label}.reviewEvidence.${kind} is missing.`);
        continue;
      }
      const buffer = readFileSync(absolutePath);
      const image = readJpegMetadata(buffer);
      if (
        sha256(buffer) !== artifact.sha256 ||
        buffer.length !== artifact.bytes ||
        image.width !== artifact.width ||
        image.height !== artifact.height ||
        image.components !== 3
      ) {
        errors.push(`${label}.reviewEvidence.${kind} bytes do not match.`);
      }
    }
    const sourcePaths = expectedCardIds.map((cardId) =>
      resolve(repositoryRoot, legacyAudit.records[cardId].sourceAssetPath),
    );
    try {
      const rendered = JSON.parse(
        execFileSync(
          process.execPath,
          [
            resolve(
              repositoryRoot,
              "scripts/card-art-v3-batch-contact-sheet.mjs",
            ),
            ...sourcePaths.flatMap((sourcePath) => ["--source", sourcePath]),
            "--full",
            resolve(repositoryRoot, evidence.full.path),
            "--mobile",
            resolve(repositoryRoot, evidence.mobile.path),
          ],
          {
            cwd: repositoryRoot,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
            timeout: 120000,
          },
        ),
      );
      if (
        stableStringify(rendered.sourceSha256) !==
          stableStringify(expectedSourceSha256) ||
        rendered.recipeFingerprintSha256 !== evidence.recipeFingerprintSha256 ||
        rendered.full.sha256 !== evidence.full.sha256 ||
        rendered.mobile.sha256 !== evidence.mobile.sha256
      ) {
        errors.push(`${label}.reviewEvidence cannot be reproduced exactly.`);
      }
    } catch (error) {
      errors.push(
        `${label}.reviewEvidence reproduction failed: ${error.message}`,
      );
    }
    const expectedFingerprint = sha256(
      stableStringify({
        decisions: entry?.decisions,
        independentReviews: entry?.independentReviews,
        result: entry?.result,
        reviewEvidence: entry?.reviewEvidence,
        status: entry?.status,
        reviewedAt: entry?.reviewedAt,
      }),
    );
    if (
      entry?.decisionFingerprintSha256 !== expectedFingerprint ||
      entry?.decisionFingerprintSha256 !== contract?.decisionFingerprintSha256
    ) {
      errors.push(
        `${label}.decisionFingerprintSha256 must match the frozen decision.`,
      );
    }
  }
}

function getCard(manifest, cardId) {
  const card = manifest.cards?.[cardId];
  if (!card) throw new Error(`Unknown card id "${cardId}".`);
  return card;
}

export function getCardArtV3PostPilotReferenceRoute(
  styleHistory,
  card,
  styleVersion = undefined,
) {
  if (!card || card.arcana !== "minor" || card.batch.startsWith("pilot-")) {
    return null;
  }
  const entries = styleHistory.entries ?? [];
  const entry =
    styleVersion === undefined
      ? entries.at(-1)
      : entries.find(({ version }) => version === styleVersion);
  if (!entry) {
    if (styleVersion === undefined) return null;
    throw new Error(`Unknown frozen style version "${styleVersion}".`);
  }
  const kind = courtRankIds.has(card.rank) ? "court" : "numbered";
  const route = entry.referenceRouting?.[kind];
  const commonInstruction = entry.referenceRouting?.commonInstruction;
  const anchorIds = route?.pairs?.[card.suit];
  if (
    !Array.isArray(anchorIds) ||
    anchorIds.length !== 2 ||
    typeof commonInstruction !== "string" ||
    commonInstruction.trim() === "" ||
    typeof route?.instruction !== "string" ||
    route.instruction.trim() === ""
  ) {
    throw new Error(
      `Frozen ${kind} reference route is invalid for ${card.suit}.`,
    );
  }
  return {
    anchorIds: [...anchorIds],
    commonInstruction,
    instruction: `${commonInstruction} ${route.instruction}`,
    kind,
    styleFingerprintSha256: entry.styleFingerprintSha256,
    styleVersion: entry.version,
  };
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
