// Generic sessionStorage-backed persistence for in-tab chat thread history.
// Legal Assistant and Clause Investigator each keep their own list of
// { id, messages } threads and use this so a thread survives navigating
// away from the page and back within the same tab, without any
// server-side storage. Deliberately NOT localStorage - closing the tab is
// expected to lose history, matching how neither page's conversations are
// persisted server-side either (see AI_ROADMAP.md Section 11's "Not
// built" list).
//
// Mirrors the read/write try-catch pattern already established in
// services/witness-portal.service.ts (cacheWitnessIdentity /
// readCachedWitnessIdentity): every operation is best-effort, so a full
// storage quota or a private-browsing storage failure degrades to
// in-memory-only for that session rather than crashing the page.

// sessionStorage is a shared per-origin, per-tab quota (~5-10MB in
// practice) - without a cap, a single very long session could fill it and
// start throwing on every write. These bound what gets persisted, not
// what a user can accumulate in a live session - the in-memory/UI copy is
// never trimmed, only the sessionStorage snapshot written on each change.
const MAX_PERSISTED_THREADS = 20;
const MAX_PERSISTED_MESSAGES_PER_THREAD = 50;

interface PersistableThread {
  id: string;
  messages: unknown[];
}

export function readPersistedThreads<T extends PersistableThread>(
  key: string,
): T[] | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    // Malformed JSON (shouldn't happen from our own writes, but a shared
    // per-origin key is one stale/incompatible shape away from a parse
    // error) or storage unavailable entirely (private browsing) - either
    // way, fall back to a fresh in-memory start rather than surface an
    // error the user can't act on.
    return null;
  }
}

export function writePersistedThreads<T extends PersistableThread>(
  key: string,
  threads: T[],
): void {
  try {
    const trimmed = threads.slice(0, MAX_PERSISTED_THREADS).map((thread) => ({
      ...thread,
      messages: thread.messages.slice(-MAX_PERSISTED_MESSAGES_PER_THREAD),
    }));
    sessionStorage.setItem(key, JSON.stringify(trimmed));
  } catch {
    // Quota exceeded, or storage unavailable (private browsing) -
    // best-effort only, same as witness-portal.service.ts. The page keeps
    // working from in-memory state; it just won't survive this
    // navigation.
  }
}
