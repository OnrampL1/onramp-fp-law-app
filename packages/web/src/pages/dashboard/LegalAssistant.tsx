import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAskAssistant } from "@/hooks/useLegalAssistant";
import type { AskHistoryTurn, AssistantSource } from "@/types/legal-assistant";
import { cn } from "@/lib/utils";
import {
  readPersistedThreads,
  writePersistedThreads,
} from "@/lib/chat-session-storage";
import {
  ArrowUp,
  ChevronRight,
  FileText,
  Info,
  MessageSquare,
  Plus,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: AssistantSource[];
  confidence?: number;
  // Distinguishes "the Assistant answered but found nothing relevant"
  // (sources deliberately empty, per the synthesis prompt's own
  // instruction) from "the Assistant answered and cited something."
  noMatchingSource?: boolean;
}

let idCounter = 0;
const nextId = () => `live-${Date.now()}-${idCounter++}`;

// Multiple chat threads, persisted to sessionStorage only - they survive
// navigating away from this page and back within the same tab, but not a
// closed tab or a different device. Real cross-session, cross-device
// history would need a server-side Conversation model, which is a
// deliberate, repeated architectural decision this project has not made
// (see AI_ROADMAP.md Section 11's "Not built" list) - out of scope here on
// purpose, not an oversight.
interface ChatThread {
  id: string;
  messages: ChatMessage[];
}

const THREADS_STORAGE_KEY = "legal-assistant:threads";

function createEmptyThread(): ChatThread {
  return { id: nextId(), messages: [] };
}

// A thread has no title of its own until it has a first question to name
// itself after - same idea most chat UIs use for an unnamed draft.
function threadTitle(thread: ChatThread): string {
  const firstQuestion = thread.messages.find((m) => m.role === "user")?.content;
  if (!firstQuestion) return "New chat";
  return firstQuestion.length > 60 ? `${firstQuestion.slice(0, 60)}…` : firstQuestion;
}

// Sent with every request per the same product decision as Clause
// Investigator (contracts/ContractInvestigator.tsx): conversations aren't
// persisted server-side, so history is reconstructed and resent, trimmed to
// mirror the server's own default turn limit.
const HISTORY_TURN_LIMIT = 3;

function toHistoryTurns(messages: ChatMessage[]): AskHistoryTurn[] {
  const turns: AskHistoryTurn[] = [];
  for (let i = 0; i < messages.length - 1; i++) {
    const current = messages[i];
    const next = messages[i + 1];
    if (current.role === "user" && next.role === "assistant") {
      turns.push({ question: current.content, answer: next.content });
    }
  }
  return turns.slice(-HISTORY_TURN_LIMIT);
}

// Safety-net copy only - the synthesis prompt itself is instructed to
// always return a non-empty explanatory sentence when the evidence it was
// given doesn't address the question, so this should rarely be seen.
const NO_ANSWER_FALLBACK =
  "I couldn't find enough grounded information to answer that reliably.";

function errorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.error as string | undefined;
    if (status === 502 || status === 503) {
      return (
        serverMessage ??
        "The Assistant is temporarily unavailable right now. Please try again."
      );
    }
  }
  return "Something went wrong answering that question. Please try again.";
}

// Arabic Unicode block - used only to decide text direction per bubble/
// excerpt, not for any content transformation. The Assistant's answers may
// draw on Arabic-language Lebanese legal texts even when the question
// itself is in English, so this is checked per string rather than assumed.
const ARABIC_PATTERN = /[؀-ۿ]/;
function textDir(text: string): "rtl" | "ltr" {
  return ARABIC_PATTERN.test(text) ? "rtl" : "ltr";
}

// Kept to questions verified live against real indexed data, not merely
// plausible-sounding ones - a suggested prompt that reliably returns "I
// couldn't find enough grounded information" undersells the feature on
// first contact. Revisit once the Legal Knowledge Base corpus is ingested
// in this environment (currently empty) to bring back a Lebanese-law example.
const SUGGESTED_QUESTIONS = [
  "What does our organization's standard confidentiality policy say?",
  "Which of our contracts are currently active?",
];

function initialThreads(): ChatThread[] {
  const persisted = readPersistedThreads<ChatThread>(THREADS_STORAGE_KEY);
  return persisted && persisted.length > 0 ? persisted : [createEmptyThread()];
}

