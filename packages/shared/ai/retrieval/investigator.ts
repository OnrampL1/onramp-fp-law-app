import { getPrismaClient } from "../../db";
import {
  searchContractChunks,
  searchOrganizationBrainChunks,
  type RetrievedChunk,
} from "./search";
import { verifyCitations, type CitedSource } from "./citations";
import {
  getValidatedCompletion,
  AiValidationError,
  type StructuredCompletionResult,
} from "../schemas";
import { resolvePrompt, resolveSchema } from "../registry";
import {
  getInvestigatorMaxTokens,
  getInvestigatorHistoryTurnLimit,
} from "../config";
import type { AiMessage } from "../types";

const prisma = getPrismaClient();

const MAX_GENERATION_ATTEMPTS = 2;

export interface InvestigatorTurn {
  question: string;
  answer: string;
}

export interface InvestigatorSource extends CitedSource {
  sourceId: string;
  headingPath: string | null;
}

export interface InvestigatorAnswer {
  answer: string;
  sources: InvestigatorSource[];
  confidence?: number;
  chunksRetrieved: number;
}

export class NoIndexedContentError extends Error {}

interface InvestigatorResponseShape {
  answer: string;
  sources: CitedSource[];
  confidence?: number;
}

// The prompt only asks the model for {chunkId, excerpt} — deliberately not
// asking it to also repeat heading text, which is more surface area for it
// to get wrong for no reason. Heading labels and the source document's id
// are looked up here from the already-retrieved (and already
// citation-verified) chunks instead.
function enrichSources(
  sources: CitedSource[],
  retrievedChunks: RetrievedChunk[],
): InvestigatorSource[] {
  const chunkById = new Map(retrievedChunks.map((chunk) => [chunk.id, chunk]));
  return sources.map((source) => ({
    ...source,
    sourceId: chunkById.get(source.chunkId)?.sourceId ?? "",
    headingPath: chunkById.get(source.chunkId)?.headingPath ?? null,
  }));
}

function formatSourceBlocks(chunks: RetrievedChunk[]): string {
  return chunks
    .map(
      (c) =>
        `[SOURCE id=${c.id} heading=${JSON.stringify(c.headingPath ?? "")}]\n${c.content}\n[/SOURCE]`,
    )
    .join("\n\n");
}

// Exported for direct unit testing — history ordering (question, answer,
// question, answer, ..., final question) is the one part of this pipeline
// with real off-by-one/role-mixup risk; slicing to the turn limit
// (getInvestigatorHistoryTurnLimit) is a trivial Array.slice call by
// contrast and doesn't need its own test rig.
export function buildMessages(
  systemPrompt: string,
  history: InvestigatorTurn[],
  sourceBlocks: string,
  question: string,
): AiMessage[] {
  const messages: AiMessage[] = [{ role: "system", content: systemPrompt }];

  for (const turn of history) {
    messages.push({ role: "user", content: turn.question });
    messages.push({ role: "assistant", content: turn.answer });
  }

  // The "respond with ONLY JSON" rule lives in the system prompt, but on
  // history-bearing calls it can end up several turns back in the
  // conversation — validated empirically to correlate with the model
  // prepending prose before (or instead of) the JSON object. Repeating it
  // right next to the question fixes that without touching the system
  // prompt's content.
  messages.push({
    role: "user",
    content: `${sourceBlocks}\n\nQuestion: ${question}\n\nReminder: respond with ONLY the JSON object described in the system prompt — no prose before or after it, no markdown code fences.`,
  });

  return messages;
}

// The shared shape behind every corpus's RAG answer (AI_ROADMAP.md Section
// 4 — one implementation, parameterized by corpus type): retrieve, then
// generate, verifying every citation before returning it — regenerating
// once on failure rather than ever surfacing a fabricated citation. No
// agent/tool-calling layer, by design (Section 3.1) — this is the whole
// pipeline, not a step in a larger loop. Each corpus supplies its own
// retrieval + "has anything been indexed at all" check via `ops`.
//
// Conversation history is accepted as input, not persisted (per the
// product decision: "advisory and transient" — no Conversation/Message
// model). The caller owns keeping it around across a session; this
// function only ever sees what's passed in for the current request.
interface AnswerQuestionOps {
  retrieve(): Promise<RetrievedChunk[]>;
  countIndexed(): Promise<number>;
}

