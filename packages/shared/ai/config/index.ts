function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

export function getOpenRouterApiKey(): string {
  return getRequiredEnv("OPENROUTER_API_KEY");
}

export function getDefaultAiModel(): string {
  return process.env.AI_DEFAULT_MODEL ?? "openai/gpt-4o-mini";
}

// Environment-level switch, not a per-call param — deliberately, so a mock
// can never be left on by accident in a real request path. Approved as part
// of Phase 3's cost controls: chunking, storage, and retrieval ranking need
// to be testable offline without risking real API spend.
export type AiProviderMode = "real" | "mock";

export function getAiProviderMode(): AiProviderMode {
  return process.env.AI_PROVIDER_MODE === "mock" ? "mock" : "real";
}

// Hard ceiling on chunks produced per contract, checked before any embedding
// calls fire. Guards against a bug or accidental reprocessing loop
// multiplying calls — 500 gives headroom above a realistic ~200-page
// contract (roughly 150-200 chunks at 500-800 tokens each) while still
// catching a genuine runaway.
export function getMaxChunksPerContract(): number {
  const raw = process.env.INVESTIGATOR_MAX_CHUNKS_PER_CONTRACT;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 500;
}

// Not binding from AI_ARCHITECTURE.md, but a cheap, sensible cost guardrail
// alongside the chunk ceiling (approved alongside the chunk ceiling) — 2,000
// tokens is more than enough for a Q&A answer.
export function getInvestigatorMaxTokens(): number {
  const raw = process.env.INVESTIGATOR_MAX_TOKENS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2000;
}

// How many prior question/answer turns to include for follow-up questions.
// Enforced server-side regardless of how much history the client sends —
// see the reasoning in the Phase 3d plan: 3 balances follow-up coherence
// against token cost.
export function getInvestigatorHistoryTurnLimit(): number {
  const raw = process.env.INVESTIGATOR_HISTORY_TURN_LIMIT;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 3;
}

// Same rationale as getMaxChunksPerContract — a hard ceiling checked before
// any embedding calls fire. Kept as its own config/env var rather than
// reusing the contract one so each corpus can be tuned independently.
export function getMaxChunksPerOrganizationBrainItem(): number {
  const raw = process.env.ORGANIZATION_BRAIN_MAX_CHUNKS_PER_ITEM;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 500;
}
