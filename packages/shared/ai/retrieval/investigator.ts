import { getPrismaClient } from "../../db";
import {
  searchContractChunks,
  searchOrganizationBrainChunks,
  searchLegalKbChunks,
  type RetrievedChunk,
} from "./search";
import {
  verifyCitations,
  verifyArticleExistence,
  type CitedSource,
} from "./citations";
import {
  getValidatedCompletion,
  AiValidationError,
  type StructuredCompletionResult,
} from "../schemas";
import { markValidationFailed } from "../providers";
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

export interface LegalOfficialGazetteReference {
  number: string | null;
  publishDate: string | null;
  page: string | null;
}

export interface LegalCitedSource extends CitedSource {
  sourceId: string;
  headingPath: string | null;
  instrumentTitle: string;
  articleNumber: string | null;
  officialGazetteReference: LegalOfficialGazetteReference | null;
  amendingInstrument: string | null;
  amendmentEffectiveDate: string | null;
  promulgatingAuthority: string;
  compilerSource: string;
  sourceUrl: string;
  lastVerifiedAt: string | null;
}

interface LegalSourceDetailRow {
  chunk_id: string;
  instrument_title: string;
  article_number: string | null;
  official_gazette_number: string | null;
  official_gazette_publish_date: Date | null;
  official_gazette_page: string | null;
  amending_instrument: string | null;
  amendment_effective_date: Date | null;
  promulgating_authority: string;
  compiler_source: string;
  source_url: string;
  last_verified_at: Date | null;
}

// Same "citation presentation, not verification" pattern as enrichSources()
// above (PHASE6_IMPLEMENTATION_PLAN.md Section 10), plus one addition: the
// richer legal fields (instrumentTitle, officialGazetteReference,
// promulgatingAuthority, compilerSource, ...) don't live on RetrievedChunk
// at all — legalKbCandidateFetcher()'s SELECT deliberately doesn't carry
// them, since every other candidate row in the corpus would pay that join
// cost too. So unlike enrichSources(), this needs one batched DB lookup —
// joining LegalChunk -> LegalSource — scoped to only the already-verified
// cited chunk ids, not every retrieved candidate.
async function enrichLegalSources(
  sources: CitedSource[],
  retrievedChunks: RetrievedChunk[],
): Promise<LegalCitedSource[]> {
  const chunkById = new Map(retrievedChunks.map((chunk) => [chunk.id, chunk]));
  const chunkIds = [...new Set(sources.map((source) => source.chunkId))];

  const details =
    chunkIds.length === 0
      ? []
      : await prisma.$queryRaw<LegalSourceDetailRow[]>`
          SELECT
            lc.id AS chunk_id,
            ls.title AS instrument_title,
            lc.article_number,
            ls.official_gazette_number,
            ls.official_gazette_publish_date,
            ls.official_gazette_page,
            lc.amending_instrument,
            lc.amendment_effective_date,
            ls.promulgating_authority,
            ls.compiler_source,
            ls.source_url,
            ls.last_verified_at
          FROM legal_chunks lc
          JOIN legal_sources ls ON ls.id = lc.legal_source_id
          WHERE lc.id = ANY(${chunkIds}::uuid[])
        `;
  const detailByChunkId = new Map(details.map((row) => [row.chunk_id, row]));

  return sources.map((source) => {
    const chunk = chunkById.get(source.chunkId);
    const detail = detailByChunkId.get(source.chunkId);
    return {
      ...source,
      sourceId: chunk?.sourceId ?? "",
      headingPath: chunk?.headingPath ?? null,
      instrumentTitle: detail?.instrument_title ?? "",
      articleNumber: detail?.article_number ?? null,
      officialGazetteReference: detail
        ? {
            number: detail.official_gazette_number,
            publishDate: detail.official_gazette_publish_date?.toISOString() ?? null,
            page: detail.official_gazette_page,
          }
        : null,
      amendingInstrument: detail?.amending_instrument ?? null,
      amendmentEffectiveDate: detail?.amendment_effective_date?.toISOString() ?? null,
      // promulgatingAuthority (the Lebanese Republic) and compilerSource
      // (e.g. the Lebanese University) are deliberately kept as two
      // distinct fields here, never merged into one "source" string — the
      // prompt's own authority-attribution instructions depend on the
      // caller being able to tell them apart.
      promulgatingAuthority: detail?.promulgating_authority ?? "",
      compilerSource: detail?.compiler_source ?? "",
      sourceUrl: detail?.source_url ?? "",
      lastVerifiedAt: detail?.last_verified_at?.toISOString() ?? null,
    };
  });
}

