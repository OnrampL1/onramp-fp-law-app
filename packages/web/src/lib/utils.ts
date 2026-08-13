import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 1000 * 60 * 60 * 24 * 365],
  ["month", 1000 * 60 * 60 * 24 * 30],
  ["week", 1000 * 60 * 60 * 24 * 7],
  ["day", 1000 * 60 * 60 * 24],
  ["hour", 1000 * 60 * 60],
  ["minute", 1000 * 60],
];

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

export function formatRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = date.getTime() - Date.now();

  for (const [unit, unitMs] of RELATIVE_UNITS) {
    if (Math.abs(diffMs) >= unitMs) {
      return relativeTimeFormatter.format(Math.round(diffMs / unitMs), unit);
    }
  }
  return relativeTimeFormatter.format(0, "minute");
}

// The summary prompt (packages/shared/ai/prompts/summary/v1.md) asks the
// model to separate topics with blank lines, but that's instruction
// following, not a guarantee — this is the frontend backstop for when it
// doesn't. Deliberately matches only the small, known set of topics that
// exact prompt asks for (parties/purpose/payment/termination), not a
// generic "any capitalized phrase + colon" pattern — a generic pattern
// would misfire on things like "Provider:"/"Customer:" inside the parties
// section itself.
const SUMMARY_TOPIC_HEADER_PATTERN =
  /\b(Parties Involved|Provider|Customer|Parties|Core Purpose|Purpose|Payment Terms|Termination Conditions|Termination):/g;

export function formatSummaryParagraphs(text: string): string[] {
  const withBreaks = text.includes("\n\n")
    ? text
    : text.replace(
        SUMMARY_TOPIC_HEADER_PATTERN,
        (match, _label, offset: number) =>
          offset === 0 ? match : `\n\n${match}`,
      );

  return withBreaks
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}
