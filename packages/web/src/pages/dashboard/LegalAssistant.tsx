import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAskOrganizationBrain, useAskLegalKb } from "@/hooks/useLegalAssistant";
import type {
  AskHistoryTurn,
  OrgBrainSource,
  LegalKbSource,
} from "@/types/legal-assistant";
import { cn, formatDate } from "@/lib/utils";
import {
  ArrowUp,
  BrainCircuit,
  ChevronRight,
  ExternalLink,
  FileText,
  History,
  Info,
  Landmark,
  Library,
  Plus,
  Quote,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type Destination = "org-brain" | "legal-kb";

interface ChatMessage<TSource> {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: TSource[];
  confidence?: number;
  // Distinguishes "the model answered but found nothing relevant" (sources
  // deliberately empty, per each corpus's own prompt instruction) from "the
  // model answered and cited something" — Org Brain and Legal KB get their
  // own copy for this per the product ask, not a shared generic string.
  noMatchingSource?: boolean;
}

let idCounter = 0;
const nextId = () => `live-${Date.now()}-${idCounter++}`;

// Sent with every request per the same product decision as Clause
// Investigator (contracts/ContractInvestigator.tsx): conversations aren't
// persisted server-side, so history is reconstructed and resent, trimmed to
// mirror the server's own default turn limit.
const HISTORY_TURN_LIMIT = 3;

function toHistoryTurns<TSource>(messages: ChatMessage<TSource>[]): AskHistoryTurn[] {
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

const NO_ANSWER_FALLBACK: Record<Destination, string> = {
  "org-brain": "Your organization's indexed content does not appear to address that question.",
  "legal-kb": "The indexed Lebanese legal texts do not appear to address that question.",
};

function errorMessageFor(destination: Destination, error: unknown): string {
  const label = destination === "org-brain" ? "Organization Brain" : "Legal Knowledge Base";
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.error as string | undefined;
    if (status === 409) {
      return serverMessage ?? `${label} has no indexed content to search yet.`;
    }
    if (status === 502 || status === 503) {
      return `${label} search is temporarily unavailable right now. Please try again.`;
    }
  }
  return "Something went wrong answering that question. Please try again.";
}

// Arabic Unicode block — used only to decide text direction per bubble/
// excerpt, not for any content transformation. Legal KB content is
// consistently Arabic; Org Brain content is whatever an organization
// uploaded, so this is checked per string rather than assumed per tab.
const ARABIC_PATTERN = /[؀-ۿ]/;
function textDir(text: string): "rtl" | "ltr" {
  return ARABIC_PATTERN.test(text) ? "rtl" : "ltr";
}

const SUGGESTED_QUESTIONS: Record<Destination, string[]> = {
  "org-brain": [
    "What policies do we have on file?",
    "Summarize our standard confidentiality guidelines.",
    "What templates are available for vendor agreements?",
  ],
  "legal-kb": [
    "ماذا تنص المادة 52 من قانون العمل؟",
    "ما هي شروط صحة الرضى في العقد؟",
    "هل يمكن فسخ عقد الايجار لعدم الدفع؟",
  ],
};

const EMPTY_STATE_COPY: Record<Destination, { title: string; body: string }> = {
  "org-brain": {
    title: "Ask about your organization's documents",
    body: "Ask plain-language questions about your organization's uploaded policies, templates, and guidelines, with citations to the exact document they came from.",
  },
  "legal-kb": {
    title: "Ask about Lebanese law",
    body: "Ask plain-language questions about the Lebanese legal texts indexed in the Legal Knowledge Base, with citations to the exact instrument and article they came from.",
  },
};

export default function LegalAssistantPage() {
  const [destination, setDestination] = useState<Destination>("org-brain");
  const [orgBrainMessages, setOrgBrainMessages] = useState<ChatMessage<OrgBrainSource>[]>([]);
  const [legalKbMessages, setLegalKbMessages] = useState<ChatMessage<LegalKbSource>[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const askOrgBrainMutation = useAskOrganizationBrain();
  const askLegalKbMutation = useAskLegalKb();

  const messages = destination === "org-brain" ? orgBrainMessages : legalKbMessages;
  const isEmpty = messages.length === 0 && !thinking;

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [orgBrainMessages, legalKbMessages, thinking, destination]);

  function startNewChat() {
    if (destination === "org-brain") setOrgBrainMessages([]);
    else setLegalKbMessages([]);
    setInput("");
    setThinking(false);
  }

  async function sendOrgBrain(text: string) {
    const userMessage: ChatMessage<OrgBrainSource> = { id: nextId(), role: "user", content: text };
    const history = toHistoryTurns(orgBrainMessages);
    setOrgBrainMessages((prev) => [...prev, userMessage]);
    try {
      const result = await askOrgBrainMutation.mutateAsync({ question: text, history });
      const assistantMessage: ChatMessage<OrgBrainSource> = {
        id: nextId(),
        role: "assistant",
        content: result.answer.trim().length > 0 ? result.answer : NO_ANSWER_FALLBACK["org-brain"],
        sources: result.sources.length > 0 ? result.sources : undefined,
        confidence: result.confidence,
        noMatchingSource: result.sources.length === 0,
      };
      setOrgBrainMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setOrgBrainMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", content: errorMessageFor("org-brain", error) },
      ]);
    }
  }

  async function sendLegalKb(text: string) {
    const userMessage: ChatMessage<LegalKbSource> = { id: nextId(), role: "user", content: text };
    const history = toHistoryTurns(legalKbMessages);
    setLegalKbMessages((prev) => [...prev, userMessage]);
    try {
      const result = await askLegalKbMutation.mutateAsync({ question: text, history });
      const assistantMessage: ChatMessage<LegalKbSource> = {
        id: nextId(),
        role: "assistant",
        content: result.answer.trim().length > 0 ? result.answer : NO_ANSWER_FALLBACK["legal-kb"],
        sources: result.sources.length > 0 ? result.sources : undefined,
        confidence: result.confidence,
        noMatchingSource: result.sources.length === 0,
      };
      setLegalKbMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setLegalKbMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", content: errorMessageFor("legal-kb", error) },
      ]);
    }
  }

  async function send(question: string) {
    const text = question.trim();
    if (!text || thinking) return;
    setInput("");
    setThinking(true);
    try {
      if (destination === "org-brain") await sendOrgBrain(text);
      else await sendLegalKb(text);
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
            Ask questions grounded in your organization's documents or Lebanese legal texts.
          </p>
        </div>

        <Button variant="outline" className="gap-2" onClick={startNewChat}>
          <Plus className="size-4" />
          New chat
        </Button>
      </div>

      <Tabs
        value={destination}
        onValueChange={(value) => setDestination(value as Destination)}
        className="flex min-h-0 flex-1 flex-col gap-3"
      >
        <TabsList className="w-fit">
          <TabsTrigger value="org-brain" className="gap-1.5">
            <BrainCircuit className="size-4" />
            Our Documents
          </TabsTrigger>
          <TabsTrigger value="legal-kb" className="gap-1.5">
            <Scale className="size-4" />
            Lebanese Law
          </TabsTrigger>
        </TabsList>

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          <ScrollArea className="min-h-0 flex-1">
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
              {isEmpty ? (
                <EmptyState destination={destination} onPick={send} />
              ) : destination === "org-brain" ? (
                <>
                  {orgBrainMessages.map((m) =>
                    m.role === "user" ? (
                      <UserBubble key={m.id} message={m} />
                    ) : (
                      <AssistantBubble
                        key={m.id}
                        message={m}
                        destination="org-brain"
                        renderSource={(s, i) => <OrgBrainSourceCard key={s.chunkId} source={s} index={i} />}
                      />
                    ),
                  )}
                  {thinking ? <ThinkingBubble destination={destination} /> : null}
                  <div ref={bottomRef} />
                </>
              ) : (
                <>
                  {legalKbMessages.map((m) =>
                    m.role === "user" ? (
                      <UserBubble key={m.id} message={m} />
                    ) : (
                      <AssistantBubble
                        key={m.id}
                        message={m}
                        destination="legal-kb"
                        renderSource={(s) => <LegalKbSourceCard key={s.chunkId} source={s} />}
                      />
                    ),
                  )}
                  {thinking ? <ThinkingBubble destination={destination} /> : null}
                  <div ref={bottomRef} />
                </>
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-border p-3">
            <div className="mx-auto w-full max-w-2xl">
              {!isEmpty ? (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {SUGGESTED_QUESTIONS[destination].slice(0, 3).map((q) => (
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
                  placeholder={
                    destination === "org-brain"
                      ? "Ask anything about your organization's documents…"
                      : "اسأل عن القانون اللبناني…"
                  }
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
                {destination === "org-brain"
                  ? "Answers are grounded in your organization's indexed content. Verify citations before relying on them."
                  : "Answers are grounded in the indexed Lebanese legal texts. This is not legal advice — verify citations before relying on them."}
              </p>
            </div>
          </div>
        </Card>
      </Tabs>
    </div>
  );
}

function EmptyState({
  destination,
  onPick,
}: {
  destination: Destination;
  onPick: (q: string) => void;
}) {
  const copy = EMPTY_STATE_COPY[destination];
  const questions = SUGGESTED_QUESTIONS[destination];
  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        {destination === "org-brain" ? <BrainCircuit className="size-6" /> : <Scale className="size-6" />}
      </div>
      <div className="space-y-1.5">
        <h2 className="text-balance text-xl font-semibold tracking-tight text-foreground">
          {copy.title}
        </h2>
        <p className="mx-auto max-w-md text-pretty text-sm text-muted-foreground">{copy.body}</p>
      </div>
      <div className="grid w-full max-w-lg gap-2 sm:grid-cols-2">
        {questions.map((q, i) => (
          <button
            key={q}
            type="button"
            dir={textDir(q)}
            onClick={() => onPick(q)}
            className={cn(
              "group flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3.5 py-3 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
              i === questions.length - 1 && "sm:col-span-2",
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

function UserBubble<TSource>({ message }: { message: ChatMessage<TSource> }) {
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

function AssistantBubble<TSource>({
  message,
  destination,
  renderSource,
}: {
  message: ChatMessage<TSource>;
  destination: Destination;
  renderSource: (source: TSource, index: number) => React.ReactNode;
}) {
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
          <SourceList sources={message.sources} renderSource={renderSource} />
        ) : null}

        {message.noMatchingSource ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="size-3.5" />
            <span>
              {destination === "org-brain"
                ? "No matching document found in your organization's indexed content."
                : "No matching Lebanese legal source found."}
            </span>
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

function SourceList<TSource>({
  sources,
  renderSource,
}: {
  sources: TSource[];
  renderSource: (source: TSource, index: number) => React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <FileText className="size-3.5" />
        {sources.length} source {sources.length === 1 ? "reference" : "references"}
      </p>
      <div className="space-y-1.5">{sources.map((s, i) => renderSource(s, i))}</div>
    </div>
  );
}

function OrgBrainSourceCard({ source, index }: { source: OrgBrainSource; index: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground">
          {source.headingPath ?? `Source ${index + 1}`}
        </span>
      </div>
      <div
        dir={textDir(source.excerpt)}
        className="flex gap-2 border-l-2 border-border pl-2 text-xs italic text-muted-foreground"
      >
        <Quote className="size-3 shrink-0 opacity-60" />
        <span className="text-pretty">{source.excerpt}</span>
      </div>
    </div>
  );
}

// The richer Legal KB citation card: instrument + article number, the
// excerpt (RTL-aware), amendment info when present, and — kept visually
// distinct per the backend's own design (search.ts/investigator.ts never
// conflate them) — promulgatingAuthority (the actual legal authority, the
// Lebanese Republic) versus compilerSource (only where Clausio's copy of
// the text came from, not a source of legal authority).
function LegalKbSourceCard({ source }: { source: LegalKbSource }) {
  const excerptDir = textDir(source.excerpt);
  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground">
          {source.articleNumber ? `Article ${source.articleNumber}` : "Article —"}
        </span>
        <span className="text-xs font-medium text-foreground">{source.instrumentTitle}</span>
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

      {source.amendingInstrument ? (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-700">
          <History className="size-3 shrink-0" />
          <span>
            Amended by {source.amendingInstrument}
            {source.amendmentEffectiveDate
              ? ` — effective ${formatDate(source.amendmentEffectiveDate)}`
              : ""}
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2 text-[11px] text-muted-foreground">
        <span
          className="flex items-center gap-1"
          title="The legal authority behind this text — the promulgating instrument itself"
        >
          <Landmark className="size-3" />
          {source.promulgatingAuthority}
        </span>
        <span
          className="flex items-center gap-1"
          title="Where Clausio's indexed copy of this text was sourced from — not the origin of legal authority"
        >
          <Library className="size-3" />
          via {source.compilerSource}
        </span>
        {source.sourceUrl ? (
          <a
            href={source.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            <ExternalLink className="size-3" />
            View source
          </a>
        ) : null}
      </div>
    </div>
  );
}

function ThinkingBubble({ destination }: { destination: Destination }) {
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
          {destination === "org-brain"
            ? "Searching organization documents…"
            : "Searching Lebanese legal texts…"}
        </span>
      </div>
    </div>
  );
}

// Lightweight inline markdown: supports **bold** only — same convention as
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
