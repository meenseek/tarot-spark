import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { getTarotData } from "../src/i18n/tarot-data";
import { planReadingEvaluation } from "../src/server/reading-evaluation-plan";

try {
  const { values, tokens } = parseArgs({
    options: {
      stage: { type: "string" },
      cases: { type: "string" },
      previous: { type: "string" },
      case: { type: "string", multiple: true },
      help: { type: "boolean" },
    },
    tokens: true,
    strict: true,
    allowPositionals: false,
  });
  if (values.help) {
    console.log(
      "pnpm eval:plan --stage development|release --cases FILE [--previous PLAN] [--case ID]",
    );
  } else {
    for (const name of ["stage", "cases", "previous"]) {
      if (
        tokens.filter((token) => token.kind === "option" && token.name === name)
          .length > 1
      ) {
        throw new RangeError("Do not repeat stage, cases or previous options.");
      }
    }
    if (
      (values.stage !== "development" && values.stage !== "release") ||
      !values.cases?.trim()
    ) {
      throw new RangeError("Provide an explicit stage and cases file.");
    }
    const input: unknown = JSON.parse(readFileSync(values.cases, "utf8"));
    const previous: unknown = values.previous
      ? JSON.parse(readFileSync(values.previous, "utf8"))
      : undefined;
    const plan = planReadingEvaluation(getTarotData("ko"), input, {
      stage: values.stage,
      ...(values.case ? { caseIds: values.case } : {}),
      previous,
    });
    console.log(JSON.stringify(plan, null, 2));
  }
} catch (error) {
  console.error(
    error instanceof RangeError
      ? error.message
      : "Invalid evaluation inputs. Use --help for the command contract.",
  );
  process.exitCode = 1;
}
