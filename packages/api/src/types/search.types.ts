// Same shape the frontend's static index uses for its own entries
// (packages/web/src/search/searchIndex.ts) so the client can merge live and
// static results into one list without a type split. `subtext` is only set
// when the match wasn't on the entry's own `name` (e.g. a contract matched
// on tag/counterparty/file name rather than title) — the frontend renders
// it as the grey "Contains: ..." line.
export interface LiveSearchEntry {
  id: string;
  name: string;
  route: string;
  category: "contracts" | "users" | "organization";
  subtext?: string;
}
