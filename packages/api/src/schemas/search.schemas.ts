import { z } from "zod";

// Mirrors the frontend's debounce/min-length gate (Header.tsx, 250ms / 2
// chars) so a client that skips the debounce can't force a full table scan
// with a 1-character query.
export const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(200),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