export default function LegalAssistantPage() {
  const [threads, setThreads] = useState<ChatThread[]>(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState<string>(() => threads[0].id);
  const [input, setInput] = useState("");
  // The one thread (if any) currently awaiting a response - at most one
  // request in flight at a time, kept simple rather than letting several
  // threads load concurrently. Tracked by id, not a plain boolean, so the
  // "Thinking…" bubble only appears in the thread actually waiting, not
  // wherever the user has switched to since sending.
  const [pendingThreadId, setPendingThreadId] = useState<string | null>(null);

  const askAssistantMutation = useAskAssistant();

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? threads[0];
  const isActiveThreadPending = pendingThreadId === activeThread.id;
  const isEmpty = activeThread.messages.length === 0 && !isActiveThreadPending;
  // The current draft (a thread with no messages yet) doesn't belong in a
  // history list until it has something to show - matches how most chat
  // apps don't list an unsent "New chat" as a real conversation.
  const historyThreads = threads.filter((t) => t.messages.length > 0);

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeThread.messages, isActiveThreadPending]);

  useEffect(() => {
    writePersistedThreads(THREADS_STORAGE_KEY, threads);
  }, [threads]);

  function updateThread(
    threadId: string,
    updater: (messages: ChatMessage[]) => ChatMessage[],
  ) {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, messages: updater(t.messages) } : t)),
    );
  }

  function startNewChat() {
    // Don't stack up empty drafts - if the active thread is already blank,
    // there's nothing to switch to that isn't already showing.
    if (activeThread.messages.length === 0) {
      setInput("");
      return;
    }
    const thread = createEmptyThread();
    setThreads((prev) => [thread, ...prev]);
    setActiveThreadId(thread.id);
    setInput("");
  }

  function switchThread(id: string) {
    setActiveThreadId(id);
    setInput("");
  }

  async function send(question: string) {
    const text = question.trim();
    if (!text || pendingThreadId) return;

    // Captured once, up front - if the user switches threads while this
    // request is in flight, the answer must still land in the thread it
    // was actually asked from, not wherever activeThreadId points to by
    // the time the response comes back.
    const targetThreadId = activeThreadId;
    setInput("");
    setPendingThreadId(targetThreadId);

    const userMessage: ChatMessage = {
      id: nextId(),
      role: "user",
      content: text,
    };
    const targetThread = threads.find((t) => t.id === targetThreadId);
    const history = toHistoryTurns(targetThread?.messages ?? []);
    updateThread(targetThreadId, (msgs) => [...msgs, userMessage]);

    try {
      const result = await askAssistantMutation.mutateAsync({
        question: text,
        history,
      });
      const assistantMessage: ChatMessage = {
        id: nextId(),
        role: "assistant",
        content:
          result.answer.trim().length > 0 ? result.answer : NO_ANSWER_FALLBACK,
        sources: result.sources.length > 0 ? result.sources : undefined,
        confidence: result.confidence,
        noMatchingSource: result.sources.length === 0,
      };
      updateThread(targetThreadId, (msgs) => [...msgs, assistantMessage]);
    } catch (error) {
      updateThread(targetThreadId, (msgs) => [
        ...msgs,
        { id: nextId(), role: "assistant", content: errorMessage(error) },
      ]);
    } finally {
      setPendingThreadId((current) => (current === targetThreadId ? null : current));
    }
  }

  return (
    // h-full, not a hardcoded h-[calc(100vh-4rem)] guess: this page is a
    // direct child of AppLayout's <main className="flex-1 overflow-y-auto
    // p-6">, which already has a definite height (flex-1 inside SidebarInset's
    // h-screen flex column). The old calc() only subtracted the header's
    // height, never main's own p-6 padding (48px), so the page was
    // consistently ~48px taller than the space actually available - just
    // enough for the outer <main> to need to scroll and clip the last few
    // pixels of content. h-full fills exactly what the parent's content box
    // provides, padding already excluded, with nothing to keep in sync by
    // hand if the header height or main's padding ever change.
    <div className="flex h-full flex-col space-y-4 pb-2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <Sparkles className="size-5 text-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
              Legal Assistant
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={startNewChat}>
            <Plus className="size-4" />
            New chat
          </Button>
        </div>
      </div>

      {/* 2-column workspace: history rail + chat, same pattern as Clause
          Investigator (ContractInvestigator.tsx) minus that page's
          contract-context column, which has nothing to mirror here. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Left: Recent conversations */}
        <Card className="hidden min-h-0 flex-col overflow-hidden p-0 lg:flex">
          <div className="border-b border-border p-3">
            <p className="px-1 text-xs font-medium text-muted-foreground">
              Recent conversations
            </p>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            {historyThreads.length === 0 ? (
              <HistoryEmptyState />
            ) : (
              <div className="flex flex-col gap-1 p-2">
                {historyThreads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => switchThread(thread.id)}
                    className={cn(
                      "group flex flex-col gap-0.5 rounded-md border border-transparent px-2.5 py-2 text-left transition-colors hover:bg-accent",
                      thread.id === activeThread.id &&
                        "border-border bg-accent",
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
                      <span
                        dir={textDir(threadTitle(thread))}
                        className="truncate"
                      >
                        {threadTitle(thread)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Right: Chat */}
        <Card className="flex min-h-0 flex-col overflow-hidden p-0">
          {/* Scoped to this page only, not the shared ScrollArea primitive -
              hides the visible scrollbar thumb (targeted by its data-slot,
              likely the stray "nub" visible near the top of the empty state
              in earlier screenshots) while leaving wheel/touch/keyboard
              scrolling fully working via the underlying native viewport. */}
          <ScrollArea className="min-h-0 flex-1 [&_[data-slot=scroll-area-scrollbar]]:hidden">
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
              {isEmpty ? (
                <EmptyState onPick={send} />
              ) : (
                <>
                  {activeThread.messages.map((m) =>
                    m.role === "user" ? (
                      <UserBubble key={m.id} message={m} />
                    ) : (
                      <AssistantBubble key={m.id} message={m} />
                    ),
                  )}
                  {isActiveThreadPending ? <ThinkingBubble /> : null}
                  <div ref={bottomRef} />
                </>
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-border p-3">
            {/* Wider than the message column above (max-w-2xl) so the
                disclaimer below fits on one line instead of wrapping. */}
            <div className="mx-auto w-full max-w-2xl">
              {!isEmpty ? (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      dir={textDir(q)}
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
                  dir="auto"
                  placeholder="Ask anything about your contracts, organization, or Lebanese law…"
                  className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 pl-2 text-sm outline-none placeholder:text-muted-foreground"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="size-9 shrink-0"
                  disabled={!input.trim() || pendingThreadId !== null}
                >
                  <ArrowUp className="size-4" />
                  <span className="sr-only">Send message</span>
                </Button>
              </form>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Answers may draw on your contracts, your organization's indexed
              documents, and Lebanese legal texts. This is not legal advice -
              verify citations before relying on them.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function HistoryEmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <div className="flex size-9 items-center justify-center rounded-full bg-muted">
        <MessageSquare className="size-4 text-muted-foreground" />
      </div>
      <p className="text-xs text-muted-foreground">No chats yet</p>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Sparkles className="size-6" />
      </div>
      <h2 className="text-balance text-xl font-semibold tracking-tight text-foreground">
        Ask your AI Assistant
      </h2>
      {/* No max-w cap of its own - uses the full width of its parent
          (the message column, max-w-2xl) so each card gets more room and
          wraps less. */}
      <div className="grid w-full gap-2 sm:grid-cols-2">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            className="group flex items-start justify-between gap-2 rounded-lg border border-border bg-card px-3.5 py-3 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <span className="flex min-w-0 items-start gap-2">
              <Search className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover:text-accent-foreground" />
              {/* dir scoped to the text alone, not the whole button - an
                  Arabic question stays right-aligned on its own line
                  without mirroring the icon/chevron layout the other
                  three cards use, which read as a broken/inconsistent
                  card when the whole row flipped. No truncate - the full
                  question should always be readable, not cut off. */}
              <span dir={textDir(q)} className="text-pretty">
                {q}
              </span>
            </span>
            <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  );
}

function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-end gap-3">
      <div
        dir={textDir(message.content)}
        className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
      >
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
        <div
          dir={textDir(message.content)}
          className="text-sm leading-relaxed text-foreground"
        >
          <RichText text={message.content} />
        </div>

        {message.sources && message.sources.length > 0 ? (
          <SourceList sources={message.sources} />
        ) : null}

        {message.noMatchingSource ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="size-3.5" />
            <span>No matching source found for this question.</span>
          </div>
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

function SourceList({ sources }: { sources: AssistantSource[] }) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <FileText className="size-3.5" />
        {sources.length} source{" "}
        {sources.length === 1 ? "reference" : "references"}
      </p>
      <div className="space-y-1.5">
        {sources.map((source) => (
          <AssistantSourceCard key={source.id} source={source} />
        ))}
      </div>
    </div>
  );
}

// One unified source card, replacing the old per-corpus OrgBrainSourceCard/
// LegalKbSourceCard - AssistantSource is deliberately flatter than those two
// shapes (packages/api/src/types/assistant.types.ts's AssistantSourceDto),
// so one rendering covers a contract clause, an organization document, a
// Legal Knowledge Base article, or a risk-analysis flag alike, distinguished
// only by the `capability` badge.
function AssistantSourceCard({ source }: { source: AssistantSource }) {
  const excerptDir = textDir(source.excerpt);
  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
          {source.capability}
        </span>
        <span className="text-xs font-medium text-foreground">
          {source.label}
        </span>
      </div>
      <div
        dir={excerptDir}
        className={cn(
          "flex gap-2 text-xs italic text-muted-foreground",
          excerptDir === "rtl"
            ? "border-r-2 border-border pr-2 text-right"
            : "border-l-2 border-border pl-2",
        )}
      >
        <Quote
          className={cn(
            "size-3 shrink-0 opacity-60",
            excerptDir === "rtl" && "order-last",
          )}
        />
        <span className="text-pretty">{source.excerpt}</span>
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
        <span className="text-xs text-muted-foreground">Thinking…</span>
      </div>
    </div>
  );
}

// Lightweight inline markdown: supports **bold** only - same convention as
// ContractInvestigator.tsx's RichText.
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
