import type { LucideIcon } from "lucide-react";
import { Building2, FileText, Users } from "lucide-react";

import {
  SEARCH_CATEGORY_ORDER,
  staticSearchIndex,
  type SearchCategory,
} from "./searchIndex";
import type { LiveSearchCategory, LiveSearchEntry } from "@/types/search";

// Exact name match > name starts-with > keyword/attached-field match >
// substring anywhere else in the name — approved ranking order. Lower
// number sorts first.
export type MatchTier = 0 | 1 | 2 | 3;

export interface RankedSearchResult {
  id: string;
  name: string;
  route: string;
  category: SearchCategory;
  icon: LucideIcon;
  status?: "comingSoon";
  // Grey subtext line. Precedence: sub-feature rows always show "In:
  // <parent>"; comingSoon entries show no subtext (the caller renders a
  // badge instead); otherwise "Contains: <keyword>" for a static keyword
  // match, or the live entry's own subtext for a live secondary-field
  // match (e.g. "Counterparty: Acme Corp").
  subtext?: string;
  matchTier: MatchTier;
}

const LIVE_CATEGORY_ICON: Record<LiveSearchCategory, LucideIcon> = {
  contracts: FileText,
  users: Users,
  organization: Building2,
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

// Tier for a match already confirmed to exist somewhere in `name`.
function nameTier(name: string, query: string): 0 | 1 | 3 {
  const n = normalize(name);
  const q = normalize(query);
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  return 3;
}

function rankStatic(query: string): RankedSearchResult[] {
  const q = normalize(query);
  const results: RankedSearchResult[] = [];

  for (const entry of staticSearchIndex) {
    const nameMatches = normalize(entry.name).includes(q);
    const matchedKeyword = entry.keywords.find((keyword) =>
      normalize(keyword).includes(q),
    );

    if (!nameMatches && !matchedKeyword) continue;

    const matchTier: MatchTier = nameMatches
      ? nameTier(entry.name, query)
      : 2;

    const subtext = entry.status === "comingSoon"
      ? undefined
      : entry.parentLabel
        ? `In: ${entry.parentLabel}`
        : nameMatches
          ? undefined
          : `Contains: ${matchedKeyword}`;

    results.push({
      id: entry.id,
      name: entry.name,
      route: entry.route,
      category: entry.category,
      icon: entry.icon,
      status: entry.status,
      subtext,
      matchTier,
    });
  }

  return results;
}

function rankLive(
  query: string,
  liveEntries: LiveSearchEntry[],
): RankedSearchResult[] {
  return liveEntries.map((entry) => {
    // The backend only omits subtext when the match was on the entry's own
    // name — mirror that here to decide the tier the same way static
    // entries do. A live subtext is functionally the same kind of "matched
    // on something attached to it, not its own name" signal a keyword is
    // for a static entry, so it gets the same tier.
    const matchTier: MatchTier = entry.subtext
      ? 2
      : nameTier(entry.name, query);

    return {
      id: entry.id,
      name: entry.name,
      route: entry.route,
      category: entry.category,
      icon: LIVE_CATEGORY_ICON[entry.category],
      subtext: entry.subtext,
      matchTier,
    };
  });
}

export interface RankedSearchGroup {
  category: SearchCategory;
  results: RankedSearchResult[];
}

// Merges static + live matches, sorts within each category by match tier
// then name, and groups in the approved fixed category order (Pages ->
// Settings -> Users -> Contracts -> Organization). Categories with no
// matches are omitted entirely.
export function rankAndGroup(
  query: string,
  liveEntries: LiveSearchEntry[],
): RankedSearchGroup[] {
  const all = [...rankStatic(query), ...rankLive(query, liveEntries)];

  const byCategory = new Map<SearchCategory, RankedSearchResult[]>();
  for (const result of all) {
    const bucket = byCategory.get(result.category) ?? [];
    bucket.push(result);
    byCategory.set(result.category, bucket);
  }

  const groups: RankedSearchGroup[] = [];
  for (const category of SEARCH_CATEGORY_ORDER) {
    const results = byCategory.get(category);
    if (!results || results.length === 0) continue;

    results.sort((a, b) => {
      if (a.matchTier !== b.matchTier) return a.matchTier - b.matchTier;
      return a.name.localeCompare(b.name);
    });

    groups.push({ category, results });
  }

  return groups;
}
