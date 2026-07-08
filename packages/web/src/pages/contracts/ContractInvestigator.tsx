import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RiskBadge } from "@/components/ui/badges";
import {
  contractDetails,
  conversationHistory,
  suggestedQuestions,
  resolveAnswer,
  type ChatMessage,
  type Conversation,
  type ContractDetail,
  type Severity,
  type RiskLevel,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowUp,
  ChevronRight,
  MessageSquare,
  Plus,
  Quote,
  Search,
  Sparkles,
  ShieldCheck,
  FileText,
} from "lucide-react";

// Temporary: mock detail data only exists for a handful of contract ids;
// unknown ids fall back to the default contract below.
// When the backend is ready, replace this with an API call:
//   const { data } = useQuery(['contract', id], () => api.getContract(id));
const DEFAULT_CONTRACT_ID = "CTR-10470";

function useInvestigatorContract(id: string | undefined): ContractDetail {
  const key = id && contractDetails[id] ? id : DEFAULT_CONTRACT_ID;
  return contractDetails[key];
}

const severityWeight: Record<Severity, number> = {
  Critical: 25,
  High: 15,
  Medium: 8,
  Low: 3,
};

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

const keyClauseDot: Record<Severity, string> = {
  Critical: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-amber-500",
  Low: "bg-emerald-500",
};

let idCounter = 0;
const nextId = () => `live-${Date.now()}-${idCounter++}`;

