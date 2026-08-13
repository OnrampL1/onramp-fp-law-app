// Parses legallaw.ul.edu.lb's tree-view page template (Law.aspx) into a
// normalized intermediate representation for Phase 6 (Lebanese Legal
// Knowledge Base) ingestion (docs/PHASE6_IMPLEMENTATION_PLAN.md Section 8).
// Covers the tree-view template only, for the single-source proof (Code of
// Obligations and Contracts) — the LawView.aspx flat-view parser (Labour
// Law) is deliberately not built yet, per the plan's single-source-first
// sequencing.
//
// Cross-checked against real fetched pages (live cross-check, 2026-08-14 —
// see __fixtures__/legal-source-scraper/REAL_FIXTURES.md and
// tree-index.real.html). The article markup pattern
// (<span>المادة</span><span>{number}</span>) and amendment-tag format
// (confirmed on the real Article 844 page: "(عدلت بموجب 126 /2019)",
// effective 29/03/2019 — note the space before the slash, which an earlier
// version of AMENDMENT_TAG_PATTERN missed) are confirmed correct.
// parseTreeIndexPage()'s original design was NOT correct and has been
// rebuilt: the tree has no per-article links at all — see its own doc
// comment below for what changed and why. Per-article fetching now lives in
// legal-source-crawler.ts, driven by a sequential-LawArticleID walk rather
// than the tree.

import * as cheerio from "cheerio";

// A single tree node (any hierarchy level — Book/Title/Chapter/Section/Part,
// not just leaves). Confirmed via live cross-check (2026-08-14) that every
// node, not only per-article leaves, links via LawTreeSectionID= and carries
// an inclusive article-number range in its own label text. There is no
// direct per-article link anywhere in the tree.
export interface ScrapedTreeSection {
  sectionId: string;
  headingPath: string;
  minArticle: number;
  maxArticle: number;
}

export interface ScrapedTreeIndex {
  sections: ScrapedTreeSection[];
  maxArticleNumber: number;
}

export interface ScrapedArticle {
  articleNumber: string;
  text: string;
  amendingInstrument: string | null;
  amendmentEffectiveDate: string | null;
  // True when the article-number span itself carries the "- اصدار"
  // ("- Enactment") suffix — see ENACTMENT_CLAUSE_PATTERN below. Confirmed
  // 2026-08-15 on Law 81/2018 (LawArticleID=1094657) and Law 75/1999
  // (LawArticleID=1018890): both render as e.g. "<span>1  - اصدار  </span>"
  // instead of a plain "<span>1</span>". This marks the law's own
  // ratification/enactment clause, which some sources number as "Article 1"
  // separately from — and colliding with — the real Article 1 of the
  // substantive text (confirmed as a genuine collision on Law 75/1999:
  // LawArticleID=694355 is a completely different, 3,244-character
  // substantive Article 1, also self-numbered "1"). Content-based, not
  // tree-label-based: a tree section literally titled "أحكام ختامية" (Final
  // Provisions) does NOT imply this same collision — Law 81/2018's own
  // Chapter 8 "أحكام ختامية" (articles 131-136) is entirely normal, linearly
  // numbered content with no marker and no collision. Only this specific
  // in-content suffix reliably signals the collision-prone case.
  isEnactmentClause: boolean;
}

export class LegalSourceParseError extends Error {}

// Matches the article-number span pattern directly verified in
// PHASE6_LEGAL_CORPUS_VALIDATION.md Part 1, Document 1: each article is
// rendered as <span>المادة</span><span>{number}</span>. Matched against
// extracted text content rather than the literal span structure, so it
// isn't sensitive to exactly how those two spans are wrapped.
const ARTICLE_NUMBER_PATTERN = /المادة\s*(\d+)/;

