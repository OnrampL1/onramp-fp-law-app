export interface GoldenExample {
  id: string;
  promptId: string;
  schemaId: string;
  input: string;
  expected: unknown;
}

export interface ScoreResult {
  exampleId: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
}

export interface GoldenSetRunSummary {
  total: number;
  passed: number;
  failed: number;
  results: ScoreResult[];
}
