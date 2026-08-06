import type { GoldenExample } from "./types";

export const GOLDEN_SET: GoldenExample[] = [
  {
    id: "test-001",
    promptId: "test",
    schemaId: "test",
    input:
      'Reply with ONLY raw JSON, no markdown fences, matching exactly {"answer": "<string>"}. Set answer to "golden-set-ok".',
    expected: { answer: "golden-set-ok" },
  },
];