// Exported for direct unit testing — the article=N tag (Batch 6 diagnosis,
// 2026-08-14) is the fix for a real, confirmed root cause: a chunk's
// article number lives only in DB metadata, and when a chunk's own text
// doesn't happen to restate "Article N" inline, the model had no citable
// basis to attribute a claim to that article — the prompt's own strict
// attribution rule then correctly, conservatively made it decline rather
// than guess the number, even holding the exact right content (proven via
// a single-chunk-only isolation test that still declined without this
// tag, and succeeded 4/4 once it was added). Legal KB only:
// RetrievedChunk.articleNumber is undefined (not null) for Contract/
// Organization Brain chunks, so the tag is simply omitted for them, same
// as chunks with no article number in Legal KB itself (e.g. preambles).
export function formatSourceBlocks(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c) => {
      const articleTag = c.articleNumber ? ` article=${c.articleNumber}` : "";
      return `[SOURCE id=${c.id} heading=${JSON.stringify(c.headingPath ?? "")}${articleTag}]\n${c.content}\n[/SOURCE]`;
    })
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

interface AdditionalVerificationResult {
  valid: boolean;
  reason?: string;
}

// Raw, pre-enrichment result — deliberately returns sources as the model's
// bare {chunkId, excerpt} plus the retrieved chunks they resolve against,
// not yet shaped into a corpus-specific presentation. Enrichment (looking
// up sourceId/headingPath, or Legal KB's richer instrument/gazette/
// authority fields) is corpus-specific *presentation*, not part of the
// shared retrieve-generate-verify pipeline (PHASE6_IMPLEMENTATION_PLAN.md
// Section 10's "citation presentation, not verification" distinction) — so
// each public wrapper below does its own enrichment after calling this.
interface AnswerQuestionResult {
  answer: string;
  sources: CitedSource[];
  confidence?: number;
  chunksRetrieved: number;
  retrievedChunks: RetrievedChunk[];
}

interface AnswerQuestionParams {
  ops: AnswerQuestionOps;
  notIndexedMessage: string;
  // Shown instead of throwing when every generation attempt fails to
  // produce a verifiable answer (malformed completion, a citation that
  // doesn't match the retrieved text, or a failed additionalVerification
  // check). The unverified content itself is never returned either way -
  // this only changes *how* that failure reaches the caller: a normal
  // answer-shaped response instead of a thrown error, mirroring how the
  // model's own "the sources don't address this" replies already look.
  verificationFailedMessage: string;
  promptId: string;
  schemaId: string;
  organizationId: string;
  question: string;
  history: InvestigatorTurn[];
  // Optional extra trust check run after citation verification passes,
  // sharing the same retry budget as citation verification — a corpus can
  // layer its own domain-specific verification (e.g. Legal KB's
  // article-existence check) without this shared function knowing anything
  // about that domain. Absent for Contracts/Organization Brain today.
  additionalVerification?: (
    data: InvestigatorResponseShape,
    retrieved: RetrievedChunk[],
  ) => Promise<AdditionalVerificationResult>;
}

