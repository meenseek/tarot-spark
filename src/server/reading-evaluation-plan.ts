import "server-only";

import { createHash } from "node:crypto";
import {
  parseInstantReadingRequest,
  type InstantReadingRequest,
  type LocaleTarotData,
} from "@/domain/tarot";
import {
  buildOpenAIInstantReadingBody,
  isInstantReadingRequestConsistent,
} from "./instant-reading";

export type ReadingEvaluationStage = "development" | "release";
export type ReadingEvaluationCase = {
  readonly caseId: string;
  readonly kind: "normal" | "safety";
  readonly request: InstantReadingRequest;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readCases(input: unknown): ReadingEvaluationCase[] {
  if (
    !isRecord(input) ||
    !Array.isArray(input["cases"]) ||
    input["cases"].length === 0
  ) {
    throw new RangeError("Provide a nonempty cases array.");
  }
  const seen = new Set<string>();
  return input["cases"].map((row: unknown) => {
    if (
      !isRecord(row) ||
      Object.keys(row).some(
        (key) => !["caseId", "kind", "request"].includes(key),
      ) ||
      typeof row["caseId"] !== "string" ||
      !row["caseId"].trim() ||
      row["caseId"] !== row["caseId"].trim() ||
      (row["kind"] !== "normal" && row["kind"] !== "safety")
    ) {
      throw new RangeError("Invalid public evaluation case.");
    }
    if (seen.has(row["caseId"])) {
      throw new RangeError("Evaluation case IDs must be unique.");
    }
    seen.add(row["caseId"]);
    const request = parseInstantReadingRequest(row["request"]);
    if (!request) {
      throw new RangeError(
        "Evaluation requests must be eligible public inputs.",
      );
    }
    return { caseId: row["caseId"], kind: row["kind"], request };
  });
}

function readPreviousHashes(previous: unknown): Map<string, string> {
  if (previous === undefined) return new Map();
  if (!isRecord(previous) || !Array.isArray(previous["cases"])) {
    throw new RangeError("Previous plan must contain case hashes.");
  }
  const hashes = new Map<string, string>();
  for (const row of previous["cases"]) {
    if (
      !isRecord(row) ||
      typeof row["caseId"] !== "string" ||
      typeof row["bodySha256"] !== "string" ||
      !/^[a-f0-9]{64}$/.test(row["bodySha256"]) ||
      hashes.has(row["caseId"])
    ) {
      throw new RangeError("Invalid previous case hash.");
    }
    hashes.set(row["caseId"], row["bodySha256"]);
  }
  return hashes;
}

export function planReadingEvaluation(
  tarotData: LocaleTarotData,
  input: unknown,
  options: {
    readonly stage: ReadingEvaluationStage;
    readonly caseIds?: readonly string[];
    readonly previous?: unknown;
  },
) {
  if (options.stage !== "development" && options.stage !== "release") {
    throw new RangeError("Choose development or release evaluation.");
  }
  const cases = readCases(input);
  if (options.stage === "release") {
    if (options.caseIds?.length) {
      throw new RangeError("Release evaluation cannot select a subset.");
    }
    if (
      cases.length !== 100 ||
      cases.filter(({ kind }) => kind === "normal").length !== 50 ||
      cases.filter(({ kind }) => kind === "safety").length !== 50
    ) {
      throw new RangeError(
        "Release evaluation requires 50 normal and 50 safety cases.",
      );
    }
  }
  const selection = new Set(options.caseIds);
  if (
    selection.size !== (options.caseIds?.length ?? 0) ||
    [...selection].some((id) => !cases.some(({ caseId }) => caseId === id))
  ) {
    throw new RangeError("Select unique existing case IDs.");
  }
  const previous = readPreviousHashes(options.previous);
  const plannedCases = cases
    .filter(({ caseId }) => selection.size === 0 || selection.has(caseId))
    .map((entry) => {
      if (!isInstantReadingRequestConsistent(tarotData, entry.request)) {
        throw new RangeError(
          "Evaluation request does not match the current catalog.",
        );
      }
      const body = buildOpenAIInstantReadingBody(tarotData, entry.request);
      const serialized = JSON.stringify(body);
      const bodySha256 = createHash("sha256").update(serialized).digest("hex");
      const bodyChanged = previous.get(entry.caseId) !== bodySha256;
      return {
        ...entry,
        bodySha256,
        requestBytes: Buffer.byteLength(serialized, "utf8"),
        bodyChanged,
        generationCandidate: options.stage === "release" || bodyChanged,
      };
    });
  return {
    stage: options.stage,
    executesProvider: false,
    cases: plannedCases,
    counts: {
      planned: plannedCases.length,
      changedBodies: plannedCases.filter(({ bodyChanged }) => bodyChanged)
        .length,
      generationCandidates: plannedCases.filter(
        ({ generationCandidate }) => generationCandidate,
      ).length,
      uniqueBodies: new Set(plannedCases.map(({ bodySha256 }) => bodySha256))
        .size,
    },
    maximumRequestBytes: Math.max(
      ...plannedCases.map(({ requestBytes }) => requestBytes),
    ),
  };
}
