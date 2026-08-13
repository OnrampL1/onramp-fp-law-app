// Orchestrates a full per-article crawl of a Law.aspx-shaped legal source,
// for Phase 6 (Lebanese Legal Knowledge Base) ingestion
// (docs/PHASE6_IMPLEMENTATION_PLAN.md Section 8).
//
// Built after the Batch 2 live cross-check (2026-08-14) showed the tree
// index has no direct per-article links (see legal-source-scraper.ts's
// parseTreeIndexPage() doc comment) but that LawArticleID values map onto
// article numbers with a fixed linear offset (LawArticleID = base +
// articleNumber) that held exactly across 9 independently-tested points
// spanning the full document (articles 2, 3, 4, 5, 6, 500, 844, 845, 1107).
// This module walks that sequence rather than the tree.
//
// Two things that offset-walk cannot assume safely, both confirmed by
// direct testing against the real site:
//   1. A non-200 response does not necessarily mean "past the end" — some
//      out-of-range IDs return 200 with a *different, wrong* article's
//      content instead of erroring. So every fetched page's own article
//      number is checked against what was requested; any mismatch is
//      recorded as an issue rather than being trusted.
//   2. A 500 response is not always "this article doesn't exist" in a
//      generalizable way — it was observed for exactly one specific,
//      known case (article 1 of the Code of Obligations and Contracts).
//      Skip-on-500 is therefore NOT a blanket rule: only article numbers
//      explicitly passed in `knownGaps` are skipped-and-logged. A 500 (or
//      any non-200) anywhere else is a genuine, unexpected failure and
//      must be recorded as an issue, not be silently absorbed the same way.
//
// crawlLegalSource() runs to completion across the whole requested range —
// it does NOT abort on the first mismatch/failure. Every problem is
// collected into the returned CrawlReport's `issues` array instead, so one
// run surfaces every problem in the document rather than requiring one
// fix-and-rerun cycle per article. This is purely about surfacing
// everything in one pass; it does not loosen anything about persistence.
// `report.clean` is false whenever `issues` is non-empty, and
// `assertCleanCrawl()` is the explicit gate Batch 3's ingestion step must
// call before persisting anything — it throws on a non-clean report and
// only returns articles when the crawl came back with zero unresolved
// issues. `replaceLegalSourceChunks()` (Batch 3, not built yet) must never
// be called on a report that hasn't passed through that gate.
//
// This module is fetch-agnostic (the caller injects `fetchArticlePage`) so
// it can be fully unit-tested against fixture strings with no network
// access. Wiring a real HTTP fetcher and actually running this against the
// live site for the full ~1,107-article document is a separate, explicitly
// gated step — not done by importing this module.
//
// Retry, added after a live run of the proof source (2026-08-15) came back
// with 4 `fetch_error` issues that all turned out, on manual re-fetch, to
// be transient network blips rather than real problems. Retry is scoped
// narrowly to `fetch_error` (the injected fetcher throwing — a network-
// layer failure) only. It deliberately does NOT retry `unexpected_status`
// or `content_mismatch`: those are real data signals (an unexpected 500,
// or a page that answered with the wrong article), not noise, and
// retrying them would blur the exact distinction this module exists to
// preserve — see the two points above.
//
// knownIdOverrides, added 2026-08-15 after Code of Commerce's Article 668
// was found to live at an ID the base linear offset does not predict (a
// "احكام عامة وموقتة" / General and Transitional Provisions closing clause,
// structurally isolated the same way some sources' opening enactment clause
// is — see ScrapedArticle.isEnactmentClause in legal-source-scraper.ts).
// This is a *known, specific* per-article ID substitution, not a fallback
// search: the override ID must already be independently confirmed to
// resolve to that exact article number, and the crawler still re-verifies
// that on fetch (via the same content-mismatch check as everything else) —
// an override is a better guess, not a bypass of the safety check.
//
// isEnactmentClause tagging: when a fetched article's number span carries
// the "- اصدار" suffix, its headingPath is overridden to a fixed,
// distinguishable label rather than whatever the tree's own heading path
// says — so it can never be mistaken for (or silently collide with) a
// source's real, substantive Article 1 downstream.

import {
  parseArticlePage,
  findArticleHeadingPath,
  type ScrapedTreeIndex,
} from "./legal-source-scraper";

// Fixed, distinguishable heading-path tag for an enactment/ratification
// clause — deliberately not derived from the tree (which may not even
// contain this article, per Law 81/2018 and Law 75/1999's findings) and
// deliberately not "Article 1" or any plain article-number-shaped label, so
// it can never collide with a real numbered article's heading downstream.
export const ENACTMENT_CLAUSE_HEADING = "أحكام الإصدار (Enactment Provisions)";