async function answerQuestion(
  params: AnswerQuestionParams,
): Promise<AnswerQuestionResult> {
  const {
    ops,
    notIndexedMessage,
    verificationFailedMessage,
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

  // Guaranteed fallback once every generation attempt fails to produce a
  // verifiable answer - never the unverified content itself, just a normal
  // answer-shaped decline instead of a thrown error. Reuses whatever this
  // call's retrieved chunks were, same as a model-declared "not addressed".
  const verificationFailedAnswer = (): AnswerQuestionResult => ({
    answer: verificationFailedMessage,
    sources: [],
    confidence: 0,
    chunksRetrieved: retrieved.length,
    retrievedChunks: retrieved,
  });

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
      // MAX_GENERATION_ATTEMPTS. getValidatedCompletion() already calls
      // markValidationFailed() itself before throwing, so there's nothing
      // further to record here - just fall back once attempts run out.
      if (error instanceof AiValidationError) {
        if (attempt === MAX_GENERATION_ATTEMPTS) {
          return verificationFailedAnswer();
        }
        continue;
      }
      throw error;
    }

    const data = result.data as InvestigatorResponseShape;
    const verification = verifyCitations(data.sources, retrieved);
    const isLastAttempt = attempt === MAX_GENERATION_ATTEMPTS;

    if (verification.valid) {
      const extra = params.additionalVerification
        ? await params.additionalVerification(data, retrieved)
        : { valid: true };

      if (extra.valid) {
        return {
          answer: data.answer,
          sources: data.sources,
          confidence: data.confidence,
          chunksRetrieved: retrieved.length,
          retrievedChunks: retrieved,
        };
      }

      if (isLastAttempt) {
        await markValidationFailed(
          result.callLogId,
          `Additional verification failed after ${MAX_GENERATION_ATTEMPTS} attempt(s): ${extra.reason}`,
        );
        return verificationFailedAnswer();
      }
      continue;
    }

    if (isLastAttempt) {
      await markValidationFailed(
        result.callLogId,
        `Citation verification failed after ${MAX_GENERATION_ATTEMPTS} attempt(s): ${verification.reason}`,
      );
      return verificationFailedAnswer();
    }
  }

  // Unreachable: the loop above always returns.
  return verificationFailedAnswer();
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
  const result = await answerQuestion({
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
    verificationFailedMessage:
      "I couldn't produce a reliably verified answer to this question from the contract's indexed text. Try rephrasing the question, or review the contract directly.",
    promptId: "investigator",
    schemaId: "investigator",
    organizationId: input.organizationId,
    question: input.question,
    history: input.history ?? [],
  });

  return {
    answer: result.answer,
    sources: enrichSources(result.sources, result.retrievedChunks),
    confidence: result.confidence,
    chunksRetrieved: result.chunksRetrieved,
  };
}

export interface AskOrganizationBrainInput {
  organizationId: string;
  question: string;
  history?: InvestigatorTurn[];
}

export async function answerOrganizationBrainQuestion(
  input: AskOrganizationBrainInput,
): Promise<InvestigatorAnswer> {
  const result = await answerQuestion({
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
    verificationFailedMessage:
      "I couldn't produce a reliably verified answer to this question from your organization's indexed content.",
    promptId: "organization-brain-ask",
    schemaId: "investigator",
    organizationId: input.organizationId,
    question: input.question,
    history: input.history ?? [],
  });

  return {
    answer: result.answer,
    sources: enrichSources(result.sources, result.retrievedChunks),
    confidence: result.confidence,
    chunksRetrieved: result.chunksRetrieved,
  };
}

export interface AskLegalKbInput {
  // The Legal Knowledge Base corpus itself is global/non-organization-scoped
  // (Batch 4 — no organizationId in searchLegalKbChunks or its WHERE
  // clauses). organizationId here is only the asking organization, recorded
  // on the generation call's AiCallLog for cost/observability attribution —
  // "global content, organization-attributed usage" (Domain Review
  // decision 2). It never scopes retrieval.
  organizationId: string;
  question: string;
  history?: InvestigatorTurn[];
}

export interface LegalKbAnswer {
  answer: string;
  sources: LegalCitedSource[];
  confidence?: number;
  chunksRetrieved: number;
}

export async function answerLegalKbQuestion(
  input: AskLegalKbInput,
): Promise<LegalKbAnswer> {
  const result = await answerQuestion({
    ops: {
      retrieve: () => searchLegalKbChunks({ query: input.question }),
      // Deliberately an unscoped, unfiltered count — "has anything ever
      // been ingested at all," not "is anything visible under the current
      // LEGAL_KB_LICENSE_MODE." Those are different questions: a
      // production deployment with zero CLEARED_FOR_PRODUCTION sources
      // (Batch 4's real current state) legitimately retrieves nothing, but
      // that's not the same as "not indexed yet" — the prompt's own
      // "sources don't address this question" instruction is what should
      // handle a zero-candidate retrieval in that case, not
      // NoIndexedContentError's message.
      countIndexed: () => prisma.legalChunk.count(),
    },
    notIndexedMessage: "The Legal Knowledge Base has no indexed content yet",
    verificationFailedMessage:
      "I couldn't produce a reliably verified answer to this question from the indexed legal texts.",
    promptId: "legal-kb-ask",
    schemaId: "legal-kb",
    organizationId: input.organizationId,
    question: input.question,
    history: input.history ?? [],
    additionalVerification: (data, retrieved) =>
      verifyArticleExistence(data.answer, data.sources, retrieved),
  });

  return {
    answer: result.answer,
    sources: await enrichLegalSources(result.sources, result.retrievedChunks),
    confidence: result.confidence,
    chunksRetrieved: result.chunksRetrieved,
  };
}
