import type { AiMessage } from "../types";
import type { CompletionProvider, CompletionProviderResult } from "./types";

// Deterministic, offline stand-in for a real generation call — selected via
// AI_PROVIDER_MODE=mock (see ../config). Understands one convention this
// codebase's own prompt-building uses ("[SOURCE id=...]...[/SOURCE]"
// blocks — see retrieval/investigator.ts) well enough to produce a
// citation-VALID answer by default, so the full generate-then-verify loop
// can be exercised offline, not just verifyCitations in isolation. A
// special marker in the question deliberately produces an invalid
// citation instead, to exercise the reject/regenerate path without a real
// API call.
const SOURCE_BLOCK_PATTERN = /\[SOURCE id=([0-9a-fA-F-]{36})[^\]]*\]([\s\S]*?)\[\/SOURCE\]/g;
export const FORCE_INVALID_CITATION_MARKER = "__MOCK_FORCE_INVALID_CITATION__";

interface ParsedSource {
  chunkId: string;
  content: string;
}

function extractSources(messages: AiMessage[]): ParsedSource[] {
  const combined = messages.map((m) => m.content).join("\n");
  const sources: ParsedSource[] = [];
  let match: RegExpExecArray | null;
  SOURCE_BLOCK_PATTERN.lastIndex = 0;
  while ((match = SOURCE_BLOCK_PATTERN.exec(combined)) !== null) {
    sources.push({ chunkId: match[1], content: match[2].trim() });
  }
  return sources;
}

export async function mockComplete(
  messages: AiMessage[],
): Promise<CompletionProviderResult> {
  const sources = extractSources(messages);
  const lastUserMessage =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const forceInvalid = lastUserMessage.includes(FORCE_INVALID_CITATION_MARKER);

  if (sources.length === 0) {
    const content = JSON.stringify({
      answer:
        "The provided sources do not contain enough information to answer this question.",
      sources: [],
      confidence: 10,
    });
    return { content, tokensIn: 0, tokensOut: 0 };
  }

  const chosen = sources[0];
  const excerpt = forceInvalid
    ? `FABRICATED EXCERPT NOT PRESENT IN SOURCE: ${chosen.content.slice(0, 40)}`
    : chosen.content.slice(0, Math.min(80, chosen.content.length));

  const content = JSON.stringify({
    answer: `Mock answer grounded in ${sources.length} retrieved source(s).`,
    sources: [{ chunkId: chosen.chunkId, excerpt }],
    confidence: forceInvalid ? 50 : 85,
  });

  return { content, tokensIn: 0, tokensOut: 0 };
}

export const mockCompletionProvider: CompletionProvider = {
  complete: mockComplete,
};
