import { apiClient } from "@/lib/api-client";
import type { LiveSearchEntry } from "@/types/search";

export async function fetchGlobalSearchResults(
  query: string,
): Promise<LiveSearchEntry[]> {
  const { data } = await apiClient.get<{ data: LiveSearchEntry[] }>(
    "/search",
    { params: { q: query } },
  );
  return data.data;
}
