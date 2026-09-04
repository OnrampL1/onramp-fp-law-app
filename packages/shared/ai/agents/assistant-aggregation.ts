import { TOOL_DEFINITIONS, type ToolName } from "../tools/definitions";
import type { ToolExecutionOutcome } from "../tools/executor";
import type {
  AskContractQuestionResult,
  GetContractAnalysisResult,
  SearchContractsResultItem,
  SearchLegalKnowledgeResult,
  SearchOrganizationBrainResult,
} from "../tools/types";

// One evidence unit per citable fact gathered by any tool - never a single
// flattened string (Batch 3 spec: "Do not immediately flatten everything
// into one giant string"). `id` is what the final synthesis prompt cites
// by, and what assistant-synthesizer.ts's evidence-reference check looks
// up against - the same "cite by id, enrich by lookup afterward" shape
// already used for every other corpus (enrichSources/enrichLegalSources in
// retrieval/investigator.ts), just one level up.
export interface AssistantEvidenceUnit {
  id: string;
  tool: ToolName;
  capability: string;
  label: string;
  content: string;
  contractId?: string;
  confidence?: number;
}

// A sub-tool's own already-synthesized prose (e.g. answerOrganizationBrainQuestion's
// "answer") kept as background context for the final synthesis prompt, but
// deliberately NOT a citable AssistantEvidenceUnit - it has no `id`, so
// nothing in the final synthesis prompt can point a citation at it. Without
// this split, that whole paragraph used to become the only citable
// "evidence" available whenever the model didn't bother citing the finer
// chunk-level excerpts sitting right next to it, which produced a source
// card that just re-quoted the entire answer back at the user - the same
// paragraph twice, no real "source" in the citation sense. The chunk-level
// excerpts (still real AssistantEvidenceUnits) remain the only thing a
// citation can point to; this is just context to write from.
export interface AssistantSubAnswer {
  tool: ToolName;
  capability: string;
  contractId?: string;
  text: string;
}

export interface AssistantFailedTool {
  tool: ToolName;
  error: string;
  // Carried through from ToolExecutionOutcome.notIndexed (executor.ts) -
  // true only when this specific failure was NoIndexedContentError, so
  // formatUnavailableTools() in assistant-synthesizer.ts can reveal the
  // precise reason instead of a generic "was unavailable" for this one
  // distinguishable case.
  notIndexed?: boolean;
}

// A tool that ran successfully and correctly produced nothing - not a
// failure (failedTools) and not evidence (a "no rows matched" result has
// no content to cite). Without tracking this separately, a successful
// empty search was indistinguishable, by the time it reached the
// synthesis prompt, from a tool that was never called at all - observed
// live: "which of our active contracts are expiring in the next 90 days"
// against an organization with genuinely none produced the same generic
// "I couldn't find enough grounded information" decline as a question
// nothing was ever searched for, instead of the honest, specific "you
// have none" answer the search itself already proved.
export interface AssistantEmptyResult {
  tool: ToolName;
  note: string;
}

export interface AggregatedAssistantContext {
  evidence: AssistantEvidenceUnit[];
  // Sub-tool answers kept as non-citable context - see AssistantSubAnswer.
  subAnswers: AssistantSubAnswer[];
  // Contracts found by searchContracts - reference data, not citable
  // "evidence" in the excerpt sense (there's no excerpt to quote), so kept
  // as its own list rather than forced into AssistantEvidenceUnit's shape.
  contractsFound: SearchContractsResultItem[];
  failedTools: AssistantFailedTool[];
  emptyResults: AssistantEmptyResult[];
  hasEvidence: boolean;
}

function capabilityOf(tool: ToolName): string {
  return TOOL_DEFINITIONS[tool].capabilityLabel;
}

function fromGetContractAnalysis(
  data: GetContractAnalysisResult,
): AssistantEvidenceUnit[] {
  const units: AssistantEvidenceUnit[] = [];
  const capability = capabilityOf("getContractAnalysis");

  if (data.risk) {
    units.push({
      id: `${data.risk.analysisId}-summary`,
      tool: "getContractAnalysis",
      capability,
      label: "Risk analysis summary",
      content: data.risk.summary,
      contractId: data.contractId,
    });
    data.risk.redFlags.forEach((flag, index) => {
      units.push({
        id: `${data.risk!.analysisId}-flag-${index}`,
        tool: "getContractAnalysis",
        capability,
        label: `${flag.severity} risk — ${flag.category}`,
        content: flag.sourceText,
        contractId: data.contractId,
      });
    });
  }

  if (data.summary) {
    units.push({
      id: `${data.summary.analysisId}-text`,
      tool: "getContractAnalysis",
      capability,
      label: "Contract summary",
      content: data.summary.text,
      contractId: data.contractId,
    });
  }

  return units;
}

interface ToolAggregationResult {
  evidence: AssistantEvidenceUnit[];
  subAnswer: AssistantSubAnswer;
}

