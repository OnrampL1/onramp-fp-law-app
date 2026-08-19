# Real-sourced fixtures

`labour-law-lawview.real.html` is a byte-exact copy of the real Labour Law
page fetched from `http://legallaw.ul.edu.lb/LawView.aspx?opt=view&LawID=190374`
(2026-08-13/15), fetched with a standard browser `User-Agent` header, no
other request headers, cookies, or session state. Not modified after
capture (no injected comments, no re-encoding).

There is no synthetic fixture for this parser — per the explicit lesson
from the tree-view parser (a synthetic fixture built from prose missed a
real regex bug that only the live cross-check caught), `legal-source-flatview-parser.ts`
is tested against this real page only.

Real Lebanese legal text — do not edit its content.
