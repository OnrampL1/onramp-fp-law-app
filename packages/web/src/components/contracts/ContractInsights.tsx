import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Severity } from "@/lib/data";
import {
  Sparkles,
  ShieldAlert,
  Quote,
  MessageSquare,
  Send,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeverityBadge } from "@/components/ui/badges";
import { isAxiosError } from "axios";
import {
  useRiskOverview,
  useSummaryOverview,
} from "@/hooks/useContractAnalysis";
import type { ContractDetailResponse } from "@/types/contracts";
import { cn, formatRelativeTime, formatSummaryParagraphs } from "@/lib/utils";
import type { RiskOverviewDto } from "@/types/ai-analysis";
import { useAuth } from "@/hooks/useAuth";
import {
  useContractNotes,
  useCreateContractNote,
  useDeleteContractNote,
  useUpdateContractNote,
} from "@/hooks/useContractNotes";
import type { ContractNoteDto } from "@/types/contract-note";

type ContractInsightsProps = {
  contractId: string;
  processingStatus: ContractDetailResponse["processingStatus"];
};

function analysisQueryEnabled(
  processingStatus: ContractDetailResponse["processingStatus"],
): boolean {
  return (
    processingStatus === "AI_PENDING" ||
    processingStatus === "AI_COMPLETED" ||
    processingStatus === "AI_FAILED"
  );
}