// Matches the article number immediately followed by the "- اصدار"
// (enactment) suffix confirmed on Law 81/2018 and Law 75/1999's ratification
// clauses — see ScrapedArticle.isEnactmentClause's doc comment. Anchored
// right after the number (not just "اصدار" anywhere on the page) so it
// doesn't false-positive on articles whose own body text happens to discuss
// enactment/publication procedurally.
const ENACTMENT_CLAUSE_PATTERN = /المادة\s*\d+\s*-\s*اصدار/;

// Matches the amendment-tag format confirmed via live cross-check against
// the real Article 844 page (2026-08-14): "(عدلت بموجب 126 /2019)" — note
// the space before the slash, which the validation report's prose
// ("(عدلت بموجب 126/2019)") did not preserve and an earlier version of this
// regex accordingly missed. Whitespace is now tolerated on both sides of
// the slash; the captured group strips it back out via .replace() at the
// call site so amendingInstrument is always the clean "126/2019" form.
const AMENDMENT_TAG_PATTERN = /\(عدلت بموجب\s*(\d+\s*\/\s*\d{4})\)/;

// A DD/MM/YYYY date near the amendment tag, matching the documented
// "effective date 29/03/2019" convention observed on the same article.
const EFFECTIVE_DATE_PATTERN = /(\d{1,2}\/\d{1,2}\/\d{4})/;

// Matches the inclusive article range trailing a tree node's own label,
// e.g. "الباب الثالث - في اثار الموجبات (840 - 900)" or "(2-118)" (both
// spacing styles occur on the real page — confirmed via live cross-check).
const NODE_RANGE_PATTERN = /\(\s*(\d+)\s*-\s*(\d+)\s*\)\s*$/;

/**
 * Parses a Law.aspx-shaped navigation-tree page into its flat list of
 * hierarchy sections (id, article range, heading path) and the document's
 * overall max article number (the highest range upper-bound seen anywhere
 * in the tree). Walks by link href (LawArticles.aspx?LawTreeSectionID=...)
 * rather than assuming a specific CSS class, since selector resilience
 * matters more than exact markup matching — fragile only to the URL
 * pattern itself changing.
 *
 * Superseded design note: an earlier version of this function assumed
 * direct per-article links (LawArticleID=...) in the tree. Live cross-check
 * (2026-08-14) showed that's wrong — the tree only ever links via
 * LawTreeSectionID=, at every hierarchy level, and a plain GET to one of
 * those URLs does not reliably return that section's article content
 * (likely requires ASP.NET postback/session state a bare fetch doesn't
 * replicate). This function no longer tries to resolve per-article content
 * from the tree at all; it only extracts structural metadata (ranges,
 * heading paths, the overall article count). Per-article content and IDs
 * come from legal-source-crawler.ts's sequential-ID walk instead.
 */
export function parseTreeIndexPage(html: string): ScrapedTreeIndex {
  const $ = cheerio.load(html);
  const sections: ScrapedTreeSection[] = [];
  let maxArticleNumber = 0;

  $("a[href*='LawTreeSectionID=']").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const sectionIdMatch = href.match(/LawTreeSectionID=(\d+)/);
    if (!sectionIdMatch) return;

    const linkText = $(el).text().trim();
    const rangeMatch = linkText.match(NODE_RANGE_PATTERN);
    if (!rangeMatch) return;

    const minArticle = parseInt(rangeMatch[1], 10);
    const maxArticle = parseInt(rangeMatch[2], 10);
    const ownLabel = linkText.replace(NODE_RANGE_PATTERN, "").trim();

    // Full heading path, outer to inner, including this node's own label —
    // unlike the old per-article design, every tree node here is a
    // structural heading (Book/Title/Chapter/Section/Part), never a bare
    // article number, so the node's own label is meaningful context and
    // belongs in the path.
    const ancestorHeadings: string[] = [];
    $(el)
      .parents("li")
      .each((_i, li) => {
        const label = $(li).find("> a").first().text().trim();
        if (label && label !== linkText) {
          ancestorHeadings.unshift(label.replace(NODE_RANGE_PATTERN, "").trim());
        }
      });
    ancestorHeadings.push(ownLabel);

    sections.push({
      sectionId: sectionIdMatch[1],
      headingPath: ancestorHeadings.join(" > "),
      minArticle,
      maxArticle,
    });

    if (maxArticle > maxArticleNumber) maxArticleNumber = maxArticle;
  });

  if (sections.length === 0) {
    throw new LegalSourceParseError(
      "No tree sections found in tree index page — page shape may not match the expected Law.aspx template",
    );
  }

  return { sections, maxArticleNumber };
}

