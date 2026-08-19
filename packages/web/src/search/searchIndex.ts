import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Ban,
  BrainCircuit,
  Building2,
  Copyright,
  FileText,
  LayoutDashboard,
  PenLine,
  RefreshCw,
  Scale,
  Search,
  Settings as SettingsIcon,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
  Upload,
  Users,
  ScrollText,
} from "lucide-react";

// Categories a result can render under, in the fixed display order approved
// for both the dropdown and the "View all results" modal. "settings",
// "pages" are static-index categories; "users", "contracts",
// "organization" are populated from GET /api/search (live data).
export const SEARCH_CATEGORY_ORDER = [
  "pages",
  "settings",
  "users",
  "contracts",
  "organization",
] as const;

export type SearchCategory = (typeof SEARCH_CATEGORY_ORDER)[number];

export const SEARCH_CATEGORY_LABELS: Record<SearchCategory, string> = {
  pages: "Pages",
  settings: "Settings",
  users: "Users",
  contracts: "Contracts",
  organization: "Organization",
};

export interface StaticSearchEntry {
  id: string;
  name: string;
  route: string;
  category: "pages" | "settings";
  icon: LucideIcon;
  keywords: string[];
  // Only set on features that aren't wired up yet (Clause Investigator,
  // the /insights/* pages). Still fully navigable — clicking routes to
  // whatever placeholder content the page already renders — this just
  // swaps the result row's usual grey subtext for a "Coming Soon" badge.
  status?: "comingSoon";
  // Only set on sub-feature rows that live under a parent page rather
  // than being their own destination (e.g. Witness Link -> Witness
  // Workflow). Rendered as grey subtext ("In: <parentLabel>") in place of
  // the usual "Contains: <matched keyword>" treatment.
  parentLabel?: string;
}

export const staticSearchIndex: StaticSearchEntry[] = [
  // ── Pages ──────────────────────────────────────────────────────────────
  {
    id: "page-dashboard",
    name: "Dashboard",
    route: "/dashboard",
    category: "pages",
    icon: LayoutDashboard,
    keywords: ["home", "overview"],
  },
  {
    id: "page-contracts",
    name: "Contracts",
    route: "/contracts",
    category: "pages",
    icon: FileText,
    keywords: ["agreements", "documents"],
  },
  {
    id: "page-upload",
    name: "Contract Upload",
    route: "/upload",
    category: "pages",
    icon: Upload,
    keywords: ["new contract", "add contract", "import"],
  },
  {
    id: "page-organization-brain",
    name: "Organization Brain",
    route: "/organization-brain",
    category: "pages",
    icon: BrainCircuit,
    keywords: [
      "templates",
      "policies",
      "clauses",
      "guidelines",
      "knowledge library",
    ],
  },
  {
    id: "page-legal-assistant",
    name: "Legal Assistant",
    route: "/legal-assistant",
    category: "pages",
    icon: Scale,
    keywords: [
      "ask organization brain",
      "legal knowledge base",
      "lebanese law",
      "ask ai",
      "chat",
    ],
  },
  {
    id: "page-user-management",
    name: "User Management",
    route: "/users",
    category: "pages",
    icon: Users,
    keywords: ["team", "members", "invite", "roles", "invitations"],
  },
  {
    id: "page-witness-workflow",
    name: "Witness Workflow",
    route: "/witness",
    category: "pages",
    icon: PenLine,
    keywords: [
      "signing",
      "e-signature",
      "witness invitations",
      "revoke access",
      "expiring links",
    ],
  },
  {
    id: "page-audit-logging",
    name: "Audit Logging",
    route: "/audit",
    category: "pages",
    icon: ScrollText,
    keywords: [
      "audit trail",
      "activity log",
      "history",
      "compliance log",
      "contract uploaded",
      "user invited",
      "role changed",
    ],
  },
  {
    id: "page-settings",
    name: "Settings",
    route: "/settings",
    category: "pages",
    icon: SettingsIcon,
    keywords: ["preferences", "configuration"],
  },

  // ── Sub-feature rows (own row, points at a parent page) ──────────────────
  {
    id: "subfeature-witness-link",
    name: "Witness Link",
    route: "/witness",
    category: "pages",
    icon: PenLine,
    keywords: ["generate link", "witness access"],
    parentLabel: "Witness Workflow",
  },

  // ── Coming soon pages ──────────────────────────────────────────────────
  {
    id: "page-clause-investigator",
    name: "Clause Investigator",
    route: "/investigator",
    category: "pages",
    icon: Search,
    keywords: ["compare clauses", "search clauses"],
    status: "comingSoon",
  },
  {
    id: "insight-auto-renewal",
    name: "Auto Renewal Alerts",
    route: "/insights/auto-renewal",
    category: "pages",
    icon: RefreshCw,
    keywords: ["auto-renew", "renewal", "insights"],
    status: "comingSoon",
  },
  {
    id: "insight-liability",
    name: "Liability Risks",
    route: "/insights/liability",
    category: "pages",
    icon: ShieldAlert,
    keywords: ["indemnification", "liability", "insights"],
    status: "comingSoon",
  },
  {
    id: "insight-non-compete",
    name: "Non-Compete Detection",
    route: "/insights/non-compete",
    category: "pages",
    icon: Ban,
    keywords: ["restrictive covenant", "non compete", "insights"],
    status: "comingSoon",
  },
  {
    id: "insight-ip-assignment",
    name: "IP Assignment Detection",
    route: "/insights/ip-assignment",
    category: "pages",
    icon: Copyright,
    keywords: ["intellectual property", "ip assignment", "insights"],
    status: "comingSoon",
  },

  // ── Settings sections ─────────────────────────────────────────────────
  // Routed with ?section= so a hit opens the actual tab, not just /settings
  // defaulted to Profile — Settings.tsx reads this param on mount.
  {
    id: "settings-profile",
    name: "Profile",
    route: "/settings?section=profile",
    category: "settings",
    icon: UserRound,
    keywords: ["account", "personal details", "name", "email"],
  },
  {
    id: "settings-organization",
    name: "Organization",
    route: "/settings?section=organization",
    category: "settings",
    icon: Building2,
    keywords: ["workspace", "company", "org name"],
  },
  {
    id: "settings-security",
    name: "Security",
    route: "/settings?section=security",
    category: "settings",
    icon: ShieldCheck,
    keywords: ["password", "authentication", "access policy"],
  },
  {
    id: "settings-ai",
    name: "AI preferences",
    route: "/settings?section=ai",
    category: "settings",
    icon: Sparkles,
    keywords: ["contract analysis behavior", "model settings"],
  },
  {
    id: "settings-notifications",
    name: "Notifications",
    route: "/settings?section=notifications",
    category: "settings",
    icon: Bell,
    keywords: ["alerts", "email preferences"],
  },
];
