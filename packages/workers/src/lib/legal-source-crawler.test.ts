import { crawlLegalSource, assertCleanCrawl, LegalSourceCrawlError, type FetchArticlePage } from "./legal-source-crawler";
import type { ScrapedTreeIndex } from "./legal-source-scraper";

function articleHtml(articleNumber: number, text: string): string {
  return `<html><body><span>المادة</span><span>${articleNumber}</span><p>${text}</p></body></html>`;
}

function enactmentClauseHtml(articleNumber: number, text: string): string {
  return `<html><body><span>المادة</span><span>${articleNumber}  - اصدار  </span><p>${text}</p></body></html>`;
}

describe("crawlLegalSource", () => {
  it("walks the anchor-derived id sequence, skipping known gaps and attaching heading paths", async () => {
    const tree: ScrapedTreeIndex = {
      sections: [{ sectionId: "1", headingPath: "الكتاب الاول", minArticle: 1, maxArticle: 3 }],
      maxArticleNumber: 3,
    };

    const fetchArticlePage: FetchArticlePage = jest.fn(async (articleId: number) => {
      // anchor: articleNumber 2 -> articleId 5000, so offset = 4998
      const articleNumber = articleId - 4998;
      return { status: 200, body: articleHtml(articleNumber, `نص المادة ${articleNumber}`) };
    });

    const report = await crawlLegalSource({
      fetchArticlePage,
      tree,
      anchor: { articleNumber: 2, articleId: 5000 },
      knownGaps: [{ articleNumber: 1, reason: "LawArticleID=4999 returns HTTP 500 — no known alternate route" }],
    });

    expect(report.clean).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.skipped).toEqual([
      { articleNumber: 1, reason: "LawArticleID=4999 returns HTTP 500 — no known alternate route" },
    ]);
    expect(report.articles).toHaveLength(2);
    expect(report.articles[0].articleNumber).toBe(2);
    expect(report.articles[0].articleId).toBe(5000);
    expect(report.articles[0].headingPath).toBe("الكتاب الاول");
    expect(report.articles[1].articleNumber).toBe(3);
    expect(report.articles[1].articleId).toBe(5001);

    // article 1 was never fetched — only 2 calls, not 3
    expect(fetchArticlePage).toHaveBeenCalledTimes(2);
  });

  it("collects a non-200 response for an article not in knownGaps as an issue, and keeps going — no retry", async () => {
    const tree: ScrapedTreeIndex = {
      sections: [{ sectionId: "1", headingPath: "الكتاب الاول", minArticle: 1, maxArticle: 2 }],
      maxArticleNumber: 2,
    };

    const fetchArticlePage: FetchArticlePage = jest.fn(async (articleId: number) => {
      if (articleId === 5000) return { status: 200, body: articleHtml(1, "نص") };
      return { status: 500, body: "internal server error" };
    });

    const report = await crawlLegalSource({
      fetchArticlePage,
      tree,
      anchor: { articleNumber: 1, articleId: 5000 },
      retryDelayMs: 0,
    });

    expect(report.clean).toBe(false);
    expect(report.issues).toEqual([
      {
        articleNumber: 2,
        kind: "unexpected_status",
        message: expect.stringContaining("Unexpected HTTP 500"),
      },
    ]);
    // article 1 still resolved despite article 2's failure — the run did
    // not abort partway through
    expect(report.articles).toHaveLength(1);
    expect(report.articles[0].articleNumber).toBe(1);
    // exactly 2 calls (one per article) — a non-200 status is never retried
    expect(fetchArticlePage).toHaveBeenCalledTimes(2);
  });

  it("retries a fetch_error and resolves cleanly if a later attempt succeeds", async () => {
    const tree: ScrapedTreeIndex = {
      sections: [{ sectionId: "1", headingPath: "الكتاب الاول", minArticle: 1, maxArticle: 1 }],
      maxArticleNumber: 1,
    };

    let callCount = 0;
    const fetchArticlePage: FetchArticlePage = jest.fn(async () => {
      callCount++;
      if (callCount < 2) throw new Error("ECONNRESET");
      return { status: 200, body: articleHtml(1, "نص") };
    });

    const report = await crawlLegalSource({
      fetchArticlePage,
      tree,
      anchor: { articleNumber: 1, articleId: 5000 },
      retryDelayMs: 0,
    });

    expect(report.clean).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.articles).toHaveLength(1);
    expect(report.articles[0].articleNumber).toBe(1);
    expect(fetchArticlePage).toHaveBeenCalledTimes(2);
  });

  it("reports a fetch_error as an issue only once retries are exhausted", async () => {
    const tree: ScrapedTreeIndex = {
      sections: [{ sectionId: "1", headingPath: "الكتاب الاول", minArticle: 1, maxArticle: 1 }],
      maxArticleNumber: 1,
    };

    const fetchArticlePage: FetchArticlePage = jest.fn(async () => {
      throw new Error("ETIMEDOUT");
    });

    const report = await crawlLegalSource({
      fetchArticlePage,
      tree,
      anchor: { articleNumber: 1, articleId: 5000 },
      fetchErrorRetries: 2,
      retryDelayMs: 0,
    });

    expect(report.clean).toBe(false);
    expect(report.issues).toEqual([
      {
        articleNumber: 1,
        kind: "fetch_error",
        message: expect.stringContaining("after 3 attempt(s)"),
      },
    ]);
    // default 2 retries => 3 total attempts for the one article
    expect(fetchArticlePage).toHaveBeenCalledTimes(3);
  });

  it("collects a content mismatch (page shows a different article than requested) as an issue", async () => {
    const tree: ScrapedTreeIndex = {
      sections: [{ sectionId: "1", headingPath: "الكتاب الاول", minArticle: 1, maxArticle: 1 }],
      maxArticleNumber: 1,
    };

    // Simulates the confirmed real-world failure mode: an ID past the
    // document's true end returns HTTP 200 but with an unrelated article's
    // content (observed on the real site: id one past the last valid
    // article returned "article 1" content instead of erroring).
    const fetchArticlePage: FetchArticlePage = jest.fn(async () => ({
      status: 200,
      body: articleHtml(99, "نص مختلف تماما"),
    }));

    const report = await crawlLegalSource({
      fetchArticlePage,
      tree,
      anchor: { articleNumber: 1, articleId: 5000 },
    });

    expect(report.clean).toBe(false);
    expect(report.issues).toEqual([
      {
        articleNumber: 1,
        kind: "content_mismatch",
        message: expect.stringContaining("expected article 1, page shows article 99"),
      },
    ]);
    expect(report.articles).toEqual([]);
  });

  it("does not skip a non-allowlisted article on 500 — only exact knownGaps entries are absorbed", async () => {
    const tree: ScrapedTreeIndex = {
      sections: [{ sectionId: "1", headingPath: "الكتاب الاول", minArticle: 1, maxArticle: 2 }],
      maxArticleNumber: 2,
    };

    const fetchArticlePage: FetchArticlePage = jest.fn(async (articleId: number) => {
      if (articleId === 5000) return { status: 200, body: articleHtml(1, "نص") };
      // article 2 unexpectedly 500s — NOT in knownGaps (which only lists
      // article 1) — must not be silently skipped like article 1 would be.
      return { status: 500, body: "internal server error" };
    });

    const report = await crawlLegalSource({
      fetchArticlePage,
      tree,
      anchor: { articleNumber: 1, articleId: 5000 },
      knownGaps: [{ articleNumber: 1, reason: "unrelated — article 1 already fetched fine here" }],
    });

    // article 1 was skipped via the allowlist (never fetched), article 2's
    // 500 was NOT absorbed the same way — it shows up as a reported issue
    expect(report.skipped).toEqual([{ articleNumber: 1, reason: "unrelated — article 1 already fetched fine here" }]);
    expect(report.clean).toBe(false);
    expect(report.issues).toEqual([
      { articleNumber: 2, kind: "unexpected_status", message: expect.stringContaining("Unexpected HTTP 500") },
    ]);
    expect(fetchArticlePage).toHaveBeenCalledTimes(1);
  });

  it("tags an enactment clause with the fixed distinguishable heading, not the tree's own heading path", async () => {
    const tree: ScrapedTreeIndex = {
      // Deliberately no section covers article 1 at all — mirrors Law
      // 81/2018 and Law 75/1999, where the enactment clause isn't part of
      // the tree's normal numbered ranges.
      sections: [{ sectionId: "1", headingPath: "الباب الاول", minArticle: 2, maxArticle: 5 }],
      maxArticleNumber: 1,
    };

    const fetchArticlePage: FetchArticlePage = jest.fn(async () => ({
      status: 200,
      body: enactmentClauseHtml(1, "يعمل بهذا القانون فور نشره في الجريدة الرسمية"),
    }));

    const report = await crawlLegalSource({
      fetchArticlePage,
      tree,
      anchor: { articleNumber: 1, articleId: 5000 },
    });

    expect(report.clean).toBe(true);
    expect(report.articles).toHaveLength(1);
    expect(report.articles[0].isEnactmentClause).toBe(true);
    expect(report.articles[0].headingPath).toBe("أحكام الإصدار (Enactment Provisions)");
    expect(report.articles[0].headingPath).not.toBe("الباب الاول");
  });

  it("uses knownIdOverrides instead of the base formula for a specific article, still verifying the result", async () => {
    const tree: ScrapedTreeIndex = {
      sections: [{ sectionId: "1", headingPath: "احكام عامة وموقتة", minArticle: 2, maxArticle: 3 }],
      maxArticleNumber: 3,
    };

    const fetchArticlePage: FetchArticlePage = jest.fn(async (articleId: number) => {
      // base formula (anchor 2->5000, offset 4998) would predict 5003 for
      // article 3 — but the override sends it to a completely different id.
      if (articleId === 9999) return { status: 200, body: articleHtml(3, "نص المادة الختامية") };
      const articleNumber = articleId - 4998;
      return { status: 200, body: articleHtml(articleNumber, `نص المادة ${articleNumber}`) };
    });

    const report = await crawlLegalSource({
      fetchArticlePage,
      tree,
      anchor: { articleNumber: 2, articleId: 5000 },
      knownIdOverrides: [{ articleNumber: 3, articleId: 9999 }],
    });

    expect(report.clean).toBe(true);
    // articles 1, 2 (base formula) and 3 (override) all resolve
    expect(report.articles).toHaveLength(3);
    const article3 = report.articles.find((a) => a.articleNumber === 3);
    expect(article3?.articleId).toBe(9999);
    expect(article3?.text).toContain("نص المادة الختامية");
  });

  it("still reports a content mismatch when a knownIdOverrides entry turns out wrong", async () => {
    const tree: ScrapedTreeIndex = {
      sections: [{ sectionId: "1", headingPath: "س", minArticle: 1, maxArticle: 1 }],
      maxArticleNumber: 1,
    };

    // The override ID is confidently supplied but, on fetch, doesn't
    // actually resolve to the expected article — the safety check must
    // still catch this rather than trusting the override blindly.
    const fetchArticlePage: FetchArticlePage = jest.fn(async () => ({
      status: 200,
      body: articleHtml(42, "نص غير متوقع"),
    }));

    const report = await crawlLegalSource({
      fetchArticlePage,
      tree,
      anchor: { articleNumber: 1, articleId: 5000 },
      knownIdOverrides: [{ articleNumber: 1, articleId: 7777 }],
    });

    expect(report.clean).toBe(false);
    expect(report.issues).toEqual([
      { articleNumber: 1, kind: "content_mismatch", message: expect.stringContaining("expected article 1, page shows article 42") },
    ]);
  });

  it("uses offsetSegments to apply a different offset past a drift breakpoint", async () => {
    const tree: ScrapedTreeIndex = {
      sections: [{ sectionId: "1", headingPath: "س", minArticle: 1, maxArticle: 4 }],
      maxArticleNumber: 4,
    };

    // segment 1: articles 1-2, offset 1000 (id = 1000+N)
    // segment 2: articles 3+, offset 2000 (id = 2000+N)
    const fetchArticlePage: FetchArticlePage = jest.fn(async (articleId: number) => {
      if (articleId >= 2000) return { status: 200, body: articleHtml(articleId - 2000, "نص") };
      return { status: 200, body: articleHtml(articleId - 1000, "نص") };
    });

    const report = await crawlLegalSource({
      fetchArticlePage,
      tree,
      anchor: { articleNumber: 1, articleId: 1001 },
      offsetSegments: [
        { startArticle: 1, offset: 1000 },
        { startArticle: 3, offset: 2000 },
      ],
    });

    expect(report.clean).toBe(true);
    expect(report.articles.find((a) => a.articleNumber === 2)?.articleId).toBe(1002);
    expect(report.articles.find((a) => a.articleNumber === 3)?.articleId).toBe(2003);
    expect(report.articles.find((a) => a.articleNumber === 4)?.articleId).toBe(2004);
  });

  it("falls back to anchor's single offset unchanged when offsetSegments is omitted", async () => {
    const tree: ScrapedTreeIndex = {
      sections: [{ sectionId: "1", headingPath: "س", minArticle: 1, maxArticle: 2 }],
      maxArticleNumber: 2,
    };

    const fetchArticlePage: FetchArticlePage = jest.fn(async (articleId: number) => ({
      status: 200,
      body: articleHtml(articleId - 4998, "نص"),
    }));

    const report = await crawlLegalSource({
      fetchArticlePage,
      tree,
      anchor: { articleNumber: 1, articleId: 4999 },
    });

    expect(report.clean).toBe(true);
    expect(report.articles.find((a) => a.articleNumber === 2)?.articleId).toBe(5000);
  });
});

describe("assertCleanCrawl", () => {
  it("returns the articles for a clean report", () => {
    const report = {
      articles: [
        {
          articleNumber: 2,
          articleId: 5000,
          headingPath: null,
          text: "نص",
          amendingInstrument: null,
          amendmentEffectiveDate: null,
          isEnactmentClause: false,
        },
      ],
      skipped: [],
      issues: [],
      clean: true,
    };

    expect(assertCleanCrawl(report)).toBe(report.articles);
  });

  it("throws and refuses to return articles for a report with any unresolved issue", () => {
    const report = {
      articles: [
        {
          articleNumber: 1,
          articleId: 5000,
          headingPath: null,
          text: "نص",
          amendingInstrument: null,
          amendmentEffectiveDate: null,
          isEnactmentClause: false,
        },
      ],
      skipped: [],
      issues: [{ articleNumber: 2, kind: "unexpected_status" as const, message: "Unexpected HTTP 500" }],
      clean: false,
    };

    expect(() => assertCleanCrawl(report)).toThrow(LegalSourceCrawlError);
  });
});
