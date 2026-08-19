import { z } from "zod";
import {
  searchContractsArgsSchema,
  getContractAnalysisArgsSchema,
  askContractQuestionArgsSchema,
  searchOrganizationBrainArgsSchema,
  searchLegalKnowledgeArgsSchema,
} from "../../tools/schemas";
import { ASSISTANT_MAX_PLAN_STEPS } from "../../tools/definitions";

// Each variant pairs one literal tool name with that exact tool's own
// argument schema (tools/schemas.ts) - this is the mechanism, not just a
// convention to remember: the planner's structured completion can only
// ever parse into one of these five known {tool, arguments} shapes. A
// sixth tool name, a malformed argument object, or free text instead of
// JSON all fail Zod validation the same way any other structured-output
// mismatch does (getValidatedCompletion's existing retry-then-reject loop
// - see agents/assistant-planner.ts), never reaching tool execution. This
// is the concrete mechanism behind "the LLM must never generate SQL /
// invent tool names / provide an organization id": there is no code path
// where a tool name outside this union, or an organizationId argument, or
// a raw query, can parse successfully in the first place.
const planStepSchema = z.discriminatedUnion("tool", [
  z.object({
    tool: z.literal("searchContracts"),
    arguments: searchContractsArgsSchema,
  }),
  z.object({
    tool: z.literal("getContractAnalysis"),
    arguments: getContractAnalysisArgsSchema,
  }),
  z.object({
    tool: z.literal("askContractQuestion"),
    arguments: askContractQuestionArgsSchema,
  }),
  z.object({
    tool: z.literal("searchOrganizationBrain"),
    arguments: searchOrganizationBrainArgsSchema,
  }),
  z.object({
    tool: z.literal("searchLegalKnowledge"),
    arguments: searchLegalKnowledgeArgsSchema,
  }),
]);

// An empty `steps` array is valid and expected - a question that needs no
// Clausio capability (a greeting, something entirely out of scope) plans to
// do nothing, rather than being forced to call a tool "just in case."
export const assistantPlanSchemaV1 = z.object({
  steps: z.array(planStepSchema).max(ASSISTANT_MAX_PLAN_STEPS),
});

export type AssistantPlanV1 = z.infer<typeof assistantPlanSchemaV1>;
export type AssistantPlanStepV1 = AssistantPlanV1["steps"][number];
