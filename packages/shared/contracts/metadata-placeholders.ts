// Written by contractService.uploadContract when the caller doesn't provide
// a title or counterparty, and checked by applyExtractedMetadata
// (packages/workers) to decide whether it's safe to overwrite with an
// AI-extracted value. Shared between packages/api and packages/workers so
// the two can never drift — a hand-copied literal on either side, edited
// independently, would silently break the blank-field-protection AI
// extraction depends on.
export const PLACEHOLDER_CONTRACT_TITLE = "Untitled Contract";
export const PLACEHOLDER_CONTRACT_COUNTERPARTY = "Unknown Counterparty";
