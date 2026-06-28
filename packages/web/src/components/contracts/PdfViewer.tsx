import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { ContractDetail } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  ZoomIn,
  ZoomOut,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  FileText,
} from "lucide-react";

type ContractPage = {
  heading: string;
  clauses: { num: string; title: string; body: string }[];
};

type PdfViewerProps = {
  contract: ContractDetail;
  pages: ContractPage[];
};

const ZOOM_STEPS = [75, 90, 100, 125, 150];

function highlight(text: string, query: string) {
  if (!query) return text;
  const parts = text.split(
    new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
  );
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="rounded bg-amber-200 px-0.5 text-foreground">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function PdfViewer({ contract, pages }: PdfViewerProps) {
  const [page, setPage] = useState(1);
  const [zoomIdx, setZoomIdx] = useState(2);
  const [query, setQuery] = useState("");
  const total = pages.length;
  const zoom = ZOOM_STEPS[zoomIdx];
  const current = pages[page - 1];

  const matchCount = useMemo(() => {
    if (!query) return 0;
    const q = query.toLowerCase();
    return pages.reduce((acc, p) => {
      const text =
        `${p.heading} ${p.clauses.map((c) => c.title + " " + c.body).join(" ")}`.toLowerCase();
      return acc + text.split(q).length - 1;
    }, 0);
  }, [query, pages]);

  return (
    <Card className="flex h-[calc(100svh-9rem)] min-h-[640px] flex-col overflow-hidden p-0">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <FileText className="size-4 text-primary" />
          <span className="hidden sm:inline">{contract.name}.pdf</span>
          <span className="sm:hidden">Contract.pdf</span>
        </div>

        <div className="relative ml-auto w-full sm:w-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search document…"
            className="h-8 pl-8 pr-14 text-sm"
            aria-label="Search document"
          />
          {query && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
              {matchCount} {matchCount === 1 ? "match" : "matches"}
            </span>
          )}
        </div>

        <Separator orientation="vertical" className="hidden h-6 sm:block" />

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
            disabled={zoomIdx === 0}
            aria-label="Zoom out"
          >
            <ZoomOut className="size-4" />
          </Button>
          <span className="w-11 text-center text-xs font-medium tabular-nums text-muted-foreground">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() =>
              setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))
            }
            disabled={zoomIdx === ZOOM_STEPS.length - 1}
            aria-label="Zoom in"
          >
            <ZoomIn className="size-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="hidden h-6 sm:block" />

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Fullscreen"
          >
            <Maximize2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label="Download PDF"
          >
            <Download className="size-4" />
          </Button>
        </div>
      </div>

      {/* Document canvas */}
      <div className="flex-1 overflow-auto bg-muted/60 p-4 md:p-8">
        <div
          className="mx-auto bg-card shadow-sm ring-1 ring-border transition-[width]"
          style={{
            width: `${(zoom / 100) * 100}%`,
            maxWidth: zoom <= 100 ? "51rem" : "none",
          }}
        >
          <div className="aspect-[8.5/11] origin-top p-8 md:p-12">
            <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Confidential
              </span>
              <span className="text-[10px] text-muted-foreground">
                {contract.id}
              </span>
            </div>

            <h3 className="mb-6 text-balance text-center text-lg font-semibold text-foreground">
              {highlight(current.heading, query)}
            </h3>

            <div className="space-y-5">
              {current.clauses.map((clause) => (
                <div key={clause.num} className="space-y-1.5">
                  <h4 className="text-sm font-semibold text-foreground">
                    <span className="mr-2 text-muted-foreground">
                      {clause.num}
                    </span>
                    {highlight(clause.title, query)}
                  </h4>
                  <p className="text-justify text-[13px] leading-relaxed text-muted-foreground">
                    {highlight(clause.body, query)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <span className="text-[10px] text-muted-foreground">
                Page {page} of {contract.pages}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Page navigation */}
      <div className="flex items-center justify-between gap-3 border-t border-border bg-card px-3 py-2.5">
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>

        <div className="flex items-center gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={cn(
                "size-2.5 rounded-full transition-colors",
                page === i + 1
                  ? "bg-primary"
                  : "bg-border hover:bg-muted-foreground/50",
              )}
              aria-label={`Go to page ${i + 1}`}
              aria-current={page === i + 1 ? "page" : undefined}
            />
          ))}
          <span className="ml-2 text-xs text-muted-foreground">
            Section {page} / {total}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => setPage((p) => Math.min(total, p + 1))}
          disabled={page === total}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </Card>
  );
}
