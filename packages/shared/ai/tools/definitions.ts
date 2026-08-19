import type { ZodTypeAny } from "zod";
import {
  searchContractsArgsSchema,
  getContractAnalysisArgsSchema,
  askContractQuestionArgsSchema,
  searchOrganizationBrainArgsSchema,
  searchLegalKnowledgeArgsSchema,
} from "./schemas";

// The complete, closed set of capabilities the Assistant's planner may
// select from (Phase 7 MVP). Adding a sixth tool means adding it here, to
// TOOL_DEFINITIONS below, to the assistant-plan schema's discriminated
// union (schemas/assistant-plan/v1.ts), and to the planner prompt's tool
// list (prompts/assistant-planner/v1.md) - all four kept in sync by hand,
// the same discipline already used for the Legal KB enums
// (schema.prisma's LegalSourceType/LegalAuthorityTier comment).
export const TOOL_NAMES = [
  "searchContracts",
  "getContractAnalysis",
  "askContractQuestion",
  "searchOrganizationBrain",
  "searchLegalKnowledge",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

// MVP cap on tool calls in a single plan. AI_ARCHITECTURE.md Section 7
// documents Plan-and-Execute as bounded ("plan, then synthesize") but does
// not freeze a specific number - this is an explicit MVP choice (one call
// per tool, the worst case for a single-round cross-capability question),
// not a silently-assumed default. Enforced twice: as a hard ceiling on the
// planner's own structured-completion schema (schemas/assistant-plan/v1.ts,
// so an oversized plan fails validation and gets retried/rejected before it
// ever reaches execution) and again, defensively, in the executor
// (executor.ts) for any plan object not produced via planAssistantSteps
// (e.g. a test, or a future manual/debug path). Revisit via Domain Review
// if real usage shows it's too tight or too loose - not something to
// silently bump.
export const ASSISTANT_MAX_PLAN_STEPS = 5;

export interface ToolDefinition {
  name: ToolName;
  description: string;
  argsSchema: ZodTypeAny;
  // Human-readable capability name used when presenting this tool's
  // results to the final synthesis prompt and in the Assistant's returned
  // sources (agents/assistant-aggregation.ts) - the mechanism the Batch 3
  // spec means by "distinguish Contract Analysis, Clause Investigator,
  // Organization Brain, Legal KB when synthesizing." One label per tool,
  // defined once here rather than in a second, parallel map.
  capabilityLabel: string;
}

export const TOOL_DEFINITIONS: Record<ToolName, ToolDefinition> = {
  searchContracts: {
    name: "searchContracts",
    description:
      "Find contracts in the caller's organization by title/counterparty text search, legal state, tag, or expiration bucket. Returns a list of matching contracts (id, title, counterparty, legal state, tags, expiration date) - not their content or analysis. Use this first when a question refers to a set of contracts and no specific contract id is already known.",
    argsSchema: searchContractsArgsSchema,
    capabilityLabel: "Contract Search",
  },
  getContractAnalysis: {
    name: "getContractAnalysis",
    description:
      "Retrieve the latest completed AI risk and summary analysis already computed for one specific contract (health score, red flags with severity and source text, plain-language summary). Requires a contractId already known (e.g. from searchContracts or conversation history). Does not run new analysis.",
    argsSchema: getContractAnalysisArgsSchema,
    capabilityLabel: "Contract Analysis",
  },
  askContractQuestion: {
    name: "askContractQuestion",
    description:
      "Ask a natural-language question about the text of one specific contract and get a grounded, citation-verified answer drawn from that contract's own extracted text (Clause Investigator). Requires a contractId already known. Use this when getContractAnalysis's structured output doesn't already answer the question.",
    argsSchema: askContractQuestionArgsSchema,
    capabilityLabel: "Clause Investigator",
  },
  searchOrganizationBrain: {
    name: "searchOrganizationBrain",
    description:
      "Ask a natural-language question about the organization's own uploaded internal documents (policies, templates, preferred clause language, guidelines) and get a grounded, citation-verified answer. Use this for questions about the organization's own stated positions or standards.",
    argsSchema: searchOrganizationBrainArgsSchema,
    capabilityLabel: "Organization Brain",
  },
  searchLegalKnowledge: {
    name: "searchLegalKnowledge",
    description:
      "Ask a natural-language question about Lebanese law, grounded in the indexed Lebanese legal texts, with citations to the specific instrument and article. This corpus is global, shared across every organization, and never filtered by organization. Use this for questions about what Lebanese law says.",
    argsSchema: searchLegalKnowledgeArgsSchema,
    capabilityLabel: "Legal Knowledge Base",
  },
};