// A single known (articleNumber, LawArticleID) pair used to derive the
// linear offset for the rest of the document. There is currently no way to
// discover this from the tree page itself (see legal-source-scraper.ts) —
// it must come from a separately-obtained deep link, the way Article 844's
// (844, 972278) was already known from docs/PHASE6_LEGAL_CORPUS_VALIDATION.md
// before this crawler existed. Acquiring one such anchor per source is an
// open question for the remaining four sources, not solved by this module.
export interface ArticleIdAnchor {
  articleNumber: number;
  articleId: number;
}

// An explicit, human-confirmed (startArticle, offset) breakpoint: for
// articleNumber >= startArticle (and below the next segment's
// startArticle, if any), articleId = offset + articleNumber. Added
// 2026-08-15 after Law 75/1999 was found to have a linear-offset formula
// that isn't constant across the whole document — it drifts by exactly +2
// starting at article 83 (confirmed via the live crawl's own
// content-mismatch issues, e.g. requesting 83 under the old single offset
// returned article 81's content). This is a static, explicit list of
// already-confirmed breakpoints, not a runtime self-correcting mechanism —
// the drift's exact shape is known, so there's no need for anything more
// general than that. For every source without a known drift, this is
// equivalent to a single segment (`offsetSegments` can be omitted
// entirely, in which case `anchor` alone still determines a single
// constant offset — unchanged behavior for Commerce, Law 81/2018, and the
// proof source).
export interface OffsetSegment {
  startArticle: number;
  offset: number;
}

// An article number known, from prior testing, not to resolve via this
// crawl strategy — logged and skipped rather than fetched. Deliberately not
// a blanket status-code rule (see module doc comment): only article numbers
// explicitly listed here are treated as expected failures.
export interface KnownArticleGap {
  articleNumber: number;
  reason: string;
}

export interface CrawledArticle {
  articleNumber: number;
  articleId: number;
  headingPath: string | null;
  text: string;
  amendingInstrument: string | null;
  amendmentEffectiveDate: string | null;
  isEnactmentClause: boolean;
}

// A specific, independently-confirmed (articleNumber, LawArticleID) pair to
// use instead of the base linear-offset formula for that one article — see
// this module's doc comment. Unlike ArticleIdAnchor (which establishes the
// offset for the whole document), an override applies to exactly one
// article number.
export interface KnownIdOverride {
  articleNumber: number;
  articleId: number;
}

export interface CrawlSkip {
  articleNumber: number;
  reason: string;
}

// A single unresolved problem hit during the crawl. `kind` distinguishes
// the two failure modes this module knows to check for; `fetch_error`
// covers anything the injected fetcher itself throws (network failure,
// timeout, etc.) rather than returning a status/body pair.
export type CrawlIssueKind = "unexpected_status" | "content_mismatch" | "fetch_error";

export interface CrawlIssue {
  articleNumber: number;
  kind: CrawlIssueKind;
  message: string;
}

export interface CrawlReport {
  articles: CrawledArticle[];
  skipped: CrawlSkip[];
  issues: CrawlIssue[];
  // True iff issues.length === 0. Computed, not just documentation — this
  // is the field assertCleanCrawl() checks, and the field any future
  // Batch 3 persistence call must check before calling
  // replaceLegalSourceChunks().
  clean: boolean;
}

export interface FetchedPage {
  status: number;
  body: string;
}

export type FetchArticlePage = (articleId: number) => Promise<FetchedPage>;

export class LegalSourceCrawlError extends Error {
  constructor(
    message: string,
    public readonly articleNumber: number,
  ) {
    super(message);
    this.name = "LegalSourceCrawlError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Resolves an article number to its base-formula ID using the last segment
// (sorted ascending by startArticle) whose startArticle is <= the requested
// article number. `segments` must be non-empty and sorted.
function resolveSegmentedArticleId(articleNumber: number, segments: OffsetSegment[]): number {
  let applicable = segments[0];
  for (const segment of segments) {
    if (segment.startArticle <= articleNumber) {
      applicable = segment;
    } else {
      break;
    }
  }
  return applicable.offset + articleNumber;
}

// Retries only network-layer failures (fetchArticlePage throwing). Never
// called for a successful fetch that returned a non-200 status or
// mismatched content — those are handled, un-retried, by the caller.
async function fetchWithRetry(
  fetchArticlePage: FetchArticlePage,
  articleId: number,
  retries: number,
  retryDelayMs: number,
): Promise<{ fetched?: FetchedPage; error?: unknown; attempts: number }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const fetched = await fetchArticlePage(articleId);
      return { fetched, attempts: attempt };
    } catch (err) {
      lastError = err;
      if (attempt <= retries) {
        await sleep(retryDelayMs * attempt);
      }
    }
  }
  return { error: lastError, attempts: retries + 1 };
}

