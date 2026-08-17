import mammoth from "mammoth";
import * as cheerio from "cheerio";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { TextItem } from "pdfjs-dist/types/src/display/api";

export interface ExtractionResult {
  text: string;
}

export class TerminalExtractionError extends Error {}

// pdfjs-dist's Node runtime still needs to locate its own bundled cmaps/
// standard_fonts directories (used for CJK text and non-embedded font
// handling) — resolved once and cached, since the installed package
// location never changes within a running process.
let cachedPdfjsAssetUrls: { cMapUrl: string; standardFontDataUrl: string } | null =
  null;

function getPdfjsAssetUrls(): {
  cMapUrl: string;
  standardFontDataUrl: string;
} {
  if (!cachedPdfjsAssetUrls) {
    const pdfjsDistDir = path.dirname(
      require.resolve("pdfjs-dist/package.json"),
    );
    cachedPdfjsAssetUrls = {
      cMapUrl: pathToFileURL(path.join(pdfjsDistDir, "cmaps") + path.sep)
        .href,
      standardFontDataUrl: pathToFileURL(
        path.join(pdfjsDistDir, "standard_fonts") + path.sep,
      ).href,
    };
  }
  return cachedPdfjsAssetUrls;
}

function isTextItem(
  item: TextItem | { type: string },
): item is TextItem {
  return "str" in item;
}

async function extractFromPdf(buffer: Buffer): Promise<ExtractionResult> {
  // pdfjs-dist ships ESM-only (package.json "main" is build/pdf.mjs) while
  // this package compiles to CommonJS — a static import would become a
  // require() call that can't load a pure-ESM module, so this stays a
  // dynamic import. Replaces pdf-parse, whose own bundled (and long
  // unmaintained) copy of PDF.js was throwing module-load errors
  // unrelated to any specific file's content.
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { cMapUrl, standardFontDataUrl } = getPdfjsAssetUrls();

  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    cMapUrl,
    cMapPacked: true,
    standardFontDataUrl,
    useSystemFonts: true,
  });

  try {
    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();

      const pageText = content.items
        .map((item) =>
          isTextItem(item) ? item.str + (item.hasEOL ? "\n" : "") : "",
        )
        .join("");

      pageTexts.push(pageText);
    }

    return { text: pageTexts.join("\n\n") };
  } finally {
    await loadingTask.destroy();
  }
}

// mammoth.convertToHtml (unlike extractRawText) preserves paragraph, table,
// and list structure as real HTML tags — this walks that structure and
// renders it back to plain text with separators that actually reflect it
// (blank lines between paragraphs/tables/lists, " | " between table cells,
// "- " list-item prefixes), instead of extractRawText's flattening, which
// left table content (e.g. a metadata cover-sheet table) reading as a dense,
// repetitive wall of label/value text with no visual grouping.
function convertMammothHtmlToText(html: string): string {
  const $ = cheerio.load(html);
  const blocks: string[] = [];

  $("body")
    .children()
    .each((_, el) => {
      const $el = $(el);
      const tag = el.tagName?.toLowerCase();

      if (tag === "table") {
        const rows = $el
          .find("tr")
          .map((_, row) => {
            const cells = $(row)
              .find("td, th")
              .map((_, cell) => $(cell).text().replace(/\s+/g, " ").trim())
              .get()
              .filter(Boolean);
            return cells.join(" | ");
          })
          .get()
          .filter(Boolean);

        if (rows.length > 0) {
          blocks.push(rows.join("\n"));
        }
        return;
      }

      if (tag === "ul" || tag === "ol") {
        const items = $el
          .find("li")
          .map((_, li) => $(li).text().replace(/\s+/g, " ").trim())
          .get()
          .filter(Boolean)
          .map((line) => `- ${line}`);

        if (items.length > 0) {
          blocks.push(items.join("\n"));
        }
        return;
      }

      const text = $el.text().replace(/\s+/g, " ").trim();
      if (text) {
        blocks.push(text);
      }
    });

  return blocks.join("\n\n");
}

async function extractFromDocx(buffer: Buffer): Promise<ExtractionResult> {
  const { value: html } = await mammoth.convertToHtml({ buffer });
  return { text: convertMammothHtmlToText(html) };
}

async function extractFromTxt(buffer: Buffer): Promise<ExtractionResult> {
  return { text: buffer.toString("utf-8") };
}

const EXTRACTORS: Record<
  string,
  (buffer: Buffer) => Promise<ExtractionResult>
> = {
  ".pdf": extractFromPdf,
  ".docx": extractFromDocx,
  ".txt": extractFromTxt,
};

export async function extractText(
  buffer: Buffer,
  extension: string,
): Promise<ExtractionResult> {
  const extractor = EXTRACTORS[extension.toLowerCase()];

  if (!extractor) {
    throw new TerminalExtractionError(
      `Unsupported file extension: ${extension}`,
    );
  }

  let result: ExtractionResult;

  try {
    result = await extractor(buffer);
  } catch (error) {
    console.error("[text-extraction] Parse failure:", error);
    throw new TerminalExtractionError(
      `Failed to parse file: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  if (!result.text.trim()) {
    throw new TerminalExtractionError(
      "No extractable text found - file may be a scanned/image-only document",
    );
  }

  return result;
}
