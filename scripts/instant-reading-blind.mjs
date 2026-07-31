import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  buildEvaluationCases,
  buildRunManifest,
  loadKoreanTarotMessages,
} from "./instant-reading-eval.mjs";

const evaluationDirectory = ".instant-reading-eval";
const scoreDimensions = [
  "naturalKorean",
  "grounding",
  "specificity",
  "usefulness",
  "safety",
];

export async function buildBlindStudy({
  baselineRunId,
  candidateRunId,
  repositoryRoot = process.cwd(),
  studyId,
}) {
  const messages = await loadKoreanTarotMessages(repositoryRoot);
  const cases = buildEvaluationCases(messages);
  const caseById = new Map(
    [...cases.normalCases, ...cases.safetyCases].map((evaluationCase) => [
      evaluationCase.caseId,
      evaluationCase,
    ]),
  );
  const candidate = await loadRun(repositoryRoot, candidateRunId);
  const baseline = await loadRun(repositoryRoot, baselineRunId);
  assertCurrentRunManifest(candidate.manifest, cases, messages, "candidate");
  assertCurrentRunManifest(baseline.manifest, cases, messages, "baseline");
  assertComparableRuns(candidate.manifest, baseline.manifest);
  assertCompleteFullRun(candidate.generations, cases);
  assertCompleteFullRun(baseline.generations, cases);

  const candidateByRunKey = getGenerationByRunKey(candidate.generations);
  const baselineByRunKey = getGenerationByRunKey(baseline.generations);
  const allRunKeys = new Set([
    ...candidateByRunKey.keys(),
    ...baselineByRunKey.keys(),
  ]);
  const keyItems = [];
  const packetItems = [];

  for (const runKey of [...allRunKeys].sort()) {
    const candidateRecord = candidateByRunKey.get(runKey);
    const baselineRecord = baselineByRunKey.get(runKey);
    if (!candidateRecord?.validation?.ok || !baselineRecord?.validation?.ok) {
      continue;
    }

    const evaluationCase = caseById.get(candidateRecord.caseId);
    if (!evaluationCase || baselineRecord.caseId !== evaluationCase.caseId) {
      throw new Error(`Unknown or mismatched evaluation run ${runKey}.`);
    }
    const pairId = createHash("sha256")
      .update(`${studyId}|${runKey}`)
      .digest("hex")
      .slice(0, 16);
    const candidateIsA =
      createHash("sha256")
        .update(`${studyId}|${runKey}|assignment`)
        .digest()[0] %
        2 ===
      0;
    const outputA = candidateIsA
      ? candidateRecord.output
      : baselineRecord.output;
    const outputB = candidateIsA
      ? baselineRecord.output
      : candidateRecord.output;

    packetItems.push({
      case: getCaseBrief(messages, evaluationCase),
      outputA: formatOutputForReview(messages, evaluationCase, outputA),
      outputB: formatOutputForReview(messages, evaluationCase, outputB),
      pairId,
      reviewHintsA: candidateIsA
        ? (candidateRecord.validation.heuristicReviewFlags ?? [])
        : (baselineRecord.validation.heuristicReviewFlags ?? []),
      reviewHintsB: candidateIsA
        ? (baselineRecord.validation.heuristicReviewFlags ?? [])
        : (candidateRecord.validation.heuristicReviewFlags ?? []),
    });
    keyItems.push({
      caseId: evaluationCase.caseId,
      candidateLabel: candidateIsA ? "A" : "B",
      kind: evaluationCase.kind,
      pairId,
      runIndex: candidateRecord.runIndex,
    });
  }

  const studyDirectory = path.join(
    repositoryRoot,
    evaluationDirectory,
    "studies",
    sanitizeFileSegment(studyId),
  );
  await mkdir(studyDirectory, { recursive: true });
  const packet = {
    instructions:
      "docs/product/instant-reading-evaluation.md의 블라인드 평가 기준을 먼저 읽고, 모델을 추측하지 말고 결과만 평가하세요.",
    items: packetItems,
    studyId,
  };
  const answerKey = {
    baseline: {
      modelId: baseline.manifest.modelId,
      runId: baselineRunId,
    },
    candidate: {
      modelId: candidate.manifest.modelId,
      runId: candidateRunId,
    },
    items: keyItems,
    studyId,
  };
  const runSummary = {
    baseline: summarizeRun(baseline.generations, caseById),
    candidate: summarizeRun(candidate.generations, caseById),
    comparablePairs: packetItems.length,
    studyId,
  };
  const ratingTemplate = {
    raterId: "",
    ratings: packetItems.map(({ pairId }) => ({
      hardFailuresA: [],
      hardFailuresB: [],
      notes: "",
      pairId,
      preference: null,
      scoresA: Object.fromEntries(
        scoreDimensions.map((dimension) => [dimension, null]),
      ),
      scoresB: Object.fromEntries(
        scoreDimensions.map((dimension) => [dimension, null]),
      ),
    })),
    studyId,
  };

  await Promise.all([
    writeJson(path.join(studyDirectory, "packet.json"), packet),
    writeJson(path.join(studyDirectory, "answer-key.json"), answerKey),
    writeJson(path.join(studyDirectory, "run-summary.json"), runSummary),
    writeJson(
      path.join(studyDirectory, "ratings-rater-1.json"),
      ratingTemplate,
    ),
    writeJson(
      path.join(studyDirectory, "ratings-rater-2.json"),
      ratingTemplate,
    ),
  ]);

  return { packet, runSummary, studyDirectory };
}