/**
 * Walks article numbers 1..tree.maxArticleNumber, deriving each one's
 * LawArticleID from `anchor`'s fixed offset, fetching it via the injected
 * `fetchArticlePage`, and parsing it via parseArticlePage(). Runs to
 * completion across the full range regardless of individual failures —
 * every unexpected status, content mismatch, or exhausted-retries fetch
 * exception is recorded in the returned report's `issues` array rather
 * than aborting the run. Only `knownGaps` entries are skipped without
 * being fetched at all; everything else that fails is a reported issue,
 * never a silent skip. See assertCleanCrawl() for the persistence-gating
 * boundary.
 *
 * `fetchErrorRetries` (default 2) and `retryDelayMs` (default 500, linear
 * backoff) apply only to network-layer failures — see fetchWithRetry().
 * `knownIdOverrides` substitutes a specific, already-confirmed ID for one
 * article number instead of the base formula (e.g. Commerce's Article 668);
 * the fetched result is still verified against the requested article number
 * like any other fetch, override or not.
 * `offsetSegments`, if given, replaces the single `anchor`-derived offset
 * with a small list of (startArticle, offset) breakpoints for sources whose
 * linear formula drifts partway through the document (see OffsetSegment's
 * doc comment) — omit it for the common single-offset case, where `anchor`
 * alone still determines everything, unchanged.
 */
export async function crawlLegalSource(params: {
  fetchArticlePage: FetchArticlePage;
  tree: ScrapedTreeIndex;
  anchor: ArticleIdAnchor;
  offsetSegments?: OffsetSegment[];
  knownGaps?: KnownArticleGap[];
  knownIdOverrides?: KnownIdOverride[];
  fetchErrorRetries?: number;
  retryDelayMs?: number;
}): Promise<CrawlReport> {
  const {
    fetchArticlePage,
    tree,
    anchor,
    offsetSegments,
    knownGaps = [],
    knownIdOverrides = [],
    fetchErrorRetries = 2,
    retryDelayMs = 500,
  } = params;
  const segments: OffsetSegment[] =
    offsetSegments && offsetSegments.length > 0
      ? [...offsetSegments].sort((a, b) => a.startArticle - b.startArticle)
      : [{ startArticle: 1, offset: anchor.articleId - anchor.articleNumber }];
  const gapReasonByArticle = new Map(knownGaps.map((gap) => [gap.articleNumber, gap.reason]));
  const idOverrideByArticle = new Map(knownIdOverrides.map((o) => [o.articleNumber, o.articleId]));

  const articles: CrawledArticle[] = [];
  const skipped: CrawlSkip[] = [];
  const issues: CrawlIssue[] = [];

  for (let articleNumber = 1; articleNumber <= tree.maxArticleNumber; articleNumber++) {
    const gapReason = gapReasonByArticle.get(articleNumber);
    if (gapReason) {
      skipped.push({ articleNumber, reason: gapReason });
      continue;
    }

    const articleId = idOverrideByArticle.get(articleNumber) ?? resolveSegmentedArticleId(articleNumber, segments);

    const { fetched, error, attempts } = await fetchWithRetry(
      fetchArticlePage,
      articleId,
      fetchErrorRetries,
      retryDelayMs,
    );
    if (!fetched) {
      issues.push({
        articleNumber,
        kind: "fetch_error",
        message: `Fetch threw for article ${articleNumber} (LawArticleID=${articleId}) after ${attempts} attempt(s): ${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }

    if (fetched.status !== 200) {
      issues.push({
        articleNumber,
        kind: "unexpected_status",
        message: `Unexpected HTTP ${fetched.status} fetching article ${articleNumber} (LawArticleID=${articleId}) — not in knownGaps`,
      });
      continue;
    }

    const parsed = parseArticlePage(fetched.body);
    if (parsed.articleNumber !== String(articleNumber)) {
      issues.push({
        articleNumber,
        kind: "content_mismatch",
        message: `Article number mismatch at LawArticleID=${articleId}: expected article ${articleNumber}, page shows article ${parsed.articleNumber} — the ID range may have run past the document's real end`,
      });
      continue;
    }

    articles.push({
      articleNumber,
      articleId,
      headingPath: parsed.isEnactmentClause ? ENACTMENT_CLAUSE_HEADING : findArticleHeadingPath(tree, articleNumber),
      text: parsed.text,
      amendingInstrument: parsed.amendingInstrument,
      amendmentEffectiveDate: parsed.amendmentEffectiveDate,
      isEnactmentClause: parsed.isEnactmentClause,
    });
  }

  return { articles, skipped, issues, clean: issues.length === 0 };
}

/**
 * The persistence-gating boundary: returns the crawled articles only when
 * the report is clean (zero unresolved issues), otherwise throws. Batch 3's
 * ingestion step (not built yet) must call this — or an equivalent
 * explicit check on `report.clean` — before calling
 * replaceLegalSourceChunks(); a report with any issue must never reach
 * persistence.
 */
export function assertCleanCrawl(report: CrawlReport): CrawledArticle[] {
  if (!report.clean) {
    throw new LegalSourceCrawlError(
      `Refusing to proceed: crawl report has ${report.issues.length} unresolved issue(s) — persistence requires a clean run. First issue: ${report.issues[0].message}`,
      report.issues[0].articleNumber,
    );
  }
  return report.articles;
}
