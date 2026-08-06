import { runGoldenSet } from "../ai/evaluation";

async function main() {
  const organizationId = process.env.EVAL_ORGANIZATION_ID;

  if (!organizationId) {
    console.error(
      "Set EVAL_ORGANIZATION_ID to a real organization id before running.",
    );
    process.exit(1);
  }

  const summary = await runGoldenSet(organizationId);

  console.log(`\nGolden set: ${summary.passed}/${summary.total} passed\n`);

  for (const result of summary.results) {
    console.log(`${result.passed ? "PASS" : "FAIL"} ${result.exampleId}`);
    if (!result.passed) {
      console.log("  expected:", JSON.stringify(result.expected));
      console.log("  actual:  ", JSON.stringify(result.actual));
    }
  }

  process.exit(summary.failed > 0 ? 1 : 0);
}

main();
