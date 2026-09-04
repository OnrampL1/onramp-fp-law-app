import {
  Ban,
  CalendarClock,
  Copyright,
  CreditCard,
  DoorOpen,
  HelpCircle,
  Lock,
  Scale,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import type { RiskCategory } from "@/types/insights";

export interface RiskCategoryMeta {
  // URL slug used under /insights/:categorySlug - kebab-case, distinct from
  // the API's SCREAMING_SNAKE_CASE category value.
  slug: string;
  // Short label for compact contexts (the AI Insights panel row).
  label: string;
  // Full heading used on the category's own drill-down page.
  title: string;
  description: string;
  icon: LucideIcon;
  // Icon badge colors - a distinct hue per category so the AI Insights list
  // reads at a glance instead of every row using the same neutral tone.
  // Purely an identity color per category, same bg-*-50/text-*-600 (+ dark)
  // pairing the dashboard's own KPI cards already use - not a severity
  // signal, since this summary has no per-severity breakdown to draw one
  // from honestly.
  iconClassName: string;
}

export const RISK_CATEGORY_META: Record<RiskCategory, RiskCategoryMeta> = {
  LIABILITY: {
    slug: "liability",
    label: "Liability",
    title: "Liability Risks",
    description: "Contracts with an uncapped or broad liability exposure.",
    icon: ShieldAlert,
    iconClassName: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-300",
  },
  INDEMNIFICATION: {
    slug: "indemnification",
    label: "Indemnification",
    title: "Indemnification Risks",
    description:
      "Contracts with a broad or one-sided indemnification obligation flagged.",
    icon: Scale,
    iconClassName:
      "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-300",
  },
  AUTO_RENEWAL: {
    slug: "auto-renewal",
    label: "Auto-renewal",
    title: "Auto Renewal Alerts",
    description: "Contracts flagged for an auto-renewal clause worth reviewing.",
    icon: CalendarClock,
    iconClassName:
      "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300",
  },
  TERMINATION: {
    slug: "termination",
    label: "Termination",
    title: "Termination Risks",
    description: "Contracts with a termination or exit provision flagged.",
    icon: DoorOpen,
    iconClassName:
      "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-300",
  },
  PAYMENT: {
    slug: "payment",
    label: "Payment",
    title: "Payment Risks",
    description:
      "Contracts with a flagged invoicing, penalty, or escalation term.",
    icon: CreditCard,
    iconClassName:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300",
  },
  CONFIDENTIALITY: {
    slug: "confidentiality",
    label: "Confidentiality",
    title: "Confidentiality Risks",
    description: "Contracts with a flagged confidentiality obligation.",
    icon: Lock,
    iconClassName: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300",
  },
  NON_COMPETE: {
    slug: "non-compete",
    label: "Non-compete",
    title: "Non-Compete Detection",
    description: "Contracts with a non-compete or restrictive covenant flagged.",
    icon: Ban,
    iconClassName:
      "bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300",
  },
  IP_ASSIGNMENT: {
    slug: "ip-assignment",
    label: "IP assignment",
    title: "IP Assignment Detection",
    description:
      "Contracts with an IP assignment or transfer provision flagged.",
    icon: Copyright,
    iconClassName:
      "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300",
  },
  OTHER: {
    slug: "other",
    label: "Other",
    title: "Other Flagged Risks",
    description:
      "Contracts with a flagged finding outside the standard risk categories.",
    icon: HelpCircle,
    iconClassName:
      "bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300",
  },
};

export const RISK_CATEGORY_BY_SLUG: Record<string, RiskCategory> =
  Object.fromEntries(
    (Object.entries(RISK_CATEGORY_META) as [RiskCategory, RiskCategoryMeta][]).map(
      ([category, meta]) => [meta.slug, category],
    ),
  );