interface AnswerQuestionParams {
  ops: AnswerQuestionOps;
  notIndexedMessage: string;
  promptId: string;
  schemaId: string;
  organizationId: string;
  question: string;
  history: InvestigatorTurn[];
}

async function answerQuestion(
  params: AnswerQuestionParams,
): Promise<InvestigatorAnswer> {
  const {
    ops,
    notIndexedMessage,
    promptId,
    schemaId,
    organizationId,
    question,
    history,
  } = params;

  const retrieved = await ops.retrieve();

  if (retrieved.length === 0) {
    const indexedCount = await ops.countIndexed();
    if (indexedCount === 0) {
      throw new NoIndexedContentError(notIndexedMessage);
    }
  }

  const prompt = resolvePrompt(promptId);
  const { schema, version: schemaVersion } = resolveSchema(schemaId);
  const historyLimit = getInvestigatorHistoryTurnLimit();
  const limitedHistory = history.slice(-historyLimit);
  const sourceBlocks = formatSourceBlocks(retrieved);
  const maxTokens = getInvestigatorMaxTokens();

  let lastCallLogId: string | undefined;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
    const messages = buildMessages(
      prompt.content,
      limitedHistory,
      sourceBlocks,
      question,
    );

    let result: StructuredCompletionResult<unknown>;
    try {
      result = await getValidatedCompletion(
        {
          messages,
          promptId: prompt.promptId,
          promptVersion: prompt.version,
          schemaId,
          schemaVersion,
          organizationId,
          maxTokens,
        },
        schema,
      );
    } catch (error) {
      // A malformed (non-JSON, or JSON that fails schema validation)
      // response is retried exactly like a citation mismatch below, up to
      // MAX_GENERATION_ATTEMPTS.
      if (error instanceof AiValidationError) {
        lastCallLogId = error.callLogId;
        if (attempt === MAX_GENERATION_ATTEMPTS) {
          throw error;
        }
        continue;
      }
      throw error;
    }
    lastCallLogId = result.callLogId;

    const data = result.data as InvestigatorResponseShape;
    const verification = verifyCitations(data.sources, retrieved);

    if (verification.valid) {
      return {
        answer: data.answer,
        sources: enrichSources(data.sources, retrieved),
        confidence: data.confidence,
        chunksRetrieved: retrieved.length,
      };
    }

    if (attempt === MAX_GENERATION_ATTEMPTS) {
      throw new AiValidationError(
        `Citation verification failed after ${MAX_GENERATION_ATTEMPTS} attempt(s): ${verification.reason}`,
        result.callLogId,
      );
    }
  }

  // Unreachable: the loop above always returns or throws.
  throw new AiValidationError(
    "Failed to produce an answer",
    lastCallLogId ?? "",
  );
}

export interface AskInvestigatorInput {
  contractId: string;
  organizationId: string;
  question: string;
  history?: InvestigatorTurn[];
}

export async function answerContractQuestion(
  input: AskInvestigatorInput,
): Promise<InvestigatorAnswer> {
  return answerQuestion({
    ops: {
      retrieve: () =>
        searchContractChunks({
          contractId: input.contractId,
          organizationId: input.organizationId,
          query: input.question,
        }),
      countIndexed: () =>
        prisma.contractChunk.count({ where: { contractId: input.contractId } }),
    },
    notIndexedMessage:
      "This contract has not been indexed for Clause Investigator yet",
    promptId: "investigator",
    schemaId: "investigator",
    organizationId: input.organizationId,
    question: input.question,
    history: input.history ?? [],
  });
}

export interface AskOrganizationBrainInput {
  organizationId: string;
  question: string;
  history?: InvestigatorTurn[];
}

export async function answerOrganizationBrainQuestion(
  input: AskOrganizationBrainInput,
): Promise<InvestigatorAnswer> {
  return answerQuestion({
    ops: {
      retrieve: () =>
        searchOrganizationBrainChunks({
          organizationId: input.organizationId,
          query: input.question,
        }),
      countIndexed: () =>
        prisma.organizationBrainChunk.count({
          where: { organizationId: input.organizationId },
        }),
    },
    notIndexedMessage: "Your organization has no indexed content yet",
    promptId: "organization-brain-ask",
    schemaId: "investigator",
    organizationId: input.organizationId,
    question: input.question,
    history: input.history ?? [],
  });
}
