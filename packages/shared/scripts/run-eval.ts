import {
  GOLDEN_SET,
  LEGAL_KB_GOLDEN_SET,
  ASSISTANT_GOLDEN_SET,
  runGoldenSet,
  runLegalKbGoldenSet,
  runAssistantGoldenSet,
} from "../ai/evaluation";
import type {
  AssistantGoldenExample,
  GoldenExample,
  LegalKbGoldenExample,
  ScoreResult,
} from "../ai/evaluation";

function printResults(
  label: string,
  results: ScoreResult[],
  byId: Map<string, GoldenExample | LegalKbGoldenExample | AssistantGoldenExample>,
): void {
  const passed = results.filter((r) => r.passed).length;
  console.log(`\n${label}: ${passed}/${results.length} passed\n`);

  for (const result of results) {
    console.log(`${result.passed ? "PASS" : "FAIL"} ${result.exampleId}`);
    if (!result.passed) {
      console.log("  expected:", JSON.stringify(result.expected));
      console.log("  actual:  ", JSON.stringify(result.actual));
    }
  }

  const groupBy = (
    keyFn: (id: string) => string | undefined,
  ): Map<string, { passed: number; total: number }> => {
    const groups = new Map<string, { passed: number; total: number }>();
    for (const result of results) {
      const key = keyFn(result.exampleId);
      if (!key) continue;
      const group = groups.get(key) ?? { passed: 0, total: 0 };
      group.total += 1;
      if (result.passed) group.passed += 1;
      groups.set(key, group);
    }
    return groups;
  };

  const byCategory = groupBy((id) => byId.get(id)?.category);
  const byScenario = groupBy((id) => byId.get(id)?.scenario);

  console.log("\nBy category:");
  for (const [category, { passed: p, total }] of byCategory) {
    console.log(`  ${category}: ${p}/${total}`);
  }

  console.log("\nBy scenario:");
  for (const [scenario, { passed: p, total }] of byScenario) {
    console.log(`  ${scenario}: ${p}/${total}`);
  }
}

async function main() {
  const organizationId = process.env.EVAL_ORGANIZATION_ID;

  if (!organizationId) {
    console.error(
      "Set EVAL_ORGANIZATION_ID to a real organization id before running.",
    );
    process.exit(1);
  }

  const summary = await runGoldenSet(organizationId);
  const byId = new Map(GOLDEN_SET.map((example) => [example.id, example]));
  printResults("Golden set", summary.results, byId);

  // Run separately from the contract/organization-brain set above, not
  // merged into one array or one summary — see LegalKbGoldenExample's
  // comment in types.ts for why the execution model has to differ
  // (real retrieval pipeline, not a single completion call). Reported
  // together here so `npm run eval` remains one command with one combined
  // report, same as before this was added.
  const legalKbSummary = await runLegalKbGoldenSet(organizationId);
  const legalKbById = new Map(
    LEGAL_KB_GOLDEN_SET.map((example) => [example.id, example]),
  );
  console.log(
    "\n\n=== Legal Knowledge Base ===\n" +
      "(025/026 are known-issue regression watches, not a quality bar — see\n" +
      "DOMAIN_REVIEW_BACKLOG.md. PASS there means \"documented behavior\n" +
      "unchanged,\" not \"correct.\")",
  );
  printResults("Legal KB golden set", legalKbSummary.results, legalKbById);

  // Same "run separately, report together" shape as Legal KB above — see
  // AssistantGoldenExample's comment in types.ts for why the Assistant
  // needs its own execution model too (a multi-step pipeline, not a single
  // completion call, judged at three possible stages per case).
  const assistantSummary = await runAssistantGoldenSet(organizationId);
  const assistantById = new Map(
    ASSISTANT_GOLDEN_SET.map((example) => [example.id, example]),
  );
  console.log(
    "\n\n=== AI Assistant ===\n" +
      "(pipeline-stage cases run against fake tool implementations, not the\n" +
      "real packages/api-backed ones — see fixtures/assistant/pipeline-cases.ts.\n" +
      "They judge planner + synthesis behavior, not database/retrieval wiring,\n" +
      "which is already covered by packages/api's own unit tests.)",
  );
  printResults("Assistant golden set", assistantSummary.results, assistantById);

  const totalFailed = summary.failed + legalKbSummary.failed + assistantSummary.failed;
  const totalPassed = summary.passed + legalKbSummary.passed + assistantSummary.passed;
  const total = summary.total + legalKbSummary.total + assistantSummary.total;
  console.log(`\n\nCombined: ${totalPassed}/${total} passed`);

  process.exit(totalFailed > 0 ? 1 : 0);
}

main();
