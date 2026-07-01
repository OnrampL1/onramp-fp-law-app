import type {
  WitnessInvitation,
  ExpiringLink,
  WitnessStatCard,
  SecurityFeature,
  ReviewStage,
  AccessActivityItem,
} from "../types";

import {
  LinkIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  DocumentOpenIcon,
  SendIcon,
  UserCheckIcon,
  LockIcon,
  ShieldCheckIcon,
  ComputerIcon,
  UserGroupIcon,
} from "../icons";

// ─── Stat cards ───────────────────────────────────────────────────────────────

export const WITNESS_STATS: WitnessStatCard[] = [
  {
    icon:          <LinkIcon />,
    delta:         "6",
    deltaPositive: true,
    value:         "24",
    label:         "Active Witness Links",
    sublabel:      "vs. last week",
  },
  {
    icon:          <ClockIcon />,
    delta:         "3",
    deltaPositive: false,
    value:         "9",
    label:         "Pending Reviews",
    sublabel:      "awaiting witness",
  },
  {
    icon:          <CheckCircleIcon />,
    delta:         "18",
    deltaPositive: true,
    value:         "143",
    label:         "Completed Reviews",
    sublabel:      "this month",
  },
  {
    icon:          <XCircleIcon />,
    delta:         "2",
    deltaPositive: false,
    value:         "7",
    label:         "Expired Links",
    sublabel:      "vs. last week",
  },
];

// ─── Active witness invitations ───────────────────────────────────────────────

export const WITNESS_INVITATIONS: WitnessInvitation[] = [
  {
    id:            "WIT-001",
    contractName:  "Master Services Agreement",
    contractId:    "MSA-2026-0142",
    witnessName:   "Jordan Avery",
    witnessEmail:  "j.avery@external-counsel.com",
    generatedBy:   "Alex Whitfield",
    generatedDate: "Jun 14, 2026 · 09:12",
    created:       "Jun 14, 2026 · 09:12",
    expires:       "Jun 16, 2026 · 09:12",
    expiresLabel:  "in 21h",
    status:        "Viewed",
    accessType:    "Review & Acknowledge",
    lastAction:    "12 min ago",
    url:           "https://app.clausio.com/witness/review?t=wv_msa142avery",
  },
  {
    id:            "WIT-002",
    contractName:  "Share Purchase Agreement",
    contractId:    "SPA-2026-0211",
    witnessName:   "Maria Velasquez",
    witnessEmail:  "m.velasquez@velasquezlaw.com",
    generatedBy:   "Alex Whitfield",
    generatedDate: "Jun 13, 2026 · 16:40",
    created:       "Jun 13, 2026 · 16:40",
    expires:       "Jun 20, 2026 · 16:40",
    expiresLabel:  "in 6d",
    status:        "Acknowledged",
    accessType:    "Review & Acknowledge",
    lastAction:    "1 day ago",
    url:           "https://app.clausio.com/witness/review?t=wv_spa211velasquez",
  },
  {
    id:            "WIT-003",
    contractName:  "Mutual Non-Disclosure Agreement",
    contractId:    "NDA-2026-0098",
    witnessName:   "Thomas Reed",
    witnessEmail:  "t.reed@reedpartners.com",
    generatedBy:   "Sofia Lindgren",
    generatedDate: "Jun 14, 2026 · 11:05",
    created:       "Jun 14, 2026 · 11:05",
    expires:       "Jun 15, 2026 · 11:05",
    expiresLabel:  "Expired",
    status:        "Pending",
    accessType:    "Review Only",
    lastAction:    "Not yet open",
    url:           "https://app.clausio.com/witness/review?t=wv_nda098reed",
  },
  {
    id:            "WIT-004",
    contractName:  "Commercial Lease Agreement",
    contractId:    "LSE-2026-0077",
    witnessName:   "Helen Park",
    witnessEmail:  "h.park@parkrealty.com",
    generatedBy:   "Alex Whitfield",
    generatedDate: "Jun 08, 2026 · 10:20",
    created:       "Jun 08, 2026 · 10:20",
    expires:       "Jun 10, 2026 · 10:20",
    expiresLabel:  "Expired",
    status:        "Expired",
    accessType:    "Review & Acknowledge",
    lastAction:    "5 days ago",
    url:           "https://app.clausio.com/witness/review?t=wv_lse077park",
  },
  {
    id:            "WIT-005",
    contractName:  "Executive Employment Contract",
    contractId:    "EMP-2026-0303",
    witnessName:   "Daniel Osei",
    witnessEmail:  "d.osei@oseiadvisors.com",
    generatedBy:   "Sofia Lindgren",
    generatedDate: "Jun 12, 2026 · 14:55",
    created:       "Jun 12, 2026 · 14:55",
    expires:       "Jun 13, 2026 · 14:55",
    expiresLabel:  "Expired",
    status:        "Revoked",
    accessType:    "Review Only",
    lastAction:    "2 days ago",
    url:           "https://app.clausio.com/witness/review?t=wv_emp303osei",
  },
];

