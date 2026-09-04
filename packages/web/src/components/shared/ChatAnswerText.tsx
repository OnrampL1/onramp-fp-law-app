// A shared, lightweight Markdown-lite renderer for AI chat answers (Legal
// Assistant, Contract Investigator). The synthesis/investigator prompts are
// instructed to format multi-item answers as real Markdown-shaped lists
// (blank-line paragraphs, "- "/"1. " lines, **bold**) - this is what
// actually turns that into readable HTML instead of one run-on paragraph.
// Deliberately supports only paragraphs, bullet lists, numbered lists, and
// inline bold - nothing that would require a full Markdown library for a
// few sentences of AI prose.

interface Block {
  type: "p" | "ul" | "ol";
  items: string[];
}

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let paragraphLines: string[] = [];

  function flushParagraph() {
    if (paragraphLines.length > 0) {
      blocks.push({ type: "p", items: [paragraphLines.join(" ")] });
      paragraphLines = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === "") {
      flushParagraph();
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      const last = blocks[blocks.length - 1];
      if (last?.type === "ul") {
        last.items.push(bulletMatch[1]);
      } else {
        blocks.push({ type: "ul", items: [bulletMatch[1]] });
      }
      continue;
    }

    const numberedMatch = line.match(/^\d+[.)]\s+(.*)$/);
    if (numberedMatch) {
      flushParagraph();
      const last = blocks[blocks.length - 1];
      if (last?.type === "ol") {
        last.items.push(numberedMatch[1]);
      } else {
        blocks.push({ type: "ol", items: [numberedMatch[1]] });
      }
      continue;
    }

    paragraphLines.push(line);
  }
  flushParagraph();

  return blocks;
}

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function ChatAnswerText({ text }: { text: string }) {
  const blocks = parseBlocks(text);

  return (
    <div className="space-y-2 text-pretty">
      {blocks.map((block, i) => {
        if (block.type === "ul") {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {block.items.map((item, j) => (
                <li key={j}>
                  <InlineText text={item} />
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={i} className="list-decimal space-y-1 pl-5">
              {block.items.map((item, j) => (
                <li key={j}>
                  <InlineText text={item} />
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i}>
            <InlineText text={block.items[0]} />
          </p>
        );
      })}
    </div>
  );
}
