import { GOLDEN_SET, runGoldenSet } from "../ai/evaluation";

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

  console.log(`\nGolden set: ${summary.passed}/${summary.total} passed\n`);

  for (const result of summary.results) {
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
    for (const result of summary.results) {
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
  for (const [category, { passed, total }] of byCategory) {
    console.log(`  ${category}: ${passed}/${total}`);
  }

  console.log("\nBy scenario:");
  for (const [scenario, { passed, total }] of byScenario) {
    console.log(`  ${scenario}: ${passed}/${total}`);
  }

  process.exit(summary.failed > 0 ? 1 : 0);
}

main();
