import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RiskBadge } from "@/components/ui/badges";
import {
  conversationHistory,
  suggestedQuestions,
  type ChatMessage,
  type Conversation,
  type RiskLevel,
  type SourceRef,
} from "@/lib/data";
import { useAskInvestigator } from "@/hooks/useContractInvestigator";
import { useContractDetail } from "@/hooks/useContractDetail";
import {
  useRiskOverview,
  useSummaryOverview,
} from "@/hooks/useContractAnalysis";
import type { InvestigatorHistoryTurn } from "@/types/investigator";
import type { RiskOverviewDto } from "@/types/ai-analysis";
import { cn, formatSummaryParagraphs } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowUp,
  ChevronRight,
  Loader2,
  MessageSquare,
  Plus,
  Quote,
  Search,
  Sparkles,
  ShieldCheck,
  FileText,
} from "lucide-react";

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

const KEY_CLAUSE_DOT: Record<
  RiskOverviewDto["redFlags"][number]["severity"],
  string
> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-amber-500",
  LOW: "bg-emerald-500",
};

let idCounter = 0;
const nextId = () => `live-${Date.now()}-${idCounter++}`;

// The API returns a single combined heading string per source (e.g. "9.4
// Limitation of Liability") rather than a separate code/title pair — this
// splits it for display, mirroring the same code-extraction pattern the
// Key Clauses panel below already uses on mock data.
const HEADING_CODE_PATTERN =
  /^(ARTICLE\s+[IVXLCDM\d]+\.?|SECTION\s+\d+(\.\d+)*\.?|\d+(\.\d+){0,3}\.?)/i;

function splitHeading(
  headingPath: string | null,
  index: number,
): { clause: string; title: string } {
  if (!headingPath) {
    return { clause: `Source ${index + 1}`, title: "" };
  }
  const match = headingPath.match(HEADING_CODE_PATTERN);
  if (!match) {
    return { clause: headingPath, title: "" };
  }
  const code = match[0].trim();
  const rest = headingPath.slice(match[0].length).trim();
  return { clause: code, title: rest || code };
}

// Sent with every request per the product decision to not persist
// conversations server-side — mirrors the server's own default turn limit
// (getInvestigatorHistoryTurnLimit), which is the actual enforcement point;
// trimming here just avoids the payload growing unbounded over a long
// session.
const HISTORY_TURN_LIMIT = 3;

function toHistoryTurns(messages: ChatMessage[]): InvestigatorHistoryTurn[] {
  const turns: InvestigatorHistoryTurn[] = [];
  for (let i = 0; i < messages.length - 1; i++) {
    const current = messages[i];
    const next = messages[i + 1];
    if (current.role === "user" && next.role === "assistant") {
      turns.push({ question: current.content, answer: next.content });
    }
  }
  return turns.slice(-HISTORY_TURN_LIMIT);
}

// The backend prompt now asks for an explicit non-answer sentence instead of
// "", but that's instruction-following, not a guarantee — this is the
// last-resort backstop so a blank/whitespace-only answer never renders as an
// empty-looking chat bubble.
const NO_ANSWER_FALLBACK =
  "This contract does not appear to address that question.";

function errorMessageFor(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 409) {
      return "This contract hasn't finished indexing for Contract Investigator yet. Please try again in a moment.";
    }
    if (status === 502 || status === 503) {
      return "Contract Investigator is temporarily unavailable right now. Please try again.";
    }
    if (status === 404) {
      return "This contract could not be found.";
    }
  }
  return "Something went wrong answering that question. Please try again.";
}