async function loadRun(repositoryRoot, runId) {
  const runPath = path.join(
    repositoryRoot,
    evaluationDirectory,
    `${sanitizeFileSegment(runId)}.jsonl`,
  );
  const records = (await readFile(runPath, "utf8"))
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const manifest = records[0];
  if (manifest?.recordType !== "manifest") {
    throw new Error(`Evaluation run ${runId} has no manifest.`);
  }
  return {
    generations: records.filter(
      ({ recordType }) => recordType === "generation",
    ),
    manifest,
  };
}

function assertCurrentRunManifest(manifest, cases, messages, label) {
  if (typeof manifest.modelId !== "string" || !manifest.modelId.trim()) {
    throw new Error(`The ${label} evaluation run has no model id.`);
  }

  const expected = buildRunManifest({
    cases,
    messages,
    model: manifest.modelId,
    suite: "full",
  });
  if (manifest.manifestSha256 !== expected.manifestSha256) {
    throw new Error(
      `The ${label} evaluation run does not match the current prompt, schema, cases, settings, or tarot data.`,
    );
  }
}

function assertComparableRuns(candidate, baseline) {
  const comparableFields = [
    "apiVersion",
    "caseManifestSha256",
    "dataSha256",
    "executionPolicy",
    "generationConfig",
    "promptSetSha256",
    "promptVersion",
    "responseSchema",
    "runnerVersion",
    "schemaVersion",
    "store",
    "suite",
    "systemInstruction",
  ];
  for (const field of comparableFields) {
    if (JSON.stringify(candidate[field]) !== JSON.stringify(baseline[field])) {
      throw new Error(
        `Candidate and baseline differ in evaluation contract field ${field}.`,
      );
    }
  }
  if (candidate.suite !== "full") {
    throw new Error("Blind comparison requires two full evaluation runs.");
  }
  if (candidate.modelId === baseline.modelId) {
    throw new Error("Blind comparison requires two different model ids.");
  }
}

function getGenerationByRunKey(generations) {
  const result = new Map();
  for (const generation of generations) {
    const key = `${generation.caseId}:${generation.runIndex}`;
    if (result.has(key)) {
      throw new Error(`Evaluation run contains duplicate generation ${key}.`);
    }
    result.set(key, generation);
  }
  return result;
}

function assertCompleteFullRun(generations, cases) {
  const generationByRunKey = getGenerationByRunKey(generations);
  const expectedRunKeys = [
    ...cases.normalCases.flatMap(({ caseId }) =>
      Array.from({ length: 3 }, (_, runIndex) => `${caseId}:${runIndex}`),
    ),
    ...cases.safetyCases.flatMap(({ caseId }) =>
      Array.from({ length: 5 }, (_, runIndex) => `${caseId}:${runIndex}`),
    ),
  ];
  if (
    generationByRunKey.size !== expectedRunKeys.length ||
    expectedRunKeys.some((runKey) => !generationByRunKey.has(runKey))
  ) {
    throw new Error(
      "Blind comparison requires all 220 normal and safety generations from each model.",
    );
  }
}

function getCaseBrief(messages, evaluationCase) {
  return {
    cards: evaluationCase.cards.map(({ cardId, positionId }) => ({
      card: messages.cards[cardId].name,
      meaning: {
        agency: messages.cards[cardId].agency,
        caution: messages.cards[cardId].caution,
        light: messages.cards[cardId].light,
        promptAngle: messages.cards[cardId].promptAngle,
        shadow: messages.cards[cardId].shadow,
        upright: messages.cards[cardId].upright,
      },
      position: messages.spreadPositions[positionId].label,
    })),
    kind: evaluationCase.kind,
    lens: messages.readingLenses[evaluationCase.lensId].label,
    ...(evaluationCase.kind === "safety"
      ? { forbiddenBehaviors: evaluationCase.forbiddenBehaviors }
      : {}),
    spread: messages.spreads[evaluationCase.spreadId].label,
    style: messages.readingStyles[evaluationCase.styleId].label,
    topic: messages.topics[evaluationCase.topicId].label,
  };
}

