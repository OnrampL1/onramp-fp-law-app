// Mirrors packages/api/src/types/search.types.ts — the live endpoint
// returns this exact shape so the frontend can merge it with the static
// index (packages/web/src/search/searchIndex.ts) without a type split.
export type LiveSearchCategory = "contracts" | "users" | "organization";

export interface LiveSearchEntry {
  id: string;
  name: string;
  route: string;
  category: LiveSearchCategory;
  subtext?: string;
}