/**
 * Finds the most specific (narrowest-range) tree section containing a given
 * article number, and returns its heading path — null if no section's range
 * contains it. "Most specific" is the section with the smallest (max - min)
 * span among matches, which corresponds to the deepest node in a properly
 * nested hierarchy (a child's range is always a subset of its parent's).
 */
export function findArticleHeadingPath(tree: ScrapedTreeIndex, articleNumber: number): string | null {
  let best: ScrapedTreeSection | null = null;
  for (const section of tree.sections) {
    if (articleNumber < section.minArticle || articleNumber > section.maxArticle) continue;
    if (!best || section.maxArticle - section.minArticle < best.maxArticle - best.minArticle) {
      best = section;
    }
  }
  return best ? best.headingPath : null;
}

/**
 * Parses a single LawArticles.aspx-shaped article page into its number,
 * text, and (if present) amendment metadata. Text-pattern-matched rather
 * than class-name-dependent, for the same reason as parseTreeIndexPage —
 * conservative, falls back to null on a miss rather than throwing, mirroring
 * chunking.ts's own "a missed pattern falls into a safe default" discipline.
 */
export function parseArticlePage(html: string): ScrapedArticle {
  const $ = cheerio.load(html);
  const bodyText = $("body").text();

  const numberMatch = bodyText.match(ARTICLE_NUMBER_PATTERN);
  if (!numberMatch) {
    throw new LegalSourceParseError(
      "No article number found in article page — page shape may not match the expected LawArticles.aspx template",
    );
  }

  const isEnactmentClause = ENACTMENT_CLAUSE_PATTERN.test(bodyText);

  const amendmentMatch = bodyText.match(AMENDMENT_TAG_PATTERN);
  const amendingInstrument = amendmentMatch
    ? amendmentMatch[1].replace(/\s+/g, "")
    : null;

  let amendmentEffectiveDate: string | null = null;
  if (amendmentMatch && amendmentMatch.index !== undefined) {
    // Search only the text following the amendment tag for the nearby
    // effective date, not the whole page — a bare date pattern could
    // otherwise match an unrelated Gazette or promulgation date elsewhere
    // on the page.
    const afterTag = bodyText.slice(amendmentMatch.index + amendmentMatch[0].length);
    const dateMatch = afterTag.match(EFFECTIVE_DATE_PATTERN);
    amendmentEffectiveDate = dateMatch ? dateMatch[1] : null;
  }

  // Article text: the page's text content with the amendment tag and
  // article-number label (including the "- اصدار" suffix, when present)
  // stripped out, since those are metadata, not article body text. The
  // effective-date string (if found) is removed by its literal matched
  // value, not the general date pattern, so an unrelated date elsewhere in
  // the article's own text is never touched. Falls back to the full
  // remaining body text (no dedicated content-container selector assumed)
  // rather than throwing — this module errs toward "under-clean but
  // present" text over failing an otherwise-parseable page on a
  // text-extraction nuance.
  let text = bodyText
    .replace(ENACTMENT_CLAUSE_PATTERN, "")
    .replace(ARTICLE_NUMBER_PATTERN, "")
    .replace(AMENDMENT_TAG_PATTERN, "");
  if (amendmentEffectiveDate) {
    text = text.replace(amendmentEffectiveDate, "");
  }
  text = text.trim();

  return {
    articleNumber: numberMatch[1],
    text,
    amendingInstrument,
    amendmentEffectiveDate,
    isEnactmentClause,
  };
}
