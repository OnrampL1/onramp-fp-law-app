import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFlatViewPage } from "./legal-source-flatview-parser";
import { LegalSourceParseError } from "./legal-source-scraper";

const FIXTURE = readFileSync(
  join(__dirname, "__fixtures__", "legal-source-flatview-parser", "labour-law-lawview.real.html"),
  "utf-8",
);

describe("parseFlatViewPage", () => {
  it("parses the real Labour Law page into articles with plausible coverage", () => {
    const articles = parseFlatViewPage(FIXTURE);

    // Tree-confirmed max article number is 114; flat-view numbering
    // includes sub-numbered insertions (12-1..12-10, 35-bis) on top of
    // that, so article count exceeds 114.
    expect(articles.length).toBeGreaterThan(114);

    const numbers = articles.map((a) => a.articleNumber);
    expect(numbers).toContain("1");
    expect(numbers).toContain("114");
  });

  it("parses a plain, unamended article correctly", () => {
    const articles = parseFlatViewPage(FIXTURE);
    const article3 = articles.find((a) => a.articleNumber === "3");

    expect(article3).toBeDefined();
    expect(article3?.amendments).toEqual([]);
    expect(article3?.isRepealed).toBe(false);
    expect(article3?.text.length).toBeGreaterThan(0);
  });

  it("captures the confirmed amendment-tag format (law-name word, &nbsp; handling)", () => {
    const articles = parseFlatViewPage(FIXTURE);
    const article1 = articles.find((a) => a.articleNumber === "1");

    expect(article1).toBeDefined();
    expect(article1?.amendments).toEqual([{ verb: "amended", instrument: "3/2025" }]);
  });

  it("captures multiple chained amendment tags on the same article", () => {
    const articles = parseFlatViewPage(FIXTURE);
    const article28 = articles.find((a) => a.articleNumber === "28");

    expect(article28).toBeDefined();
    expect(article28?.amendments.length).toBeGreaterThanOrEqual(2);
    expect(article28?.amendments.map((a) => a.instrument)).toEqual(
      expect.arrayContaining(["267/2014", "207/2000"]),
    );
  });

  it("parses inserted sub-numbered articles (12-1) with the 'inserted' verb", () => {
    const articles = parseFlatViewPage(FIXTURE);
    const inserted = articles.find((a) => a.articleNumber === "12-1");

    expect(inserted).toBeDefined();
    expect(inserted?.amendments).toEqual([{ verb: "inserted", instrument: "3/2025" }]);
  });

  it("parses a 'bis' sub-numbered article distinctly from its base article", () => {
    const articles = parseFlatViewPage(FIXTURE);
    const bis = articles.find((a) => a.articleNumber.startsWith("35-") && a.articleNumber !== "35");
    const plain35 = articles.find((a) => a.articleNumber === "35");

    expect(bis).toBeDefined();
    expect(plain35).toBeDefined();
    expect(bis?.text).not.toBe(plain35?.text);
  });

  it("flags a repealed article with the 'repealed' verb", () => {
    const articles = parseFlatViewPage(FIXTURE);
    const article13 = articles.find((a) => a.articleNumber === "13");

    expect(article13).toBeDefined();
    expect(article13?.isRepealed).toBe(true);
    expect(article13?.amendments).toEqual([{ verb: "repealed", instrument: "9640/1975" }]);
  });

  it("attaches a Book > Chapter heading path once inside a labeled chapter", () => {
    const articles = parseFlatViewPage(FIXTURE);
    const article10 = articles.find((a) => a.articleNumber === "10");

    // Both ancestor labels should be present in the accumulated path,
    // without hard-coding the exact Arabic label strings in this test.
    expect(article10?.headingPath?.split(" > ").length).toBe(2);
  });

  it("attaches the Preliminary Provisions heading path to articles before the first Book heading", () => {
    const articles = parseFlatViewPage(FIXTURE);
    const article1 = articles.find((a) => a.articleNumber === "1");

    // "احكام اولية" (Preliminary Provisions) is its own top-level <h2>
    // section preceding "الباب الاول" in the real page's table of
    // contents (articles 1-9) — a fourth heading kind alongside
    // Book/Chapter/article, previously unrecognized and left null.
    expect(article1?.headingPath).not.toBeNull();
    expect(article1?.headingPath?.split(" > ").length).toBe(1);
  });

  it("leaves no article with a null heading path in the real Labour Law page", () => {
    const articles = parseFlatViewPage(FIXTURE);
    const nullHeadingArticles = articles.filter((a) => a.headingPath === null);

    expect(nullHeadingArticles).toEqual([]);
  });

  it("throws LegalSourceParseError when no article headings are found", () => {
    const html = "<html><body><h2>Not a law page</h2></body></html>";
    expect(() => parseFlatViewPage(html)).toThrow(LegalSourceParseError);
  });
});
