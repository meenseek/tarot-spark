import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

export const evaluationSourcePaths = Object.freeze([
  "scripts/instant-reading-blind.mjs",
  "scripts/instant-reading-eval-cases.mjs",
  "scripts/instant-reading-eval.mjs",
  "scripts/instant-reading-score.mjs",
  "scripts/instant-reading-source-hashes.mjs",
  "src/domain/tarot/instant-reading-contract.ts",
  "src/domain/tarot/instant-reading.ts",
]);

export function getEvaluationSourceContentHashes(repositoryRoot) {
  return Object.fromEntries(
    evaluationSourcePaths.map((sourcePath) => [
      sourcePath,
      createHash("sha256")
        .update(readFileSync(path.join(repositoryRoot, sourcePath), "utf8"))
        .digest("hex"),
    ]),
  );
}