export default function ContractInvestigatorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    data: contract,
    isLoading: isContractLoading,
    isError: isContractError,
  } = useContractDetail(id);
  const riskOverview = useRiskOverview(id, contract?.processingStatus);
  const summaryOverview = useSummaryOverview(id, contract?.processingStatus);

  const [conversations] = useState<Conversation[]>(conversationHistory);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const askInvestigatorMutation = useAskInvestigator(id);

  // ScrollArea (@base-ui/react/scroll-area) renders its own internal
  // scrolling viewport wrapping this content — scrollTo on the content div
  // itself is a no-op since that div was never the scrollable element.
  // scrollIntoView on a bottom sentinel works regardless, since it walks up
  // to whichever ancestor actually scrolls.
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  if (isContractLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Loading contract...
      </div>
    );
  }

  if (isContractError || !contract || !id) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Contract not found</p>
        <Link to="/contracts" className="text-primary hover:underline">
          Back to Contracts
        </Link>
      </div>
    );
  }

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

  async function send(question: string) {
    const text = question.trim();
    if (!text || thinking || !id) return;

    const userMessage: ChatMessage = {
      id: nextId(),
      role: "user",
      content: text,
    };
    const history = toHistoryTurns(messages);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setThinking(true);

    try {
      const result = await askInvestigatorMutation.mutateAsync({
        question: text,
        history,
      });
      const sources: SourceRef[] = result.sources.map((s, i) => ({
        ...splitHeading(s.headingPath, i),
        excerpt: s.excerpt,
      }));
      const assistantMessage: ChatMessage = {
        id: nextId(),
        role: "assistant",
        content:
          result.answer.trim().length > 0 ? result.answer : NO_ANSWER_FALLBACK,
        sources: sources.length > 0 ? sources : undefined,
        confidence: result.confidence,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const assistantMessage: ChatMessage = {
        id: nextId(),
        role: "assistant",
        content: errorMessageFor(error),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setThinking(false);
    }
  }

  const isEmpty = messages.length === 0 && !thinking;
  const riskScore = riskOverview.data
    ? 100 - riskOverview.data.healthScore
    : null;
  const riskLevel = riskScore !== null ? riskLevelFromScore(riskScore) : null;

  return (
    <div className="flex h-full flex-col space-y-4 pb-2">
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
        <Link
          to={`/contracts/${contract.id}`}
          className="truncate transition-colors hover:text-foreground"
        >
          {contract.title}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="truncate font-medium text-foreground">
          Contract Investigator
        </span>
      </nav>

      {/* Page header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <Sparkles className="size-5 text-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
              Contract Investigator
            </h1>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <FileText className="size-3.5" />
            {contract.title} · {contract.id}
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
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
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
                  <div ref={bottomRef} />
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
                  placeholder={`Ask anything about ${contract.title}…`}
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
                Answers are grounded in the active contract. Verify citations
                before relying on them.
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
                      {contract.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {contract.counterparty}
                    </p>
                  </div>
                </div>
              </div>

              <Separator className={"border"} />

              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Sparkles className="size-3.5" />
                  AI Summary
                </p>
                {summaryOverview.data ? (
                  <div className="space-y-2">
                    {formatSummaryParagraphs(summaryOverview.data.text).map(
                      (paragraph, i) => (
                        <p
                          key={i}
                          className="text-sm leading-relaxed text-muted-foreground text-pretty"
                        >
                          {paragraph}
                        </p>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {contract.processingStatus === "AI_PENDING"
                      ? "Analysis in progress..."
                      : "No summary available yet."}
                  </p>
                )}
              </div>

              <Separator className={"border"} />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    Risk score
                  </p>
                  {riskLevel && <RiskBadge risk={riskLevel} />}
                </div>
                {riskScore !== null ? (
                  <>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-semibold tracking-tight text-foreground">
                        {riskScore}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        / 100
                      </span>
                    </div>
                    <Progress value={riskScore} className="h-1.5" />
                    <p className="text-[11px] text-muted-foreground">
                      Higher scores indicate greater negotiation exposure.
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No risk analysis available yet.
                  </p>
                )}
              </div>

              <Separator className={"border"} />

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Key clauses
                </p>
                {riskOverview.data && riskOverview.data.redFlags.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {riskOverview.data.redFlags.slice(0, 5).map((flag, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-2"
                      >
                        <span className="truncate text-xs font-medium text-foreground">
                          {flag.category}
                        </span>
                        <span
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            KEY_CLAUSE_DOT[flag.severity],
                          )}
                          aria-label={`${flag.severity} risk`}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No flagged clauses yet.
                  </p>
                )}
              </div>

              <Separator className={"border"} />

              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full",
                    riskOverview.data ? "bg-emerald-50" : "bg-muted",
                  )}
                >
                  <ShieldCheck
                    className={cn(
                      "size-3.5",
                      riskOverview.data
                        ? "text-emerald-600"
                        : "text-muted-foreground",
                    )}
                  />
                </span>
                <div className="leading-tight">
                  <p className="text-xs font-medium text-foreground">
                    {riskOverview.data
                      ? "AI analysis complete"
                      : "AI analysis pending"}
                  </p>
                  {riskOverview.data && (
                    <p className="text-[11px] text-muted-foreground">
                      Last analyzed{" "}
                      {new Date(
                        riskOverview.data.createdAt,
                      ).toLocaleDateString()}
                    </p>
                  )}
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
          Ask plain-language questions and get answers grounded in the contract
          text, with citations to the exact clauses they came from.
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
        <AvatarFallback className="bg-muted text-[11px] font-medium">
          AR
        </AvatarFallback>
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

        {typeof message.confidence === "number" &&
        message.sources &&
        message.sources.length > 0 ? (
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
        {sources.length} source{" "}
        {sources.length === 1 ? "reference" : "references"}
      </p>
      <div className="space-y-1.5">
        {sources.map((s) => (
          <div
            key={s.clause}
            className="rounded-lg border border-border bg-card p-3"
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground">
                {s.clause}
              </span>
              <span className="text-xs font-medium text-foreground">
                {s.title}
              </span>
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
        <span className="text-xs text-muted-foreground">
          Reviewing contract clauses…
        </span>
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
