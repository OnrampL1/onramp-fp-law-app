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

// Same convention, one parameter: appends a controllable "المادة <N>"
// mention to the mock answer's prose, with a citation that otherwise stays
// valid — isolates testing Legal KB's article-existence check (an
// additional check layered on top of citation verification, not a
// replacement for it) from citation verification itself. The number is
// caller-supplied so the same marker exercises a nonexistent number, a
// number that only exists in a different (uncited) source, or a genuinely
// valid one, depending on what the test's mocked DB fixture says.
const FORCE_ARTICLE_MENTION_PATTERN = /__MOCK_FORCE_ARTICLE_MENTION__:(\S+)/;
export const FORCE_ARTICLE_MENTION_MARKER = "__MOCK_FORCE_ARTICLE_MENTION__";

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
  const articleMentionMatch = lastUserMessage.match(
    FORCE_ARTICLE_MENTION_PATTERN,
  );

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

  const answer = articleMentionMatch
    ? `Mock answer grounded in ${sources.length} retrieved source(s). المادة ${articleMentionMatch[1]} تنص على الحكم المطلوب.`
    : `Mock answer grounded in ${sources.length} retrieved source(s).`;

  const content = JSON.stringify({
    answer,
    sources: [{ chunkId: chosen.chunkId, excerpt }],
    confidence: forceInvalid ? 50 : 85,
  });

  return { content, tokensIn: 0, tokensOut: 0 };
}

export const mockCompletionProvider: CompletionProvider = {
  complete: mockComplete,
};
