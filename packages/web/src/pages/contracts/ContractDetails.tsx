import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badges";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  contractDetails,
  contractPagesById,
  contractTimelineById,
  internalNotesById,
} from "@/lib/data";
import type { ContractStatus } from "@/lib/data";
import {
  ChevronRight,
  Pencil,
  ChevronDown,
  Link2,
  Download,
  Clock,
  FileText,
  CircleDot,
  Sparkles,
  ScrollText,
  Search,
  MoreHorizontal,
} from "lucide-react";
import { ContractMetadata } from "@/components/contracts/ContractMetaData";
import { PdfViewer } from "@/components/contracts/PdfViewer";
import { ContractInsights } from "@/components/contracts/ContractInsights";
import { ContractTimeline } from "@/components/contracts/ContractTimeline";

const statuses: ContractStatus[] = ["Draft", "Active", "Expired", "Terminated"];

// Temporary: mock detail data only exists for a handful of contract ids;
// unknown ids fall back to the default contract below.
// When the backend is ready, replace this with an API call:
//   const { data } = useQuery(['contract', id], () => api.getContract(id));
const DEFAULT_CONTRACT_ID = "CTR-10470";

function useContractData(id: string | undefined) {
  const key = id && contractDetails[id] ? id : DEFAULT_CONTRACT_ID;
  return {
    contract: contractDetails[key],
    pages: contractPagesById[key],
    timeline: contractTimelineById[key],
    notes: internalNotesById[key],
  };
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { contract: c, pages, timeline, notes } = useContractData(id);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-1.5 text-sm text-muted-foreground"
        aria-label="Breadcrumb"
      >
        <Link
          to="/dashboard"
          className="transition-colors hover:text-foreground"
        >
          Dashboard
        </Link>
        <ChevronRight className="size-3.5" />
        <Link
          to="/contracts"
          className="transition-colors hover:text-foreground"
        >
          Contracts
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="truncate font-medium text-foreground">{c.name}</span>
      </nav>

      {/* Page header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
              {c.name}
            </h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <FileText className="size-3.5" />
              {c.id} · {c.type}
            </span>
            <span className="flex items-center gap-1.5">
              <CircleDot className="size-3.5" />
              {c.counterparty}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              Last updated {c.lastUpdated}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  className="gap-2 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary"
                />
              }
            >
              <span className="flex items-center gap-2">
                <Sparkles className="size-4" />
                AI Tools
                <ChevronDown className="size-4" />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>AI Tools</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => navigate(`/contracts/${c.id}/analysis`)}
                >
                  <ScrollText className="size-4 text-muted-foreground" />
                  Analyze Contract
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => navigate(`/contracts/${c.id}/investigator`)}
                >
                  <Search className="size-4 text-muted-foreground" />
                  Clause Investigator
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" className="gap-2">
            <Pencil className="size-4" />
            Edit Contract
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" className="gap-2" />}
            >
              <span className="flex items-center gap-2">
                Status
                <StatusBadge status={c.status} />
                <ChevronDown className="size-4 text-muted-foreground" />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Set contract status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {statuses.map((s) => (
                  <DropdownMenuItem key={s} className="gap-2">
                    <StatusBadge status={s} />
                    {s === c.status && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        Current
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="More actions"
                />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuItem className="gap-2">
                  <Download className="size-4 text-muted-foreground" />
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <Link2 className="size-4 text-muted-foreground" />
                  Generate Witness Link
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 3-column workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <ContractMetadata contract={c} />
        </div>
        <div className="lg:col-span-6">
          <PdfViewer contract={c} pages={pages} />
        </div>
        <div className="lg:col-span-3">
          <ContractInsights contract={c} notes={notes} />
        </div>
      </div>

      {/* Bottom: activity timeline */}
      <ContractTimeline events={timeline} />
    </div>
  );
}