export default function ContractInvestigatorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const contract = useInvestigatorContract(id);

  const [conversations] = useState<Conversation[]>(conversationHistory);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo?.({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, thinking]);

  function startNewChat() {
    setActiveId(null);
    setMessages([]);
    setInput("");
    setThinking(false);
  }

  function openConversation(conv: Conversation) {
    setActiveId(conv.id);
    setMessages(conv.messages);
    setThinking(false);
  }

  function send(question: string) {
    const text = question.trim();
    if (!text || thinking) return;

    const userMessage: ChatMessage = { id: nextId(), role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setThinking(true);

    window.setTimeout(() => {
      const answer = resolveAnswer(text, contract);
      const assistantMessage: ChatMessage = {
        id: nextId(),
        role: "assistant",
        content: answer.content,
        sources: answer.sources,
        confidence: answer.confidence,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setThinking(false);
    }, 1100);
  }

  const isEmpty = messages.length === 0 && !thinking;
  const riskScore = Math.min(
    100,
    contract.riskAnalysis.reduce((sum, r) => sum + severityWeight[r.severity], 0),
  );
  const riskLevel = riskLevelFromScore(riskScore);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col space-y-4 pb-2">
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-1.5 text-sm text-muted-foreground"
        aria-label="Breadcrumb"
      >
        <Link to="/dashboard" className="transition-colors hover:text-foreground">
          Dashboard
        </Link>
        <ChevronRight className="size-3.5" />
        <Link to="/contracts" className="transition-colors hover:text-foreground">
          Contracts
        </Link>
        <ChevronRight className="size-3.5" />
        <Link
          to={`/contracts/${contract.id}`}
          className="truncate transition-colors hover:text-foreground"
        >
          {contract.name}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="truncate font-medium text-foreground">
          Clause Investigator
        </span>
      </nav>

      {/* Page header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <Sparkles className="size-5 text-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
              Clause Investigator
            </h1>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <FileText className="size-3.5" />
            {contract.name} · {contract.id}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={startNewChat}>
            <Plus className="size-4" />
            New chat
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate(`/contracts/${contract.id}`)}
          >
            <ArrowLeft className="size-4" />
            Back to Contract
          </Button>
        </div>
      </div>

      {/* Workspace: 3 columns */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        {/* Left: Conversation history */}
        <Card className="hidden min-h-0 flex-col overflow-hidden p-0 lg:flex">
          <div className="border-b border-border p-3">
            <p className="px-1 text-xs font-medium text-muted-foreground">
              Recent conversations
            </p>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-1 p-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => openConversation(conv)}
                  className={cn(
                    "group flex flex-col gap-0.5 rounded-md border border-transparent px-2.5 py-2 text-left transition-colors hover:bg-accent",
                    activeId === conv.id && "border-border bg-accent",
                  )}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{conv.title}</span>
                  </span>
                  <span className="truncate pl-5 text-xs text-muted-foreground">
                    {conv.preview}
                  </span>
                  <span className="pl-5 text-[11px] text-muted-foreground/70">
                    {conv.updatedAt}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Center: Chat */}
        <Card className="flex min-h-0 flex-col overflow-hidden p-0">
          <ScrollArea className="min-h-0 flex-1">
            <div
              ref={scrollRef}
              className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4"
            >
              {isEmpty ? (
                <EmptyState onPick={send} />
              ) : (
                <>
                  {messages.map((m) =>
                    m.role === "user" ? (
                      <UserBubble key={m.id} message={m} />
                    ) : (
                      <AssistantBubble key={m.id} message={m} />
                    ),
                  )}
                  {thinking ? <ThinkingBubble /> : null}
                </>
              )}
            </div>
          </ScrollArea>

          {/* Composer */}
          <div className="border-t border-border p-3">
            <div className="mx-auto w-full max-w-2xl">
              {!isEmpty ? (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {suggestedQuestions.slice(0, 3).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => send(q)}
                      className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              ) : null}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-end gap-2 rounded-xl border border-input bg-card p-2 shadow-sm focus-within:ring-[3px] focus-within:ring-ring/50"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  rows={1}
                  placeholder={`Ask anything about ${contract.name}…`}
                  className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 pl-2 text-sm outline-none placeholder:text-muted-foreground"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="size-9 shrink-0"
                  disabled={!input.trim() || thinking}
                >
                  <ArrowUp className="size-4" />
                  <span className="sr-only">Send message</span>
                </Button>
              </form>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Answers are grounded in the active contract. Verify citations before relying on them.
              </p>
            </div>
          </div>
        </Card>

        {/* Right: Contract context */}
        <Card className="hidden overflow-hidden p-0 xl:block">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-5 p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Contract context
                </p>
                <div className="mt-2 flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 p-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <FileText className="size-4.5 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {contract.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {contract.counterparty}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                      <span className="rounded bg-muted px-1.5 py-0.5">{contract.type}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5">{contract.value}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5">
                        {contract.pages} pages
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Sparkles className="size-3.5" />
                  AI summary
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                  {contract.aiSummary.keyObligations[0]}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Risk score</p>
                  <RiskBadge risk={riskLevel} />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold tracking-tight text-foreground">
                    {riskScore}
                  </span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
                <Progress value={riskScore} className="h-1.5" />
                <p className="text-[11px] text-muted-foreground">
                  Higher scores indicate greater negotiation exposure.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Key clauses</p>
                <div className="flex flex-col gap-1.5">
                  {contract.riskAnalysis.slice(0, 5).map((r) => (
                    <div
                      key={r.section}
                      className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground">
                          {r.section.match(/Section\s+[\d.]+/)?.[0] ?? r.section}
                        </span>
                        <span className="truncate text-xs font-medium text-foreground">
                          {r.title}
                        </span>
                      </div>
                      <span
                        className={cn("size-2 shrink-0 rounded-full", keyClauseDot[r.severity])}
                        aria-label={`${r.severity} risk`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                  <ShieldCheck className="size-3.5 text-emerald-600" />
                </span>
                <div className="leading-tight">
                  <p className="text-xs font-medium text-foreground">
                    AI analysis complete
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Last updated {contract.lastUpdated}
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Sparkles className="size-6" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-balance text-xl font-semibold tracking-tight text-foreground">
          Investigate this contract
        </h2>
        <p className="mx-auto max-w-md text-pretty text-sm text-muted-foreground">
          Ask plain-language questions and get answers grounded in the contract text, with
          citations to the exact clauses they came from.
        </p>
      </div>
      <div className="grid w-full max-w-lg gap-2 sm:grid-cols-2">
        {suggestedQuestions.map((q, i) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            className={cn(
              "group flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3.5 py-3 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
              i === suggestedQuestions.length - 1 && "sm:col-span-2",
            )}
          >
            <span className="flex items-center gap-2">
              <Search className="size-4 shrink-0 text-muted-foreground group-hover:text-accent-foreground" />
              {q}
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  );
}

function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-end gap-3">
      <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
        {message.content}
      </div>
      <Avatar className="mt-0.5 size-7 shrink-0">
        <AvatarFallback className="bg-muted text-[11px] font-medium">AR</AvatarFallback>
      </Avatar>
    </div>
  );
}

function AssistantBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Sparkles className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="text-sm leading-relaxed text-foreground">
          <RichText text={message.content} />
        </div>

        {message.sources && message.sources.length > 0 ? (
          <SourceList sources={message.sources} />
        ) : null}

        {typeof message.confidence === "number" ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            <span>Grounded answer · {message.confidence}% confidence</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SourceList({ sources }: { sources: ChatMessage["sources"] }) {
  if (!sources) return null;
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <FileText className="size-3.5" />
        {sources.length} source {sources.length === 1 ? "reference" : "references"}
      </p>
      <div className="space-y-1.5">
        {sources.map((s) => (
          <div key={s.clause} className="rounded-lg border border-border bg-card p-3">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground">
                {s.clause}
              </span>
              <span className="text-xs font-medium text-foreground">{s.title}</span>
            </div>
            <div className="flex gap-2 border-l-2 border-border pl-2 text-xs italic text-muted-foreground">
              <Quote className="size-3 shrink-0 opacity-60" />
              <span className="text-pretty">{s.excerpt}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Sparkles className="size-3.5" />
      </div>
      <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3">
        <span className="flex gap-1">
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
        </span>
        <span className="text-xs text-muted-foreground">Reviewing contract clauses…</span>
      </div>
    </div>
  );
}

// Lightweight inline markdown: supports **bold** only.
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="text-pretty">
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}
