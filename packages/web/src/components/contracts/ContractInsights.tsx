import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ContractDetail, InternalNote } from "@/lib/data";
import {
  Sparkles,
  ListChecks,
  CreditCard,
  DoorOpen,
  ShieldAlert,
  Quote,
  MessageSquare,
  Send,
  CornerDownRight,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeverityBadge } from "@/components/ui/badges";

type ContractInsightsProps = {
  contract: ContractDetail;
  notes: InternalNote[];
};

export function ContractInsights({ contract, notes }: ContractInsightsProps) {
  return (
    <Card className="flex h-[calc(100svh-9rem)] min-h-[640px] flex-col overflow-hidden p-0">
      <Tabs
        defaultValue="summary"
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <div className="border-b border-border p-3">
          <TabsList className="w-full">
            <TabsTrigger value="summary" className="flex-1 gap-1.5">
              <Sparkles className="size-4" />
              {/* <span className="hidden sm:inline">AI Summary</span> */}
              <span className="hidden sm:inline">Summary</span>
            </TabsTrigger>
            <TabsTrigger value="risk" className="flex-1 gap-1.5">
              <ShieldAlert className="size-4" />
              Risk
              <Badge
                variant="secondary"
                className="ml-0.5 h-5 px-1.5 text-[11px]"
              >
                {contract.riskAnalysis.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex-1 gap-1.5">
              <MessageSquare className="size-4" />
              Notes
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="summary"
          className="min-h-0 flex-1 overflow-y-auto p-4"
        >
          <AiSummary contract={contract} />
        </TabsContent>
        <TabsContent
          value="risk"
          className="min-h-0 flex-1 overflow-y-auto p-4"
        >
          <RiskAnalysis contract={contract} />
        </TabsContent>
        <TabsContent value="notes" className="flex min-h-0 flex-1 flex-col p-0">
          <InternalNotes notes={notes} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}

function AiSummary({ contract }: { contract: ContractDetail }) {
  const s = contract.aiSummary;
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-accent/60 p-3">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          AI-generated summary based on analysis of all {contract.pages} pages.
          Review against the source document before relying on these terms.
        </p>
      </div>

      <SummaryBlock
        icon={ListChecks}
        title="Key Obligations"
        items={s.keyObligations}
      />
      <Separator />
      <SummaryBlock
        icon={CreditCard}
        title="Payment Terms"
        items={s.paymentTerms}
      />
      <Separator />
      <SummaryBlock
        icon={DoorOpen}
        title="Termination Terms"
        items={s.terminationTerms}
      />
    </div>
  );
}

function SummaryBlock({
  icon: Icon,
  title,
  items,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: string[];
}) {
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Icon className="size-4" />
        </span>
        {title}
      </h3>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex gap-2.5 text-[13px] leading-relaxed text-muted-foreground"
          >
            <span
              className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60"
              aria-hidden
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RiskAnalysis({ contract }: { contract: ContractDetail }) {
  return (
    <div className="space-y-3">
      {contract.riskAnalysis.map((risk) => (
        <div key={risk.title} className="rounded-lg border border-border p-3.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {risk.title}
            </h3>
            <SeverityBadge severity={risk.severity} />
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            {risk.explanation}
          </p>
          <div className="mt-3 rounded-md border-l-2 border-primary/40 bg-muted/60 p-2.5">
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <Quote className="size-3" />
              {risk.section}
            </div>
            <p className="text-[12px] italic leading-relaxed text-foreground/80">
              &ldquo;{risk.excerpt}&rdquo;
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function InternalNotes({ notes }: { notes: InternalNote[] }) {
  const [draft, setDraft] = useState("");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {notes.map((note) => (
          <NoteThread key={note.id} note={note} />
        ))}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary text-[10px] font-semibold text-primary-foreground">
              AR
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
              disabled={!draft.trim()}
              aria-label="Send note"
            >
              <Send className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NoteThread({ note }: { note: InternalNote }) {
  return (
    <div>
      <NoteBubble
        author={note.author}
        initials={note.initials}
        role={note.role}
        time={note.time}
        body={note.body}
      />
      {note.replies && note.replies.length > 0 && (
        <div className="mt-3 space-y-3 border-l-2 border-border pl-3">
          {note.replies.map((reply) => (
            <div key={reply.id} className="flex items-start gap-1.5">
              <CornerDownRight className="mt-2 size-3.5 shrink-0 text-muted-foreground/60" />
              <div className="flex-1">
                <NoteBubble
                  author={reply.author}
                  initials={reply.initials}
                  role={reply.role}
                  time={reply.time}
                  body={reply.body}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NoteBubble({
  author,
  initials,
  role,
  time,
  body,
}: {
  author: string;
  initials: string;
  role: string;
  time: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Avatar className="size-7 shrink-0">
        <AvatarFallback className="bg-accent text-[10px] font-semibold text-accent-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium text-foreground">{author}</span>
          <span className="text-[11px] text-muted-foreground">{role}</span>
          <span className="text-[11px] text-muted-foreground">· {time}</span>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
    </div>
  );
}