export function ContractInsights({
  contractId,
  processingStatus,
}: ContractInsightsProps) {
  const riskOverview = useRiskOverview(contractId, processingStatus);
  const riskCount = riskOverview.data?.redFlags.length;
  return (
    <Card className="flex h-[calc(100svh-9rem)] min-h-[640px] flex-col overflow-hidden p-0">
      <Tabs
        defaultValue="summary"
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="border-b border-border p-3">
          <TabsList className="w-full">
            <TabsTrigger value="summary" className="min-w-0 flex-1 gap-1.5 overflow-hidden">
              <Sparkles className="size-4 shrink-0" />
              <span className="hidden truncate sm:inline">Summary</span>
            </TabsTrigger>
            <TabsTrigger value="risk" className="min-w-0 flex-1 gap-1.5 overflow-hidden">
              <ShieldAlert className="size-4 shrink-0" />
              <span className="truncate">Risk</span>
              {riskCount !== undefined && (
                <Badge
                  variant="secondary"
                  className="ml-0.5 h-5 shrink-0 px-1.5 text-[11px]"
                >
                  {riskCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="notes" className="min-w-0 flex-1 gap-1.5 overflow-hidden">
              <MessageSquare className="size-4 shrink-0" />
              <span className="truncate">Notes</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="summary"
          className="min-h-0 flex-1 overflow-y-auto p-4"
        >
          <AiSummary
            contractId={contractId}
            processingStatus={processingStatus}
          />
        </TabsContent>
        <TabsContent
          value="risk"
          className="min-h-0 flex-1 overflow-y-auto p-4"
        >
          <RiskAnalysis overview={riskOverview} />
        </TabsContent>
        <TabsContent value="notes" className="flex min-h-0 flex-1 flex-col p-0">
          <InternalNotes contractId={contractId} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function AnalysisEmptyState({
  processingStatus,
  icon: Icon,
}: {
  processingStatus: ContractDetailResponse["processingStatus"];
  icon: React.ComponentType<{ className?: string }>;
}) {
  if (processingStatus === "EXTRACTION_FAILED") {
    return (
      <EmptyMessage
        icon={AlertCircle}
        text="Text extraction failed for this contract, so AI analysis could not run."
      />
    );
  }

  if (
    processingStatus === "PENDING_EXTRACTION" ||
    processingStatus === "EXTRACTION_COMPLETED"
  ) {
    return (
      <EmptyMessage
        icon={Icon}
        text="AI analysis hasn't been run for this contract yet."
      />
    );
  }

  if (processingStatus === "AI_PENDING") {
    return (
      <EmptyMessage icon={Loader2} text="AI analysis is in progress..." spin />
    );
  }

  // AI_COMPLETED or AI_FAILED, but this specific analysis type has no
  // completed row (e.g. only the other of Summary/Risk succeeded).
  return (
    <EmptyMessage
      icon={AlertCircle}
      text="This analysis isn't available yet - it may have failed. Try re-running analysis from the AI Tools menu."
    />
  );
}

function EmptyMessage({
  icon: Icon,
  text,
  spin,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  spin?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
      <Icon className={cn("size-5", spin && "animate-spin")} />
      <p className="max-w-[220px] text-pretty">{text}</p>
    </div>
  );
}

function AiSummary({
  contractId,
  processingStatus,
}: {
  contractId: string;
  processingStatus: ContractDetailResponse["processingStatus"];
}) {
  const { data, isLoading, isError, error } = useSummaryOverview(
    contractId,
    processingStatus,
  );
  if (!analysisQueryEnabled(processingStatus)) {
    return (
      <AnalysisEmptyState processingStatus={processingStatus} icon={Sparkles} />
    );
  }

  if (isLoading) {
    return <EmptyMessage icon={Loader2} text="Loading summary..." spin />;
  }

  if (isError) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return (
        <AnalysisEmptyState
          processingStatus={processingStatus}
          icon={Sparkles}
        />
      );
    }
    return (
      <EmptyMessage icon={AlertCircle} text="Couldn't load the AI summary." />
    );
  }
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-accent/60 p-3">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          AI-generated summary. Review against the source document before
          relying on these terms.
        </p>
      </div>
      <div className="space-y-3">
        {formatSummaryParagraphs(data?.text ?? "").map((paragraph, i) => (
          <p
            key={i}
            className="text-[13px] leading-relaxed text-muted-foreground"
          >
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}

const SEVERITY_LABELS: Record<
  RiskOverviewDto["redFlags"][number]["severity"],
  Severity
> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

function RiskAnalysis({
  overview,
}: {
  overview: ReturnType<typeof useRiskOverview>;
}) {
  const { data, isLoading, isError, error } = overview;

  if (isLoading) {
    return <EmptyMessage icon={Loader2} text="Loading risk analysis..." spin />;
  }

  if (isError) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return (
        <EmptyMessage
          icon={ShieldAlert}
          text="No completed risk analysis for this contract yet."
        />
      );
    }
    return (
      <EmptyMessage icon={AlertCircle} text="Couldn't load risk analysis." />
    );
  }

  if (!data || data.redFlags.length === 0) {
    return (
      <EmptyMessage
        icon={ShieldAlert}
        text="No risk flags were identified in this contract."
      />
    );
  }

  return (
    <div className="space-y-3">
      {data.redFlags.map((risk, i) => (
        <div key={i} className="rounded-lg border border-border p-3.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {risk.category}
            </h3>
            <SeverityBadge severity={SEVERITY_LABELS[risk.severity]} />
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            {risk.description}
          </p>
          <div className="mt-3 rounded-md border-l-2 border-primary/40 bg-muted/60 p-2.5">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <Quote className="size-3" />
              Source
            </div>
            <p className="text-[12px] italic leading-relaxed text-foreground/80">
              &ldquo;{risk.sourceText}&rdquo;
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function initialsFor(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

function InternalNotes({ contractId }: { contractId: string }) {
  const { user } = useAuth();
  const { data, isLoading, isError } = useContractNotes(contractId);
  const createNote = useCreateContractNote(contractId);
  const updateNote = useUpdateContractNote(contractId);
  const deleteNote = useDeleteContractNote(contractId);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  function handleSend() {
    const body = draft.trim();
    if (!body) return;
    createNote.mutate(body, { onSuccess: () => setDraft("") });
  }

  function startEdit(note: ContractNoteDto) {
    setEditingId(note.id);
    setEditDraft(note.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  function saveEdit(noteId: string) {
    const body = editDraft.trim();
    if (!body) return;
    updateNote.mutate({ noteId, content: body }, { onSuccess: cancelEdit });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {isLoading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Loading notes...
          </p>
        ) : isError ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Couldn't load notes.
          </p>
        ) : data && data.items.length > 0 ? (
          data.items.map((note) =>
            editingId === note.id ? (
              <NoteEditForm
                key={note.id}
                value={editDraft}
                onChange={setEditDraft}
                onSave={() => saveEdit(note.id)}
                onCancel={cancelEdit}
                isSaving={updateNote.isPending}
              />
            ) : (
              <NoteBubble
                key={note.id}
                note={note}
                canEdit={note.authorId === user?.id}
                canDelete={
                  note.authorId === user?.id ||
                  user?.role === "OWNER" ||
                  user?.role === "ADMIN"
                }
                onEdit={() => startEdit(note)}
                onDelete={() => deleteNote.mutate(note.id)}
              />
            ),
          )
        ) : (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No notes yet.
          </p>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary text-[10px] font-semibold text-primary-foreground">
              {initialsFor(user?.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="relative flex-1">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add an internal note…"
              rows={1}
              className="min-h-9 w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 pr-10 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            <Button
              size="icon"
              className="absolute bottom-1.5 right-1.5 size-6"
              disabled={!draft.trim() || createNote.isPending}
              aria-label="Send note"
              onClick={handleSend}
            >
              <Send className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NoteEditForm({
  value,
  onChange,
  onSave,
  onCancel,
  isSaving,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="rounded-md border border-border p-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full resize-none rounded-md border border-input bg-transparent px-2 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      <div className="mt-1.5 flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSaving || !value.trim()}>
          Save
        </Button>
      </div>
    </div>
  );
}

function NoteBubble({
  note,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  note: ContractNoteDto;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Avatar className="size-7 shrink-0">
        <AvatarFallback className="bg-accent text-[10px] font-semibold text-accent-foreground">
          {initialsFor(note.authorName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium text-foreground">
            {note.authorName}
          </span>
          <span className="text-[11px] text-muted-foreground">
            · {formatRelativeTime(note.createdAt)}
          </span>
          {note.updatedAt !== note.createdAt && (
            <span className="text-[11px] text-muted-foreground/70">
              (edited)
            </span>
          )}
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          {note.content}
        </p>
        {(canEdit || canDelete) && (
          <div className="mt-1 flex gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="text-[11px] text-muted-foreground hover:text-destructive hover:underline"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
