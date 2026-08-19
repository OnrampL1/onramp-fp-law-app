import { TOOL_DEFINITIONS, type ToolDefinition, type ToolName } from "./definitions";

// Small accessor layer over TOOL_DEFINITIONS, mirroring the existing
// registry/index.ts pattern (getActivePromptVersion/resolvePrompt over a
// raw Record) rather than reaching into TOOL_DEFINITIONS directly from
// call sites.

export function isKnownToolName(name: string): name is ToolName {
  return Object.prototype.hasOwnProperty.call(TOOL_DEFINITIONS, name);
}

export function getToolDefinition(name: ToolName): ToolDefinition {
  const definition = TOOL_DEFINITIONS[name];
  if (!definition) {
    throw new Error(`Unknown Assistant tool: "${name}"`);
  }
  return definition;
}

export function listToolDefinitions(): ToolDefinition[] {
  return Object.values(TOOL_DEFINITIONS);
}
