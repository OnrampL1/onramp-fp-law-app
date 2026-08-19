import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface PromptFile {
  promptId: string;
  version: string;
  content: string;
}

export function loadPrompt(promptId: string, version: string): PromptFile {
  const filePath = join(__dirname, promptId, `${version}.md`);
  const content = readFileSync(filePath, "utf-8").trim();
  return { promptId, version, content };
}