function fromAskContractQuestion(
  data: AskContractQuestionResult,
): ToolAggregationResult {
  const capability = capabilityOf("askContractQuestion");
  const evidence: AssistantEvidenceUnit[] = data.sources.map((source) => ({
    id: source.chunkId,
    tool: "askContractQuestion" as const,
    capability,
    label: source.headingPath ?? "Contract clause",
    content: source.excerpt,
    contractId: data.contractId,
    confidence: data.confidence,
  }));

  return {
    evidence,
    subAnswer: {
      tool: "askContractQuestion",
      capability,
      contractId: data.contractId,
      text: data.answer,
    },
  };
}

function fromSearchOrganizationBrain(
  data: SearchOrganizationBrainResult,
): ToolAggregationResult {
  const capability = capabilityOf("searchOrganizationBrain");
  const evidence: AssistantEvidenceUnit[] = data.sources.map((source) => ({
    id: source.chunkId,
    tool: "searchOrganizationBrain" as const,
    capability,
    label: source.headingPath ?? "Organization document",
    content: source.excerpt,
    confidence: data.confidence,
  }));

  return {
    evidence,
    subAnswer: { tool: "searchOrganizationBrain", capability, text: data.answer },
  };
}

function fromSearchLegalKnowledge(
  data: SearchLegalKnowledgeResult,
): ToolAggregationResult {
  const capability = capabilityOf("searchLegalKnowledge");
  const evidence: AssistantEvidenceUnit[] = data.sources.map((source) => {
    const label = source.articleNumber
      ? `${source.instrumentTitle} — Article ${source.articleNumber}`
      : source.instrumentTitle;
    return {
      id: source.chunkId,
      tool: "searchLegalKnowledge" as const,
      capability,
      label,
      content: source.excerpt,
      confidence: data.confidence,
    };
  });

  return {
    evidence,
    subAnswer: { tool: "searchLegalKnowledge", capability, text: data.answer },
  };
}

// Plan-and-Execute, not ReAct: this reads every tool's already-produced,
// already-verified result and reshapes it - it never calls a tool, retries
// one, or decides to gather more evidence itself.
export function aggregateToolResults(
  outcomes: ToolExecutionOutcome[],
): AggregatedAssistantContext {
  const evidence: AssistantEvidenceUnit[] = [];
  const contractsById = new Map<string, SearchContractsResultItem>();
  const failedTools: AssistantFailedTool[] = [];
  const emptyResults: AssistantEmptyResult[] = [];
  const subAnswers: AssistantSubAnswer[] = [];

  for (const outcome of outcomes) {
    if (!outcome.ok || !outcome.result) {
      failedTools.push({
        tool: outcome.tool,
        error: outcome.error ?? "Tool execution failed",
        notIndexed: outcome.notIndexed,
      });
      continue;
    }

    switch (outcome.result.tool) {
      case "searchContracts":
        if (outcome.result.data.contracts.length === 0) {
          emptyResults.push({
            tool: "searchContracts",
            note: "A contract search ran successfully and matched zero contracts.",
          });
        } else {
          for (const contract of outcome.result.data.contracts) {
            contractsById.set(contract.id, contract);
          }
        }
        break;
      case "getContractAnalysis":
        if (!outcome.result.data.risk && !outcome.result.data.summary) {
          emptyResults.push({
            tool: "getContractAnalysis",
            note: `No completed AI analysis exists yet for contract ${outcome.result.data.contractId}.`,
          });
        } else {
          evidence.push(...fromGetContractAnalysis(outcome.result.data));
        }
        break;
      case "askContractQuestion": {
        const result = fromAskContractQuestion(outcome.result.data);
        evidence.push(...result.evidence);
        subAnswers.push(result.subAnswer);
        break;
      }
      case "searchOrganizationBrain": {
        const result = fromSearchOrganizationBrain(outcome.result.data);
        evidence.push(...result.evidence);
        subAnswers.push(result.subAnswer);
        break;
      }
      case "searchLegalKnowledge": {
        const result = fromSearchLegalKnowledge(outcome.result.data);
        evidence.push(...result.evidence);
        subAnswers.push(result.subAnswer);
        break;
      }
    }
  }

  const contractsFound = [...contractsById.values()];

  // Dedupe by id, keeping the first occurrence - a chunk cited more than
  // once by the same underlying tool call's own answer (e.g. a single-chunk
  // document grounding several distinct sentences) would otherwise become
  // several identical [EVIDENCE id=X] blocks in the synthesis prompt, which
  // both wastes context and, observed live, encourages the synthesis model
  // to mirror that repetition back into its own `sources` list. Same
  // Map-keyed-by-id pattern already used for contractsById above.
  const evidenceById = new Map(evidence.map((unit) => [unit.id, unit]));
  const dedupedEvidence = [...evidenceById.values()];

  return {
    evidence: dedupedEvidence,
    subAnswers,
    contractsFound,
    failedTools,
    emptyResults,
    hasEvidence: dedupedEvidence.length > 0 || contractsFound.length > 0,
  };
}
