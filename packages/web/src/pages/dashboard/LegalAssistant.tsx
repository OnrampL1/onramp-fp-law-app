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
  ArrowUp,
  ChevronRight,
  FileText,
  Info,
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
      return serverMessage ?? "The Assistant is temporarily unavailable right now. Please try again.";
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

const SUGGESTED_QUESTIONS = [
  "Which of our active contracts are expiring in the next 90 days?",
  "What does our organization's standard confidentiality policy say?",
  "ما هي شروط صحة الرضى في العقد؟",
  "Do any of our contracts expose us to unlimited liability under Lebanese law?",
];

export default function LegalAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const askAssistantMutation = useAskAssistant();

  const isEmpty = messages.length === 0 && !thinking;

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  function startNewChat() {
    setMessages([]);
    setInput("");
    setThinking(false);
  }

  async function send(question: string) {
    const text = question.trim();
    if (!text || thinking) return;

    setInput("");
    setThinking(true);

    const userMessage: ChatMessage = { id: nextId(), role: "user", content: text };
    const history = toHistoryTurns(messages);
    setMessages((prev) => [...prev, userMessage]);

    try {
      const result = await askAssistantMutation.mutateAsync({ question: text, history });
      const assistantMessage: ChatMessage = {
        id: nextId(),
        role: "assistant",
        content: result.answer.trim().length > 0 ? result.answer : NO_ANSWER_FALLBACK,
        sources: result.sources.length > 0 ? result.sources : undefined,
        confidence: result.confidence,
        noMatchingSource: result.sources.length === 0,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", content: errorMessage(error) },
      ]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col space-y-4 pb-2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <Sparkles className="size-5 text-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
              Legal Assistant
            </h1>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Info className="size-3.5" />
            Ask anything about your contracts, your organization's documents, or Lebanese law - one assistant decides what to check.
          </p>
        </div>

        <Button variant="outline" className="gap-2" onClick={startNewChat}>
          <Plus className="size-4" />
          New chat
        </Button>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
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

        <div className="border-t border-border p-3">
          <div className="mx-auto w-full max-w-2xl">
            {!isEmpty ? (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.slice(0, 3).map((q) => (
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
                disabled={!input.trim() || thinking}
              >
                <ArrowUp className="size-4" />
                <span className="sr-only">Send message</span>
              </Button>
            </form>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Answers may draw on your contracts, your organization's indexed documents, and Lebanese legal texts. This is not legal advice - verify citations before relying on them.
            </p>
          </div>
        </div>
      </Card>
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
          Ask your AI Assistant
        </h2>
        <p className="mx-auto max-w-md text-pretty text-sm text-muted-foreground">
          One assistant that understands your question and decides which of Clausio's capabilities to check - your contracts, their AI analysis, your organization's documents, and Lebanese law - then gives you one grounded answer with citations.
        </p>
      </div>
      <div className="grid w-full max-w-lg gap-2 sm:grid-cols-2">
        {SUGGESTED_QUESTIONS.map((q, i) => (
          <button
            key={q}
            type="button"
            dir={textDir(q)}
            onClick={() => onPick(q)}
            className={cn(
              "group flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3.5 py-3 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
              i === SUGGESTED_QUESTIONS.length - 1 && "sm:col-span-2",
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
      <div
        dir={textDir(message.content)}
        className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
      >
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
        <div dir={textDir(message.content)} className="text-sm leading-relaxed text-foreground">
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

        {typeof message.confidence === "number" && message.sources && message.sources.length > 0 ? (
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
        {sources.length} source {sources.length === 1 ? "reference" : "references"}
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
        <span className="text-xs font-medium text-foreground">{source.label}</span>
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
        <Quote className={cn("size-3 shrink-0 opacity-60", excerptDir === "rtl" && "order-last")} />
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
