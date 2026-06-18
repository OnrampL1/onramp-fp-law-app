import type { Contract, ActivityItem, ExpiringContract, AiInsight, StatCardData } from "../types";
import {
  FileTextIcon,
  ClipboardIcon,
  CalendarIcon,
  ShieldIcon,
  WarningTriangleIcon,
  RefreshIcon,
  ScaleIcon,
  BanIcon,
  BeakerIcon,
} from "../icons";

// ─── Stat cards ───────────────────────────────────────────────────────────────

export const STATS: StatCardData[] = [
  {
    icon:          <FileTextIcon />,
    delta:         "12.4%",
    deltaPositive: true,
    value:         "2,847",
    label:         "Total Contracts",
    sublabel:      "vs. last quarter",
  },
  {
    icon:          <ClipboardIcon />,
    delta:         "5.2%",
    deltaPositive: true,
    value:         "1,932",
    label:         "Active Contracts",
    sublabel:      "67.9% of portfolio",
  },
  {
    icon:          <CalendarIcon />,
    delta:         "9",
    deltaPositive: false,
    value:         "48",
    label:         "Expiring Soon",
    sublabel:      "within 30 days",
  },
  {
    icon:          <ShieldIcon />,
    delta:         "3.1%",
    deltaPositive: false,
    value:         "126",
    label:         "Contracts with Risk Flags",
    sublabel:      "AI-detected issues",
  },
];

// ─── Contracts ────────────────────────────────────────────────────────────────

export const CONTRACTS: Contract[] = [
  {
    id:             "CTR-10482",
    name:           "Master Services Agreement",
    type:           "MSA",
    counterparty:   "Northwind Logistics Inc.",
    status:         "Active",
    expirationDate: "Mar 14, 2026",
    riskLevel:      "Low",
    lastUpdated:    "2 hours ago",
  },
  {
    id:             "CTR-10479",
    name:           "Enterprise SaaS License",
    type:           "License",
    counterparty:   "Helios Cloud Systems",
    status:         "Active",
    expirationDate: "Jan 02, 2026",
    riskLevel:      "High",
    lastUpdated:    "5 hours ago",
  },
  {
    id:             "CTR-10475",
    name:           "Mutual NDA",
    type:           "NDA",
    counterparty:   "Vertex Biolabs",
    status:         "Draft",
    expirationDate: null,
    riskLevel:      "Low",
    lastUpdated:    "Yesterday",
  },
  {
    id:             "CTR-10470",
    name:           "Manufacturing Supply Contract",
    type:           "Supply",
    counterparty:   "Ironclad Components Ltd.",
    status:         "Active",
    expirationDate: "Dec 31, 2025",
    riskLevel:      "Critical",
    lastUpdated:    "Yesterday",
  },
  {
    id:             "CTR-10463",
    name:           "Consulting Engagement",
    type:           "SOW",
    counterparty:   "Meridian Advisory Group",
    status:         "Expired",
    expirationDate: "Nov 01, 2025",
    riskLevel:      "Medium",
    lastUpdated:    "3 days ago",
  },
  {
    id:             "CTR-10456",
    name:           "Data Processing Addendum",
    type:           "DPA",
    counterparty:   "Quantia Analytics",
    status:         "Active",
    expirationDate: "Aug 18, 2026",
    riskLevel:      "Medium",
    lastUpdated:    "4 days ago",
  },
  {
    id:             "CTR-10451",
    name:           "Reseller Partnership Agreement",
    type:           "Partnership",
    counterparty:   "Brightline Partners",
    status:         "Terminated",
    expirationDate: "Oct 12, 2025",
    riskLevel:      "High",
    lastUpdated:    "6 days ago",
  },
];

// ─── Activity feed ────────────────────────────────────────────────────────────

export const ACTIVITY: ActivityItem[] = [
  {
    id:        "1",
    actor:     "Sarah Chen",
    actorType: "user",
    action:    "uploaded a new contract",
    target:    "Master Services Agreement — Northwind",
    time:      "2 min ago",
  },
  {
    id:        "2",
    actor:     "Clausio AI",
    actorType: "ai",
    action:    "completed AI analysis on",
    target:    "Enterprise SaaS License — Helios",
    time:      "18 min ago",
  },
  {
    id:        "3",
    actor:     "David Okafor",
    actorType: "user",
    action:    "generated a witness link for",
    target:    "Manufacturing Supply Contract",
    time:      "1 hour ago",
  },
  {
    id:        "4",
    actor:     "Priya Natarajan",
    actorType: "user",
    action:    "added a new user",
    target:    "m.alvarez@acme.com (Reviewer)",
    time:      "3 hours ago",
  },
  {
    id:        "5",
    actor:     "James Whitfield",
    actorType: "user",
    action:    "changed status to Terminated on",
    target:    "Reseller Partnership Agreement",
    time:      "Yesterday",
  },
  {
    id:        "6",
    actor:     "Clausio AI",
    actorType: "ai",
    action:    "flagged 3 liability risks in",
    target:    "Consulting Engagement — Meridian",
    time:      "Yesterday",
  },
];

// ─── Expiring contracts ───────────────────────────────────────────────────────

export const EXPIRING: ExpiringContract[] = [
  {
    daysLeft:    18,
    name:        "Manufacturing Supply…",
    counterparty: "Ironclad Components Ltd.",
    risk:        "Critical",
  },
  {
    daysLeft:    23,
    name:        "Enterprise SaaS License",
    counterparty: "Helios Cloud Systems",
    value:       "$480K",
    risk:        "High",
  },
  {
    daysLeft:    41,
    name:        "Office Lease Agreement",
    counterparty: "Cushwood Properties",
    value:       "$1.1M",
    risk:        "Medium",
  },
  {
    daysLeft:    52,
    name:        "Marketing Retainer",
    counterparty: "Pulse Creative Studio",
    value:       "$95K",
    risk:        "Low",
  },
];

// ─── AI insights ──────────────────────────────────────────────────────────────

export const AI_INSIGHTS: AiInsight[] = [
  {
    icon:        <WarningTriangleIcon />,
    label:       "High Risk Contracts",
    count:       42,
    description: "Contracts flagged with elevated risk exposure",
  },
  {
    icon:        <RefreshIcon />,
    label:       "Auto Renewal Alerts",
    count:       17,
    description: "Auto-renew clauses triggering within 60 days",
  },
  {
    icon:        <ScaleIcon />,
    label:       "Liability Risks",
    count:       29,
    description: "Uncapped or broad indemnification terms",
  },
  {
    icon:        <BanIcon />,
    label:       "Non-Compete Detection",
    count:       11,
    description: "Restrictive covenants requiring legal review",
  },
  {
    icon:        <BeakerIcon />,
    label:       "IP Assignment Detection",
    count:       23,
    description: "Intellectual property transfer provisions",
  },
];