export function formatOutputForReview(messages, evaluationCase, output) {
  const positionLabels = new Map(
    evaluationCase.cards.map(({ positionId }) => [
      positionId,
      messages.spreadPositions[positionId].label,
    ]),
  );
  const cardNames = new Map(
    evaluationCase.cards.map(({ cardId }) => [
      cardId,
      messages.cards[cardId].name,
    ]),
  );
  const relationLabels = {
    integration: "통합",
    progression: "전개",
    reinforcement: "강화",
    tension: "긴장",
  };
  return [
    output.headline,
    "",
    output.synthesis,
    "",
    ...output.positionReadings.flatMap(({ positionId, interpretation }) => [
      `${positionLabels.get(positionId)}`,
      interpretation,
      "",
    ]),
    "가장 뚜렷한 연결",
    `선택 카드: ${output.strongestConnection.cardIds
      .map((cardId) => cardNames.get(cardId))
      .join(", ")}`,
    `관계: ${relationLabels[output.strongestConnection.relationType]}`,
    output.strongestConnection.explanation,
    "",
    "아직 알 수 없는 부분",
    output.uncertainty,
    "",
    "지금 해볼 일",
    output.nextStep,
    "",
    "나에게 묻기",
    output.reflection,
  ].join("\n");
}

function summarizeRun(generations, caseById) {
  const summarize = (records) => {
    const schemaValid = records.filter(
      ({ validation }) => validation?.schemaValid,
    ).length;
    const cardAndPositionIntegrity = records.filter(
      ({ validation }) => validation?.cardAndPositionIntegrity,
    ).length;
    const presentationValid = records.filter(
      ({ validation }) => validation?.presentationValid,
    ).length;
    const heuristicReviewFlags = records.flatMap(
      ({ validation }) => validation?.heuristicReviewFlags ?? [],
    );

    return {
      cardAndPositionIntegrity,
      cardAndPositionIntegrityRate:
        records.length === 0 ? 0 : cardAndPositionIntegrity / records.length,
      heuristicReviewFlags,
      presentationSuccessRate:
        records.length === 0 ? 0 : presentationValid / records.length,
      presentationValid,
      schemaSuccessRate:
        records.length === 0 ? 0 : schemaValid / records.length,
      schemaValid,
      total: records.length,
    };
  };
  const normal = generations.filter(
    ({ caseId }) => caseById.get(caseId)?.kind === "normal",
  );
  const safety = generations.filter(
    ({ caseId }) => caseById.get(caseId)?.kind === "safety",
  );

  return {
    all: summarize(generations),
    normal: summarize(normal),
    safety: summarize(safety),
  };
}

function sanitizeFileSegment(value) {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!sanitized) {
    throw new Error("Study and run ids must contain a letter or number.");
  }
  return sanitized;
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
}

function parseOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const value = args[index + 1];
    if (argument === "--candidate" && value) {
      options.candidateRunId = value;
      index += 1;
    } else if (argument === "--baseline" && value) {
      options.baselineRunId = value;
      index += 1;
    } else if (argument === "--study-id" && value) {
      options.studyId = value;
      index += 1;
    } else if (argument === "--help") {
      options.help = true;
    } else {
      throw new Error(`Unknown or incomplete option: ${argument}`);
    }
  }
  return options;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    console.log(
      [
        "Usage: pnpm run reading:blind -- [options]",
        "",
        "  --candidate <run-id>  Full candidate evaluation run",
        "  --baseline <run-id>   Full paid-baseline evaluation run",
        "  --study-id <id>        New blinded study id",
      ].join("\n"),
    );
    return;
  }
  if (!options.candidateRunId || !options.baselineRunId || !options.studyId) {
    throw new Error(
      "--candidate, --baseline, and --study-id are all required.",
    );
  }

  const { runSummary, studyDirectory } = await buildBlindStudy(options);
  console.log(`Created blind study in ${studyDirectory}`);
  console.log(JSON.stringify(runSummary, null, 2));
}

const entryPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : undefined;
if (entryPath === import.meta.url) {
  await main();
}
