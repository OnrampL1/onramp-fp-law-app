// Clause/section-aware chunking for Clause Investigator (AI_ARCHITECTURE.md
// Section 6) — chunk boundaries matter for legal text and citation quality,
// so this splits on detected legal headings first, then packs each
// section's paragraphs into token-budgeted chunks, falling back to
// character-window splitting with overlap only when a single paragraph
// alone exceeds the budget.

export interface TextChunk {
  chunkIndex: number;
  headingPath: string | null;
  content: string;
  tokenCount: number;
}

const MIN_CHUNK_TOKENS = 500;
const MAX_CHUNK_TOKENS = 800;
const OVERLAP_RATIO = 0.15;

// No tokenizer dependency exists in this repo yet. ~4 characters per token
// is a standard rough estimate for English text — good enough to size
// chunks; not meant to match any specific model's real tokenizer exactly.
const CHARS_PER_TOKEN = 4;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

// Matches common legal heading conventions: "ARTICLE IV", "Article I
// Definitions", "Section 9.4", "9.4.1 Title", "9.4 Limitation of
// Liability". Deliberately conservative — a missed heading just falls into
// the paragraph-based fallback below, never a hard failure.
//
// Split in two rather than one alternation: the ARTICLE/SECTION keyword is
// itself a strong enough signal to match case-insensitively with an
// optional trailing title, but a bare numbered heading (no keyword) needs
// the stricter "starts with a capitalized word" check to avoid matching an
// ordinary numbered list item in the body text.
const KEYWORD_HEADING_PATTERN =
  /^\s*(article|section)\s+[ivxlcdm\d]+(\.\d+)*\.?(\s+.{0,80})?\s*$/i;
const NUMBERED_HEADING_PATTERN = /^\s*\d+(\.\d+){0,3}\.?\s+[A-Z][A-Za-z].{0,80}$/;

function isHeadingLine(line: string): boolean {
  return KEYWORD_HEADING_PATTERN.test(line) || NUMBERED_HEADING_PATTERN.test(line);
}

interface Section {
  heading: string | null;
  content: string;
}

function splitIntoSections(text: string): Section[] {
  const lines = text.split(/\r?\n/);
  const sections: Section[] = [];
  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    if (isHeadingLine(line)) {
      sections.push({
        heading: currentHeading,
        content: currentLines.join("\n").trim(),
      });
      currentHeading = line.trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  sections.push({ heading: currentHeading, content: currentLines.join("\n").trim() });

  return sections.filter((s) => s.content.length > 0);
}

function splitWithOverlap(text: string): string[] {
  const maxChars = MAX_CHUNK_TOKENS * CHARS_PER_TOKEN;
  const overlapChars = Math.floor(maxChars * OVERLAP_RATIO);
  const parts: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    parts.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - overlapChars;
  }

  return parts;
}

function packSectionIntoChunks(
  heading: string | null,
  content: string,
  startIndex: number,
): TextChunk[] {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: TextChunk[] = [];
  let buffer: string[] = [];
  let bufferTokens = 0;
  let chunkIndex = startIndex;

  const flush = () => {
    if (buffer.length === 0) return;
    const chunkContent = buffer.join("\n\n");
    chunks.push({
      chunkIndex: chunkIndex++,
      headingPath: heading,
      content: chunkContent,
      tokenCount: estimateTokens(chunkContent),
    });
    buffer = [];
    bufferTokens = 0;
  };

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);

    if (paragraphTokens > MAX_CHUNK_TOKENS) {
      flush();
      for (const part of splitWithOverlap(paragraph)) {
        chunks.push({
          chunkIndex: chunkIndex++,
          headingPath: heading,
          content: part,
          tokenCount: estimateTokens(part),
        });
      }
      continue;
    }

    if (bufferTokens + paragraphTokens > MAX_CHUNK_TOKENS && bufferTokens >= MIN_CHUNK_TOKENS) {
      flush();
    }

    buffer.push(paragraph);
    bufferTokens += paragraphTokens;
  }
  flush();

  return chunks;
}

export function chunkContractText(text: string): TextChunk[] {
  const sections = splitIntoSections(text);
  const chunks: TextChunk[] = [];

  for (const section of sections) {
    chunks.push(...packSectionIntoChunks(section.heading, section.content, chunks.length));
  }

  return chunks;
}