// ─── Review stages (funnel) ───────────────────────────────────────────────────

export const REVIEW_STAGES: ReviewStage[] = [
  { stage: 1, icon: <SendIcon />,         label: "Invitation Sent",   count: 24, pct: 100 },
  { stage: 2, icon: <EyeIcon />,          label: "Viewed",            count: 19, pct: 78  },
  { stage: 3, icon: <DocumentOpenIcon />, label: "Contract Opened",   count: 15, pct: 63  },
  { stage: 4, icon: <UserCheckIcon />,    label: "Review Completed",  count: 11, pct: 46  },
  { stage: 5, icon: <CheckCircleIcon />,  label: "Acknowledged",      count: 8,  pct: 33  },
];

// ─── Security features ────────────────────────────────────────────────────────

export const SECURITY_FEATURES: SecurityFeature[] = [
  { icon: <LockIcon />,       title: "Link Encryption",      subtitle: "AES-256 token payloads",  badgeLabel: "Secure",   badgeVariant: "secure"   },
  { icon: <ShieldCheckIcon />, title: "Token Validation",    subtitle: "Signed, single-use JWT",  badgeLabel: "Active",   badgeVariant: "active"   },
  { icon: <ComputerIcon />,   title: "Access Restrictions",  subtitle: "IP & device binding",     badgeLabel: "Enforced", badgeVariant: "enforced" },
  { icon: <UserGroupIcon />,  title: "Single Contract Scope",subtitle: "One contract per link",   badgeLabel: "Verified", badgeVariant: "verified" },
];

// ─── Expiring links ───────────────────────────────────────────────────────────

export const EXPIRING_LINKS: ExpiringLink[] = [
  { contractName: "Master Services Agreement",     contractId: "MSA-2026-0142", witnessName: "Jordan Avery", expirationTime: "in 21h" },
  { contractName: "Mutual Non-Disclosure Agreement", contractId: "NDA-2026-0098", witnessName: "Thomas Reed",  expirationTime: "in 3h"  },
];

// ─── Contract options (for the generate form select) ─────────────────────────

export const CONTRACT_OPTIONS = [
  { id: "MSA-2026-0142", name: "Master Services Agreement"       },
  { id: "SPA-2026-0211", name: "Share Purchase Agreement"        },
  { id: "NDA-2026-0098", name: "Mutual Non-Disclosure Agreement" },
  { id: "LSE-2026-0077", name: "Commercial Lease Agreement"      },
  { id: "EMP-2026-0303", name: "Executive Employment Contract"   },
];

// ─── Access activity (timeline) ───────────────────────────────────────────────

export const ACCESS_ACTIVITY: AccessActivityItem[] = [
  {
    id:        "ACT-001",
    eventType: "acknowledged",
    label:     "Witness acknowledgement submitted",
    subLabel:  "Share Purchase Agreement · Maria Velasquez",
    time:      "Today · 08:54",
  },
  {
    id:        "ACT-002",
    eventType: "review_completed",
    label:     "Witness completed review",
    subLabel:  "Share Purchase Agreement · Maria Velasquez",
    time:      "Today · 08:41",
  },
  {
    id:        "ACT-003",
    eventType: "pdf_downloaded",
    label:     "Witness downloaded PDF",
    subLabel:  "Master Services Agreement · Jordan Avery",
    time:      "Today · 08:36",
  },
  {
    id:        "ACT-004",
    eventType: "contract_opened",
    label:     "Witness opened contract",
    subLabel:  "Master Services Agreement · Jordan Avery",
    time:      "Today · 08:30",
  },
  {
    id:        "ACT-005",
    eventType: "link_generated",
    label:     "Witness link generated",
    subLabel:  "Mutual Non-Disclosure Agreement · Thomas Reed",
    time:      "Yesterday · 11:05",
  },
  {
    id:        "ACT-006",
    eventType: "link_generated",
    label:     "Witness link generated",
    subLabel:  "Master Services Agreement · Jordan Avery",
    time:      "Jun 14 · 09:12",
  },
];