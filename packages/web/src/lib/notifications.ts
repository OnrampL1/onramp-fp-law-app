import { Clock, ShieldAlert, Sparkles, type LucideIcon } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { DateRangePreset, NotificationItem } from "@/types/notifications";

const DAY_MS = 24 * 60 * 60 * 1000;

const RISK_CATEGORY_LABELS: Record<string, string> = {
  LIABILITY: "Liability",
  INDEMNIFICATION: "Indemnification",
  AUTO_RENEWAL: "Auto-renewal",
  TERMINATION: "Termination",
  PAYMENT: "Payment",
  CONFIDENTIALITY: "Confidentiality",
  NON_COMPETE: "Non-compete",
  IP_ASSIGNMENT: "IP assignment",
  OTHER: "Contract",
};

const PRESET_DAYS_BACK: Record<Exclude<DateRangePreset, "all" | "yesterday">, number> = {
  last7: 7,
  last30: 30,
  last90: 90,
  lastYear: 365,
};

// Converts a preset into the dateFrom/dateTo shape the backend's
// listNotificationsQuerySchema already accepts — no new API surface, just
// computed client-side instead of typed by hand.
//
// "Last N days" presets deliberately omit dateTo rather than passing
// today's date: the backend coerces a date-only string to midnight UTC, so
// passing "today" as dateTo would filter out anything created later today
// (i.e. most of what "last 90 days" is supposed to include) — caught live
// while verifying this: freshly-created notifications vanished the moment
// any "last N days" preset was applied. Omitting dateTo means "through
// now", which is what these presets actually mean.
export function getDateRangeForPreset(
  preset: DateRangePreset,
): { dateFrom?: string; dateTo?: string } {
  if (preset === "all") return {};

  const now = new Date();

  if (preset === "yesterday") {
    const startOfToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const startOfYesterday = new Date(startOfToday.getTime() - DAY_MS);
    const endOfYesterday = new Date(startOfToday.getTime() - 1);
    return {
      dateFrom: startOfYesterday.toISOString(),
      dateTo: endOfYesterday.toISOString(),
    };
  }

  const from = new Date(now.getTime() - PRESET_DAYS_BACK[preset] * DAY_MS);
  return { dateFrom: from.toISOString() };
}

function formatExpiryInDays(isoDate: string): string {
  const today = new Date();
  const todayUtcMidnight = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const expiry = new Date(isoDate);
  const expiryUtcMidnight = Date.UTC(
    expiry.getUTCFullYear(),
    expiry.getUTCMonth(),
    expiry.getUTCDate(),
  );
  const daysUntil = Math.round((expiryUtcMidnight - todayUtcMidnight) / DAY_MS);

  if (daysUntil <= 0) return "today";
  if (daysUntil === 1) return "tomorrow";
  return `in ${daysUntil} days`;
}

export interface NotificationDisplay {
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  description: string;
  time: string;
  route: string;
}

// Shared by the bell dropdown and the "View all" modal so both render a
// notification identically. Route target mirrors what every type actually
// carries: all three are contract-scoped (targetEntityType is always
// "Contract" today), so all land on a contract route.
export function toNotificationDisplay(item: NotificationItem): NotificationDisplay {
  if (item.type === "CONTRACT_EXPIRING") {
    const expiry = formatExpiryInDays(item.occurredAt);
    return {
      icon: Clock,
      iconClassName: "bg-amber-50 text-amber-600",
      title: "Contract expiring soon",
      description: `${item.contractTitle} expires ${expiry}.`,
      time: expiry,
      route: `/contracts/${item.contractId}`,
    };
  }

  if (item.type === "AI_ANALYSIS_COMPLETED") {
    return {
      icon: Sparkles,
      iconClassName: "bg-emerald-50 text-emerald-600",
      title: "AI analysis complete",
      description: `Analysis completed for ${item.contractTitle}.`,
      time: formatRelativeTime(item.occurredAt),
      route: `/contracts/${item.contractId}/analysis`,
    };
  }

  const categoryLabel = RISK_CATEGORY_LABELS[item.category ?? "OTHER"] ?? "Contract";
  const isCritical = item.severity === "CRITICAL";
  const extraCount = (item.flagCount ?? 1) - 1;

  return {
    icon: ShieldAlert,
    iconClassName: isCritical ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600",
    title: isCritical ? "Critical risk flag detected" : "High risk flag detected",
    description:
      extraCount > 0
        ? `${categoryLabel} risk found in ${item.contractTitle} (+${extraCount} more).`
        : `${categoryLabel} risk found in ${item.contractTitle}.`,
    // Same landing spot as AI_ANALYSIS_COMPLETED — deep-linking straight to
    // the risk tab would need ContractInsights.tsx to read an initial-tab
    // URL param, which it doesn't today; logged as a small follow-up rather
    // than reworking that component's tab state for this feature.
    time: formatRelativeTime(item.occurredAt),
    route: `/contracts/${item.contractId}/analysis`,
  };
}
