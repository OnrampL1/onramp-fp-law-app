# Real-sourced fixtures

The `*.real.html` files in this directory are byte-exact copies of pages
actually fetched from `legallaw.ul.edu.lb` during the Batch 2 live
cross-check — unlike every other file in this directory (`tree-index.html`,
`article-844.html`, `article-no-amendment.html`), which are hand-constructed
synthetic approximations. Not modified after capture (no injected comments,
no re-encoding) so they stay valid for encoding/byte-level testing.

| File | Source URL | Fetched |
|---|---|---|
| `tree-index.real.html` | `http://legallaw.ul.edu.lb/Law.aspx?lawId=244226` | 2026-08-14 |
| `article-844.real.html` | `http://legallaw.ul.edu.lb/LawArticles.aspx?LawArticleID=972278&LawID=244226` | 2026-08-14 |
| `article-enactment-clause.real.html` | `http://legallaw.ul.edu.lb/LawArticles.aspx?LawArticleID=1094657&LawID=278573` (Law 81/2018) | 2026-08-15 |

Both fetched with a standard browser `User-Agent` header; no other request
headers, cookies, or session state.

`tree-index.real.html` is the full Code of Obligations and Contracts
navigation tree — real content, safe to use as a genuine (not synthetic)
structural fixture for `parseTreeIndexPage()`.

`article-844.real.html` is the real, live page for Article 844, including
its actual current text (Arabic and French), its amendment tag, and — not
anticipated before this cross-check — an apparent pre-amendment ("previous
text") section. See the Batch 2 cross-check report for what this means for
`parseArticlePage()` and for the Phase 6 plan's historical-versioning
assumption. Real Lebanese legal text — do not edit its content.

`article-enactment-clause.real.html` is Law 81/2018's own ratification
clause — a real "Article 1" whose number span carries a "- اصدار"
("- Enactment") suffix (`<span>1  - اصدار  </span>`), distinguishing it from
a substantive article. It lives at an ID the source's own linear-offset
formula does not predict, and on at least one other source (Law 75/1999) a
second, unrelated, substantive "Article 1" also exists — see
`ScrapedArticle.isEnactmentClause`'s doc comment in `legal-source-scraper.ts`
for the full finding. Real Lebanese legal text — do not edit its content.
