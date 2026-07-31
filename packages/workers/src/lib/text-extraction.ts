import mammoth from "mammoth";
import pdfParse from "pdf-parse";

export interface ExtractionResult {
  text: string;
}

export class TerminalExtractionError extends Error {}

async function extractFromPdf(buffer: Buffer): Promise<ExtractionResult> {
  const { text } = await pdfParse(buffer);
  return { text };
}

async function extractFromDocx(buffer: Buffer): Promise<ExtractionResult> {
  const { value } = await mammoth.extractRawText({ buffer });
  return { text: value };
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
