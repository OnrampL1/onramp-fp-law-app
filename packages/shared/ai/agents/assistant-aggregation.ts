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

export interface AssistantFailedTool {
  tool: ToolName;
  error: string;
}

export interface AggregatedAssistantContext {
  evidence: AssistantEvidenceUnit[];
  // Contracts found by searchContracts - reference data, not citable
  // "evidence" in the excerpt sense (there's no excerpt to quote), so kept
  // as its own list rather than forced into AssistantEvidenceUnit's shape.
  contractsFound: SearchContractsResultItem[];
  failedTools: AssistantFailedTool[];
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

function fromAskContractQuestion(
  data: AskContractQuestionResult,
): AssistantEvidenceUnit[] {
  const capability = capabilityOf("askContractQuestion");
  const units: AssistantEvidenceUnit[] = [
    {
      id: `askContractQuestion-${data.contractId}-answer`,
      tool: "askContractQuestion",
      capability,
      label: "Clause Investigator answer",
      content: data.answer,
      contractId: data.contractId,
      confidence: data.confidence,
    },
  ];

  for (const source of data.sources) {
    units.push({
      id: source.chunkId,
      tool: "askContractQuestion",
      capability,
      label: source.headingPath ?? "Contract clause",
      content: source.excerpt,
      contractId: data.contractId,
      confidence: data.confidence,
    });
  }

  return units;
}

function fromSearchOrganizationBrain(
  data: SearchOrganizationBrainResult,
): AssistantEvidenceUnit[] {
  const capability = capabilityOf("searchOrganizationBrain");
  const units: AssistantEvidenceUnit[] = [
    {
      id: "searchOrganizationBrain-answer",
      tool: "searchOrganizationBrain",
      capability,
      label: "Organization Brain answer",
      content: data.answer,
      confidence: data.confidence,
    },
  ];

  for (const source of data.sources) {
    units.push({
      id: source.chunkId,
      tool: "searchOrganizationBrain",
      capability,
      label: source.headingPath ?? "Organization document",
      content: source.excerpt,
      confidence: data.confidence,
    });
  }

  return units;
}

function fromSearchLegalKnowledge(
  data: SearchLegalKnowledgeResult,
): AssistantEvidenceUnit[] {
  const capability = capabilityOf("searchLegalKnowledge");
  const units: AssistantEvidenceUnit[] = [
    {
      id: "searchLegalKnowledge-answer",
      tool: "searchLegalKnowledge",
      capability,
      label: "Legal Knowledge Base answer",
      content: data.answer,
      confidence: data.confidence,
    },
  ];

  for (const source of data.sources) {
    const label = source.articleNumber
      ? `${source.instrumentTitle} — Article ${source.articleNumber}`
      : source.instrumentTitle;
    units.push({
      id: source.chunkId,
      tool: "searchLegalKnowledge",
      capability,
      label,
      content: source.excerpt,
      confidence: data.confidence,
    });
  }

  return units;
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

  for (const outcome of outcomes) {
    if (!outcome.ok || !outcome.result) {
      failedTools.push({
        tool: outcome.tool,
        error: outcome.error ?? "Tool execution failed",
      });
      continue;
    }

    switch (outcome.result.tool) {
      case "searchContracts":
        for (const contract of outcome.result.data.contracts) {
          contractsById.set(contract.id, contract);
        }
        break;
      case "getContractAnalysis":
        evidence.push(...fromGetContractAnalysis(outcome.result.data));
        break;
      case "askContractQuestion":
        evidence.push(...fromAskContractQuestion(outcome.result.data));
        break;
      case "searchOrganizationBrain":
        evidence.push(...fromSearchOrganizationBrain(outcome.result.data));
        break;
      case "searchLegalKnowledge":
        evidence.push(...fromSearchLegalKnowledge(outcome.result.data));
        break;
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
    contractsFound,
    failedTools,
    hasEvidence: dedupedEvidence.length > 0 || contractsFound.length > 0,
  };
}
