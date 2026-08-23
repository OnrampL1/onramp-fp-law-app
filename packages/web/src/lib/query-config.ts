// Shared polling interval for list/table views whose data commonly changes
// from something other than the current user's own actions in this session
// (background AI jobs, other team members, external witnesses, other admins).
// Deliberately excludes the Notifications feed (useInfiniteQuery) — refetching
// an infinite query re-fetches every already-loaded page, which gets
// expensive once a user has scrolled back through history — and excludes
// contract-detail sub-tables (timeline/notes/analysis history), which stay
// on-demand rather than polled to keep concurrent polling per open tab low.
export const LIST_REFETCH_INTERVAL_MS = 30_000;
