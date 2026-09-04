import { useMemo, useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  FileTextIcon,
  SearchIcon,
  ZoomOutIcon,
  ZoomInIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "../shared/icons";
import type { DocumentPage } from "./types";

interface ContractDocumentViewerProps {
  pages: DocumentPage[];
}

const ZOOM_LEVELS = [75, 100, 125, 150];


export function ContractDocumentViewer({ pages }: ContractDocumentViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoomIndex, setZoomIndex]     = useState(1); // default 100%
  const [search, setSearch]           = useState("");

  const page       = pages[currentPage];
  const totalPages = pages.length;
  const zoom       = ZOOM_LEVELS[zoomIndex];
  const normalizedSearch = search.trim();

  const searchPageIndex = useMemo(() => {
    if (!normalizedSearch) return -1;
    const query = normalizedSearch.toLowerCase();

    return pages.findIndex((page) =>
      page.sections.some((section) =>
        section.heading.toLowerCase().includes(query) ||
        section.paragraphs.some((paragraph) => paragraph.toLowerCase().includes(query))
      )
    );
  }, [normalizedSearch, pages]);

  function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlightText(text: string, query: string) {
    if (!query) return text;
    const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
    return text.split(regex).map((part, index) =>
      index % 2 === 1 ? (
        <mark key={index} className="bg-yellow-200 text-yellow-950 rounded-sm px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }

  function goTo(index: number) {
    setCurrentPage(Math.max(0, Math.min(index, totalPages - 1)));
  }

  function handleSearch() {
    if (!normalizedSearch) return;
    if (searchPageIndex !== -1) {
      goTo(searchPageIndex);
    }
  }

  return (
    <Card>
      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 border-b border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Label */}
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <FileTextIcon className="h-4 w-4 text-muted-foreground" />
          Contract document
        </div>

        {/* Search + zoom */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contract..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              className="h-8 pl-8 text-xs w-44"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border px-2 py-1">
            <button
              onClick={() => setZoomIndex((z) => Math.max(0, z - 1))}
              disabled={zoomIndex === 0}
              className="text-muted-foreground hover:text-foreground disabled:opacity-40"
              aria-label="Zoom out"
            >
              <ZoomOutIcon />
            </button>
            <span className="min-w-[3rem] text-center text-xs font-medium text-foreground">
              {zoom}%
            </span>
            <button
              onClick={() => setZoomIndex((z) => Math.min(ZOOM_LEVELS.length - 1, z + 1))}
              disabled={zoomIndex === ZOOM_LEVELS.length - 1}
              className="text-muted-foreground hover:text-foreground disabled:opacity-40"
              aria-label="Zoom in"
            >
              <ZoomInIcon />
            </button>
          </div>
        </div>
      </div>

      {/* ── Document area ── */}
      <CardContent className="overflow-auto bg-muted/30 p-6">
        {/* Paper */}
        <div
          className="mx-auto rounded-lg bg-card p-8 shadow-md transition-all duration-200"
          style={{
            maxWidth:  `${zoom * 7}px`,
            fontSize:  `${zoom}%`,
          }}
        >
          {/* Page header */}
          <div className="mb-6 text-center">
            <h2 className="text-lg font-bold text-foreground">{page.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Page {page.pageNumber} of {totalPages}
            </p>
          </div>

          {/* Sections */}
          {page.sections.map((section, i) => (
            <div key={i} className="mb-5">
              {section.heading && (
                <h3 className="mb-3 text-sm font-bold text-foreground">
                  {normalizedSearch ? highlightText(section.heading, normalizedSearch) : section.heading}
                </h3>
              )}
              {section.paragraphs.map((para, j) => (
                <p
                  key={j}
                  className="mb-3 text-sm leading-relaxed text-foreground/80 last:mb-0"
                >
                  {normalizedSearch ? highlightText(para, normalizedSearch) : para}
                </p>
              ))}
            </div>
          ))}
        </div>
      </CardContent>

      {/* ── Navigation bar ── */}
      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        {/* Previous */}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage === 0}
        >
          <ChevronLeftIcon />
          Previous
        </Button>

        {/* Page dots */}
        <div className="flex items-center gap-2">
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to page ${i + 1}`}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === currentPage
                  ? "bg-foreground"
                  : "bg-slate-400 hover:bg-slate-500"
              }`}
            />
          ))}
        </div>

        {/* Next */}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage === totalPages - 1}
        >
          Next
          <ChevronRightIcon />
        </Button>
      </div>
    </Card>
  );
}
