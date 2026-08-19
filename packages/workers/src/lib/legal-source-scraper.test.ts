import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseTreeIndexPage,
  parseArticlePage,
  findArticleHeadingPath,
  LegalSourceParseError,
} from "./legal-source-scraper";

const FIXTURES_DIR = join(__dirname, "__fixtures__", "legal-source-scraper");

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), "utf-8");
}

describe("parseTreeIndexPage", () => {
  it("extracts sections with id, article range, and heading path", () => {
    const html = loadFixture("tree-index.html");
    const result = parseTreeIndexPage(html);

    expect(result.sections).toHaveLength(5);

    const section = result.sections.find((s) => s.sectionId === "2001");
    expect(section).toBeDefined();
    expect(section?.minArticle).toBe(840);
    expect(section?.maxArticle).toBe(900);
    expect(section?.headingPath).toContain("الباب الثالث");
    expect(section?.headingPath).toContain("الكتاب الثاني");
  });

  it("computes the document's max article number from the widest range seen", () => {
    const html = loadFixture("tree-index.html");
    const result = parseTreeIndexPage(html);

    expect(result.maxArticleNumber).toBe(900);
  });

  it("does not conflate sections from different tree branches", () => {
    const html = loadFixture("tree-index.html");
    const result = parseTreeIndexPage(html);

    const heading = findArticleHeadingPath(result, 2);
    expect(heading).toContain("الباب الاول");
    expect(heading).not.toContain("الباب الثالث");
  });

  it("throws LegalSourceParseError when no tree sections are found", () => {
    const html = "<html><body><p>no tree here</p></body></html>";
    expect(() => parseTreeIndexPage(html)).toThrow(LegalSourceParseError);
  });

  it("parses the real, live tree index page (structure + article count)", () => {
    const html = loadFixture("tree-index.real.html");
    const result = parseTreeIndexPage(html);

    // Confirmed via live cross-check (2026-08-14): 277 LawTreeSectionID
    // nodes total, and the tree's own last node ("(1106-1107)", the repeal/
    // entry-into-force clause) corroborates the ~1,107 article count cited
    // in the validation report.
    expect(result.sections).toHaveLength(277);
    expect(result.maxArticleNumber).toBe(1107);
  });
});

describe("findArticleHeadingPath", () => {
  it("returns the most specific (narrowest-range) section's heading path", () => {
    const html = loadFixture("tree-index.html");
    const tree = parseTreeIndexPage(html);

    expect(findArticleHeadingPath(tree, 844)).toBe("الكتاب الثاني > الباب الثالث - في اثار الموجبات");
  });

  it("returns null for an article number outside every section's range", () => {
    const html = loadFixture("tree-index.html");
    const tree = parseTreeIndexPage(html);

    expect(findArticleHeadingPath(tree, 5000)).toBeNull();
  });
});

describe("parseArticlePage", () => {
  it("parses article number, text, and amendment metadata when present", () => {
    const html = loadFixture("article-844.html");
    const result = parseArticlePage(html);

    expect(result.articleNumber).toBe("844");
    expect(result.amendingInstrument).toBe("126/2019");
    expect(result.amendmentEffectiveDate).toBe("29/03/2019");
    expect(result.text).not.toContain("عدلت بموجب");
    expect(result.text).not.toContain("29/03/2019");
    expect(result.text).toContain("نص تجريبي");
    expect(result.isEnactmentClause).toBe(false);
  });

  it("parses an article with no amendment tag as null, not a parse failure", () => {
    const html = loadFixture("article-no-amendment.html");
    const result = parseArticlePage(html);

    expect(result.articleNumber).toBe("2");
    expect(result.amendingInstrument).toBeNull();
    expect(result.amendmentEffectiveDate).toBeNull();
    expect(result.text).toContain("نص تجريبي");
    expect(result.isEnactmentClause).toBe(false);
  });

  it("throws LegalSourceParseError when no article number is found", () => {
    const html = "<html><body><p>no article here</p></body></html>";
    expect(() => parseArticlePage(html)).toThrow(LegalSourceParseError);
  });

  // Real page, fetched 2026-08-14 during the Batch 2 live cross-check
  // (http://legallaw.ul.edu.lb/LawArticles.aspx?LawArticleID=972278&LawID=244226)
  // — see __fixtures__/legal-source-scraper/REAL_FIXTURES.md. This is what
  // actually caught the amendment-tag regex bug (real markup has a space
  // before the slash: "126 /2019", not "126/2019") that the synthetic
  // fixture, built from the validation report's prose rather than real
  // HTML, never would have surfaced.
  it("parses the real, live Article 844 page correctly (amendment tag, effective date)", () => {
    const html = loadFixture("article-844.real.html");
    const result = parseArticlePage(html);

    expect(result.articleNumber).toBe("844");
    expect(result.amendingInstrument).toBe("126/2019");
    expect(result.amendmentEffectiveDate).toBe("29/03/2019");
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.isEnactmentClause).toBe(false);
  });

  // Real page, fetched 2026-08-15 (Law 81/2018's own ratification clause,
  // LawArticleID=1094657) — see REAL_FIXTURES.md. Confirms the "- اصدار"
  // suffix marker is detected, and that it's stripped from the extracted
  // text rather than left dangling.
  it("flags an enactment/ratification clause via its '- اصدار' number-span suffix", () => {
    const html = loadFixture("article-enactment-clause.real.html");
    const result = parseArticlePage(html);

    expect(result.articleNumber).toBe("1");
    expect(result.isEnactmentClause).toBe(true);
    // The number-span artifact ("1  - اصدار") must be stripped from the
    // extracted text. "اصدار" alone can still legitimately appear elsewhere
    // on the page (e.g. the breadcrumb nav's "مواد اصدار" section label),
    // so the check is scoped to the specific stripped pattern, not the bare
    // word.
    expect(result.text).not.toContain("- اصدار");
    expect(result.text.length).toBeGreaterThan(0);
  });
});
