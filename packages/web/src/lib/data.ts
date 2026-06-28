export type ContractStatus = "Draft" | "Active" | "Expired" | "Terminated";
export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export type Contract = {
  id: string;
  name: string;
  counterparty: string;
  status: ContractStatus;
  expiration: string;
  risk: RiskLevel;
  updated: string;
  value: string;
  type: string;
  effective?: string;
  tags?: string[];
};

export const kpis = [
  {
    label: "Total Contracts",
    value: "2,847",
    change: "+12.4%",
    trend: "up" as const,
    sub: "vs. last quarter",
    icon: "FileText",
  },
  {
    label: "Active Contracts",
    value: "1,932",
    change: "+5.2%",
    trend: "up" as const,
    sub: "67.9% of portfolio",
    icon: "FileCheck2",
  },
  {
    label: "Expiring Soon",
    value: "48",
    change: "+9",
    trend: "up" as const,
    sub: "within 30 days",
    icon: "CalendarClock",
  },
  {
    label: "Contracts with Risk Flags",
    value: "126",
    change: "-3.1%",
    trend: "down" as const,
    sub: "AI-detected issues",
    icon: "ShieldAlert",
  },
];

export const statusOverview = [
  { status: "Draft", count: 184, total: 2847, color: "var(--chart-3)" },
  { status: "Active", count: 1932, total: 2847, color: "var(--chart-5)" },
  {
    status: "Expired",
    count: 587,
    total: 2847,
    color: "var(--muted-foreground)",
  },
  { status: "Terminated", count: 144, total: 2847, color: "var(--chart-4)" },
];

export const recentContracts: Contract[] = [
  {
    id: "CTR-10482",
    name: "Master Services Agreement",
    counterparty: "Northwind Logistics Inc.",
    status: "Active",
    expiration: "Mar 14, 2026",
    risk: "Low",
    updated: "2 hours ago",
    value: "$1.2M",
    type: "MSA",
  },
  {
    id: "CTR-10479",
    name: "Enterprise SaaS License",
    counterparty: "Helios Cloud Systems",
    status: "Active",
    expiration: "Jan 02, 2026",
    risk: "High",
    updated: "5 hours ago",
    value: "$480K",
    type: "License",
  },
  {
    id: "CTR-10475",
    name: "Mutual NDA",
    counterparty: "Vertex Biolabs",
    status: "Draft",
    expiration: "—",
    risk: "Low",
    updated: "Yesterday",
    value: "—",
    type: "NDA",
  },
  {
    id: "CTR-10470",
    name: "Manufacturing Supply Contract",
    counterparty: "Ironclad Components Ltd.",
    status: "Active",
    expiration: "Dec 31, 2025",
    risk: "Critical",
    updated: "Yesterday",
    value: "$3.4M",
    type: "Supply",
  },
  {
    id: "CTR-10463",
    name: "Consulting Engagement",
    counterparty: "Meridian Advisory Group",
    status: "Expired",
    expiration: "Nov 01, 2025",
    risk: "Medium",
    updated: "3 days ago",
    value: "$220K",
    type: "SOW",
  },
  {
    id: "CTR-10458",
    name: "Data Processing Addendum",
    counterparty: "Quantia Analytics",
    status: "Active",
    expiration: "Aug 18, 2026",
    risk: "Medium",
    updated: "4 days ago",
    value: "—",
    type: "DPA",
  },
  {
    id: "CTR-10451",
    name: "Reseller Partnership Agreement",
    counterparty: "Brightline Partners",
    status: "Terminated",
    expiration: "Oct 12, 2025",
    risk: "High",
    updated: "6 days ago",
    value: "$910K",
    type: "Partnership",
  },
];

export type InsightIconName =
  | "ShieldAlert"
  | "RefreshCw"
  | "Scale"
  | "Ban"
  | "Fingerprint";

export type InsightTone = "critical" | "warning" | "info";

export interface AiInsight {
  title: string;
  count: number;
  description: string;
  icon: InsightIconName;
  tone: InsightTone;
}

export const aiInsights: AiInsight[] = [
  {
    title: "High Risk Contracts",
    count: 42,
    description: "Contracts flagged with elevated risk exposure",
    icon: "ShieldAlert",
    tone: "critical",
  },
  {
    title: "Auto Renewal Alerts",
    count: 17,
    description: "Auto-renew clauses triggering within 60 days",
    icon: "RefreshCw",
    tone: "warning",
  },
  {
    title: "Liability Risks",
    count: 29,
    description: "Uncapped or broad indemnification terms",
    icon: "Scale",
    tone: "warning",
  },
  {
    title: "Non-Compete Detection",
    count: 11,
    description: "Restrictive covenants requiring legal review",
    icon: "Ban",
    tone: "info",
  },
  {
    title: "IP Assignment Detection",
    count: 23,
    description: "Intellectual property transfer provisions found",
    icon: "Fingerprint",
    tone: "info",
  },
];

export type ActivityType =
  | "upload"
  | "analysis"
  | "witness"
  | "user"
  | "status";

export const activityFeed: {
  type: ActivityType;
  actor: string;
  initials: string;
  action: string;
  target: string;
  time: string;
}[] = [
  {
    type: "upload",
    actor: "Sarah Chen",
    initials: "SC",
    action: "uploaded a new contract",
    target: "Master Services Agreement — Northwind",
    time: "2 min ago",
  },
  {
    type: "analysis",
    actor: "Clausio AI",
    initials: "AI",
    action: "completed AI analysis on",
    target: "Enterprise SaaS License — Helios",
    time: "18 min ago",
  },
  {
    type: "witness",
    actor: "David Okafor",
    initials: "DO",
    action: "generated a witness link for",
    target: "Manufacturing Supply Contract",
    time: "1 hour ago",
  },
  {
    type: "user",
    actor: "Priya Natarajan",
    initials: "PN",
    action: "added a new user",
    target: "m.alvarez@acme.com (Reviewer)",
    time: "3 hours ago",
  },
  {
    type: "status",
    actor: "James Whitfield",
    initials: "JW",
    action: "changed status to Terminated on",
    target: "Reseller Partnership Agreement",
    time: "Yesterday",
  },
  {
    type: "analysis",
    actor: "Clausio AI",
    initials: "AI",
    action: "flagged 3 liability risks in",
    target: "Consulting Engagement — Meridian",
    time: "Yesterday",
  },
];

export const expiringContracts = [
  {
    name: "Manufacturing Supply Contract",
    counterparty: "Ironclad Components Ltd.",
    daysLeft: 18,
    risk: "Critical" as RiskLevel,
    value: "$3.4M",
  },
  {
    name: "Enterprise SaaS License",
    counterparty: "Helios Cloud Systems",
    daysLeft: 23,
    risk: "High" as RiskLevel,
    value: "$480K",
  },
  {
    name: "Office Lease Agreement",
    counterparty: "Cushwood Properties",
    daysLeft: 41,
    risk: "Medium" as RiskLevel,
    value: "$1.1M",
  },
  {
    name: "Marketing Retainer",
    counterparty: "Pulse Creative Studio",
    daysLeft: 52,
    risk: "Low" as RiskLevel,
    value: "$95K",
  },
];

export const contractTags = [
  "Renewal",
  "Confidential",
  "Auto-Renew",
  "High Value",
  "Regulated",
  "Vendor",
  "Customer",
  "Compliance",
] as const;

export type ContractTag = (typeof contractTags)[number];

// ── Contract Detail page data ─────────────────────────────────────────────

export type Severity = "Critical" | "High" | "Medium" | "Low";

export type ContractDetail = {
  id: string;
  name: string;
  counterparty: string;
  status: ContractStatus;
  effective: string;
  expiration: string;
  created: string;
  uploadedBy: { name: string; initials: string; email: string };
  tags: string[];
  value: string;
  type: string;
  pages: number;
  lastUpdated: string;
  aiSummary: {
    keyObligations: string[];
    paymentTerms: string[];
    terminationTerms: string[];
  };
  riskAnalysis: {
    title: string;
    severity: Severity;
    explanation: string;
    excerpt: string;
    section: string;
  }[];
};

export const contractDetail: ContractDetail = {
  id: "CTR-10470",
  name: "Manufacturing Supply Contract",
  counterparty: "Ironclad Components Ltd.",
  status: "Active",
  effective: "January 1, 2023",
  expiration: "December 31, 2025",
  created: "December 12, 2022",
  uploadedBy: {
    name: "Sarah Chen",
    initials: "SC",
    email: "sarah.chen@acme.com",
  },
  tags: ["Vendor", "High Value", "Regulated"],
  value: "$3.4M",
  type: "Supply Agreement",
  pages: 24,
  lastUpdated: "Yesterday at 4:32 PM",
  aiSummary: {
    keyObligations: [
      "Supplier must deliver 12,000 precision components per quarter within agreed tolerances.",
      "Buyer must provide rolling 90-day forecasts and binding purchase orders 30 days in advance.",
      "Supplier to maintain ISO 9001 certification and pass biannual quality audits.",
    ],
    paymentTerms: [
      "Net 45 payment terms from date of invoice.",
      "2% early-payment discount if settled within 15 days.",
      "Annual price escalation capped at 3.5% tied to PPI index.",
    ],
    terminationTerms: [
      "Either party may terminate for material breach with 60 days' written cure period.",
      "Buyer may terminate for convenience with 120 days' notice and a wind-down fee.",
      "Automatic renewal for successive 1-year terms unless cancelled 90 days prior.",
    ],
  },
  riskAnalysis: [
    {
      title: "Auto Renewal",
      severity: "High",
      explanation:
        "Contract renews automatically for 1-year terms unless cancelled 90 days before expiration. Missing this window locks in another full year.",
      excerpt:
        "This Agreement shall automatically renew for successive one (1) year terms unless either party provides written notice of non-renewal at least ninety (90) days prior to the end of the then-current term.",
      section: "Section 12.2 — Term & Renewal",
    },
    {
      title: "Unlimited Liability",
      severity: "Critical",
      explanation:
        "No aggregate cap on liability for the Buyer. Exposure is uncapped for damages arising from breach, well above the contract value.",
      excerpt:
        "Notwithstanding anything to the contrary, Buyer's liability for breach of its payment and indemnification obligations shall not be subject to any limitation or cap.",
      section: "Section 9.4 — Limitation of Liability",
    },
    {
      title: "Aggressive Indemnification",
      severity: "High",
      explanation:
        "Broad indemnification requires the Buyer to cover third-party claims including those arising from the Supplier's own negligence.",
      excerpt:
        "Buyer shall indemnify, defend and hold harmless Supplier from any and all claims, including those arising in whole or in part from Supplier's negligence.",
      section: "Section 10.1 — Indemnification",
    },
    {
      title: "IP Assignment",
      severity: "Medium",
      explanation:
        "Any tooling or process improvements co-developed during the engagement are assigned to the Supplier rather than jointly owned.",
      excerpt:
        "All improvements, modifications, and derivative works to the manufacturing process developed hereunder shall be the sole and exclusive property of Supplier.",
      section: "Section 8.3 — Intellectual Property",
    },
    {
      title: "Non-Compete",
      severity: "Medium",
      explanation:
        "Buyer is restricted from sourcing comparable components from competing suppliers for 18 months in defined regions.",
      excerpt:
        "During the Term and for eighteen (18) months thereafter, Buyer shall not engage any competing supplier for components substantially similar to those provided herein within the Territory.",
      section: "Section 11.5 — Exclusivity",
    },
    {
      title: "Unilateral Modification",
      severity: "Low",
      explanation:
        "Supplier may adjust delivery schedules with limited notice, which could disrupt Buyer's production planning.",
      excerpt:
        "Supplier reserves the right to modify delivery schedules upon fifteen (15) days' notice where required by manufacturing capacity constraints.",
      section: "Section 4.6 — Delivery",
    },
  ],
};

export type InternalNote = {
  id: string;
  author: string;
  initials: string;
  role: string;
  time: string;
  body: string;
  replies?: {
    id: string;
    author: string;
    initials: string;
    role: string;
    time: string;
    body: string;
  }[];
};

export const internalNotes: InternalNote[] = [
  {
    id: "n1",
    author: "Priya Natarajan",
    initials: "PN",
    role: "General Counsel",
    time: "2 hours ago",
    body: "The uncapped liability clause in 9.4 is a non-starter for renewal. We need to push for a cap at 12 months of fees before this auto-renews in December.",
    replies: [
      {
        id: "n1r1",
        author: "Alex Rivera",
        initials: "AR",
        role: "Administrator",
        time: "1 hour ago",
        body: "Agreed. I've flagged it with procurement. Let's get a redline draft over to Ironclad this week.",
      },
      {
        id: "n1r2",
        author: "David Okafor",
        initials: "DO",
        role: "Contracts Manager",
        time: "47 min ago",
        body: "I'll prepare the redline. Also want to revisit the 18-month non-compete in 11.5 — it's broader than our standard.",
      },
    ],
  },
  {
    id: "n2",
    author: "Sarah Chen",
    initials: "SC",
    role: "Legal Analyst",
    time: "Yesterday",
    body: "Uploaded the latest executed version with the Q3 amendment attached. AI analysis re-ran clean except for the items already flagged.",
  },
];

export type TimelineEventType =
  | "upload"
  | "status"
  | "analysis"
  | "witness"
  | "user"
  | "note";

export const contractTimeline: {
  type: TimelineEventType;
  actor: string;
  initials: string;
  action: string;
  detail?: string;
  time: string;
}[] = [
  {
    type: "note",
    actor: "Priya Natarajan",
    initials: "PN",
    action: "added an internal note",
    detail: "Flagged uncapped liability clause ahead of renewal",
    time: "2 hours ago",
  },
  {
    type: "witness",
    actor: "David Okafor",
    initials: "DO",
    action: "generated a witness link",
    detail: "Shared with external counsel · expires in 7 days",
    time: "Yesterday, 4:32 PM",
  },
  {
    type: "analysis",
    actor: "Clausio AI",
    initials: "AI",
    action: "completed AI analysis",
    detail: "6 risk flags identified across 24 pages",
    time: "Yesterday, 4:18 PM",
  },
  {
    type: "upload",
    actor: "Sarah Chen",
    initials: "SC",
    action: "uploaded a new version",
    detail: "v3.0 — executed copy with Q3 amendment",
    time: "Yesterday, 4:11 PM",
  },
  {
    type: "status",
    actor: "Alex Rivera",
    initials: "AR",
    action: "changed status to Active",
    detail: "From Draft",
    time: "Jan 2, 2023",
  },
  {
    type: "upload",
    actor: "Sarah Chen",
    initials: "SC",
    action: "uploaded the original contract",
    detail: "Manufacturing Supply Contract.pdf · 24 pages",
    time: "Dec 12, 2022",
  },
];

// Mock contract body for the PDF viewer pages
export const contractPages: {
  heading: string;
  clauses: { num: string; title: string; body: string }[];
}[] = [
  {
    heading: "Manufacturing Supply Agreement",
    clauses: [
      {
        num: "1.",
        title: "Parties & Recitals",
        body: 'This Manufacturing Supply Agreement (the "Agreement") is entered into as of January 1, 2023 (the "Effective Date") by and between Acme Corporation, a Delaware corporation ("Buyer"), and Ironclad Components Ltd., a company organized under the laws of England and Wales ("Supplier").',
      },
      {
        num: "2.",
        title: "Definitions",
        body: 'Capitalized terms used herein shall have the meanings ascribed to them in this Section 2. "Components" means the precision-machined parts described in Exhibit A. "Specifications" means the technical requirements set forth in Exhibit B, as amended from time to time by mutual written agreement.',
      },
      {
        num: "3.",
        title: "Supply Obligations",
        body: "Supplier shall manufacture and deliver to Buyer the Components in the quantities set forth in each Purchase Order, conforming in all respects to the Specifications. Supplier shall deliver no fewer than twelve thousand (12,000) Components per calendar quarter.",
      },
    ],
  },
  {
    heading: "Pricing, Delivery & Quality",
    clauses: [
      {
        num: "4.6",
        title: "Delivery",
        body: "Supplier reserves the right to modify delivery schedules upon fifteen (15) days' notice where required by manufacturing capacity constraints. Title and risk of loss shall pass to Buyer upon delivery to the named carrier (FCA, Supplier's facility).",
      },
      {
        num: "5.",
        title: "Pricing & Payment",
        body: "Buyer shall pay Supplier the prices set forth in Exhibit A. Payment terms are Net forty-five (45) days from the date of invoice. A two percent (2%) discount applies to invoices settled within fifteen (15) days. Annual price escalation shall not exceed three and one-half percent (3.5%).",
      },
    ],
  },
  {
    heading: "IP, Liability & Indemnification",
    clauses: [
      {
        num: "8.3",
        title: "Intellectual Property",
        body: "All improvements, modifications, and derivative works to the manufacturing process developed hereunder shall be the sole and exclusive property of Supplier.",
      },
      {
        num: "9.4",
        title: "Limitation of Liability",
        body: "Notwithstanding anything to the contrary, Buyer's liability for breach of its payment and indemnification obligations shall not be subject to any limitation or cap.",
      },
      {
        num: "10.1",
        title: "Indemnification",
        body: "Buyer shall indemnify, defend and hold harmless Supplier from any and all claims, including those arising in whole or in part from Supplier's negligence.",
      },
    ],
  },
  {
    heading: "Term, Exclusivity & General",
    clauses: [
      {
        num: "11.5",
        title: "Exclusivity",
        body: "During the Term and for eighteen (18) months thereafter, Buyer shall not engage any competing supplier for components substantially similar to those provided herein within the Territory.",
      },
      {
        num: "12.2",
        title: "Term & Renewal",
        body: "This Agreement shall automatically renew for successive one (1) year terms unless either party provides written notice of non-renewal at least ninety (90) days prior to the end of the then-current term.",
      },
    ],
  },
];

// Full contract catalog for the Contracts list page
export const allContracts: Contract[] = [
  {
    id: "CTR-10482",
    name: "Master Services Agreement",
    counterparty: "Northwind Logistics Inc.",
    status: "Active",
    effective: "Mar 15, 2024",
    expiration: "Mar 14, 2026",
    risk: "Low",
    updated: "2 hours ago",
    value: "$1.2M",
    type: "MSA",
    tags: ["Customer", "High Value"],
  },
  {
    id: "CTR-10479",
    name: "Enterprise SaaS License",
    counterparty: "Helios Cloud Systems",
    status: "Active",
    effective: "Jan 03, 2024",
    expiration: "Jan 02, 2026",
    risk: "High",
    updated: "5 hours ago",
    value: "$480K",
    type: "License",
    tags: ["Vendor", "Auto-Renew"],
  },
  {
    id: "CTR-10475",
    name: "Mutual NDA",
    counterparty: "Vertex Biolabs",
    status: "Draft",
    effective: "—",
    expiration: "—",
    risk: "Low",
    updated: "Yesterday",
    value: "—",
    type: "NDA",
    tags: ["Confidential"],
  },
  {
    id: "CTR-10470",
    name: "Manufacturing Supply Contract",
    counterparty: "Ironclad Components Ltd.",
    status: "Active",
    effective: "Jan 01, 2023",
    expiration: "Dec 31, 2025",
    risk: "Critical",
    updated: "Yesterday",
    value: "$3.4M",
    type: "Supply",
    tags: ["Vendor", "High Value", "Regulated"],
  },
  {
    id: "CTR-10463",
    name: "Consulting Engagement",
    counterparty: "Meridian Advisory Group",
    status: "Expired",
    effective: "Feb 01, 2024",
    expiration: "Nov 01, 2025",
    risk: "Medium",
    updated: "3 days ago",
    value: "$220K",
    type: "SOW",
    tags: ["Vendor"],
  },
  {
    id: "CTR-10458",
    name: "Data Processing Addendum",
    counterparty: "Quantia Analytics",
    status: "Active",
    effective: "Aug 19, 2024",
    expiration: "Aug 18, 2026",
    risk: "Medium",
    updated: "4 days ago",
    value: "—",
    type: "DPA",
    tags: ["Compliance", "Regulated"],
  },
  {
    id: "CTR-10451",
    name: "Reseller Partnership Agreement",
    counterparty: "Brightline Partners",
    status: "Terminated",
    effective: "May 10, 2023",
    expiration: "Oct 12, 2025",
    risk: "High",
    updated: "6 days ago",
    value: "$910K",
    type: "Partnership",
    tags: ["Customer", "High Value"],
  },
  {
    id: "CTR-10447",
    name: "Office Lease Agreement",
    counterparty: "Cushwood Properties",
    status: "Active",
    effective: "Jul 25, 2022",
    expiration: "Jul 24, 2026",
    risk: "Medium",
    updated: "1 week ago",
    value: "$1.1M",
    type: "Lease",
    tags: ["High Value"],
  },
  {
    id: "CTR-10442",
    name: "Marketing Retainer",
    counterparty: "Pulse Creative Studio",
    status: "Active",
    effective: "Feb 12, 2025",
    expiration: "Feb 11, 2026",
    risk: "Low",
    updated: "1 week ago",
    value: "$95K",
    type: "SOW",
    tags: ["Vendor", "Auto-Renew"],
  },
  {
    id: "CTR-10438",
    name: "Cloud Infrastructure Agreement",
    counterparty: "Stratus Compute Co.",
    status: "Active",
    effective: "Apr 01, 2024",
    expiration: "Mar 31, 2027",
    risk: "High",
    updated: "2 weeks ago",
    value: "$2.7M",
    type: "MSA",
    tags: ["Vendor", "High Value", "Auto-Renew"],
  },
  {
    id: "CTR-10431",
    name: "Employee Confidentiality Agreement",
    counterparty: "Internal — People Ops",
    status: "Active",
    effective: "Sep 01, 2024",
    expiration: "—",
    risk: "Low",
    updated: "2 weeks ago",
    value: "—",
    type: "NDA",
    tags: ["Confidential", "Compliance"],
  },
  {
    id: "CTR-10427",
    name: "Software Development SOW",
    counterparty: "Lattice Engineering",
    status: "Draft",
    effective: "—",
    expiration: "—",
    risk: "Medium",
    updated: "3 weeks ago",
    value: "$640K",
    type: "SOW",
    tags: ["Vendor"],
  },
  {
    id: "CTR-10419",
    name: "Distribution Agreement",
    counterparty: "Cascade Retail Group",
    status: "Active",
    effective: "Jun 15, 2024",
    expiration: "Jun 14, 2026",
    risk: "High",
    updated: "3 weeks ago",
    value: "$1.8M",
    type: "Partnership",
    tags: ["Customer", "High Value", "Auto-Renew"],
  },
  {
    id: "CTR-10412",
    name: "Equipment Lease",
    counterparty: "Apex Industrial Rentals",
    status: "Expired",
    effective: "Oct 01, 2022",
    expiration: "Sep 30, 2025",
    risk: "Medium",
    updated: "1 month ago",
    value: "$320K",
    type: "Lease",
    tags: ["Vendor"],
  },
  {
    id: "CTR-10405",
    name: "Joint Venture Agreement",
    counterparty: "Solstice Energy Holdings",
    status: "Active",
    effective: "Jan 15, 2025",
    expiration: "Jan 14, 2030",
    risk: "Critical",
    updated: "1 month ago",
    value: "$8.5M",
    type: "Partnership",
    tags: ["High Value", "Regulated", "Confidential"],
  },
  {
    id: "CTR-10398",
    name: "Vendor Services Agreement",
    counterparty: "Cobalt Facilities Mgmt.",
    status: "Terminated",
    effective: "Mar 01, 2023",
    expiration: "Feb 28, 2025",
    risk: "Low",
    updated: "1 month ago",
    value: "$140K",
    type: "MSA",
    tags: ["Vendor"],
  },
  {
    id: "CTR-10390",
    name: "Channel Reseller License",
    counterparty: "Nimbus Software Group",
    status: "Active",
    effective: "Dec 01, 2024",
    expiration: "Nov 30, 2026",
    risk: "Medium",
    updated: "2 months ago",
    value: "$520K",
    type: "License",
    tags: ["Customer", "Auto-Renew"],
  },
  {
    id: "CTR-10381",
    name: "Clinical Research Agreement",
    counterparty: "Vertex Biolabs",
    status: "Draft",
    effective: "—",
    expiration: "—",
    risk: "High",
    updated: "2 months ago",
    value: "$1.4M",
    type: "MSA",
    tags: ["Regulated", "Confidential", "High Value"],
  },
];

// ── AI Analysis page data ─────────────────────────────────────────────────

export type AnalysisStatus = "Complete" | "Analyzing" | "Outdated" | "Queued";

export const analysisContracts = allContracts.map((c) => ({
  id: c.id,
  name: c.name,
  counterparty: c.counterparty,
}));

export type RiskFinding = {
  type: string;
  severity: Severity;
  excerpt: string;
  explanation: string;
  section: string;
};

export type Recommendation = {
  priority: "Urgent" | "Recommended" | "Optional";
  title: string;
  detail: string;
};

export type AnalysisHistoryEntry = {
  version: string;
  date: string;
  trigger: string;
  actor: string;
  initials: string;
  riskScore: number;
  findings: number;
  status: AnalysisStatus;
};

export type ContractAnalysis = {
  contractId: string;
  status: AnalysisStatus;
  lastRun: string;
  model: string;
  confidence: number;
  riskScore: number;
  riskScoreDelta: number;
  processingTime: string;
  executiveSummary: string;
  keyObligations: { party: string; obligation: string; deadline: string }[];
  paymentAnalysis: {
    terms: string;
    schedule: string;
    penalties: string;
    escalation: string;
    metrics: { label: string; value: string }[];
  };
  terminationAnalysis: {
    forCause: string;
    forConvenience: string;
    autoRenewal: string;
    noticePeriod: string;
    flag: string;
  };
  riskMatrix: { level: RiskLevel; count: number }[];
  riskByCategory: { category: string; score: number }[];
  findings: RiskFinding[];
  recommendations: Recommendation[];
  history: AnalysisHistoryEntry[];
};

export const contractAnalysis: ContractAnalysis = {
  contractId: "CTR-10470",
  status: "Complete",
  lastRun: "Yesterday at 4:18 PM",
  model: "Clausio Legal Intelligence v4.2",
  confidence: 94,
  riskScore: 72,
  riskScoreDelta: 8,
  processingTime: "38s",
  executiveSummary:
    "This Manufacturing Supply Agreement with Ironclad Components Ltd. carries an elevated overall risk profile driven primarily by an uncapped liability provision and an aggressive indemnification structure favoring the supplier. The contract auto-renews for successive one-year terms with a 90-day cancellation window, creating a near-term renewal decision point before December 31, 2025. Payment terms are favorable (Net 45 with early-payment discount), but a Supplier-favorable IP assignment clause and an 18-month post-term non-compete warrant negotiation before the next renewal cycle. Six material findings were identified across 24 pages, two of which are rated High or Critical and should be escalated to legal review.",
  keyObligations: [
    {
      party: "Supplier",
      obligation: "Deliver ≥12,000 precision components per quarter to spec",
      deadline: "Quarterly",
    },
    {
      party: "Buyer",
      obligation: "Provide rolling 90-day forecasts and binding POs",
      deadline: "30 days advance",
    },
    {
      party: "Supplier",
      obligation: "Maintain ISO 9001 certification and pass quality audits",
      deadline: "Biannual",
    },
    {
      party: "Buyer",
      obligation: "Settle invoices under Net 45 payment terms",
      deadline: "45 days",
    },
    {
      party: "Both",
      obligation: "Provide written notice of non-renewal to avoid auto-renew",
      deadline: "90 days prior",
    },
  ],
  paymentAnalysis: {
    terms: "Net 45 from invoice date",
    schedule: "Monthly invoicing against delivered quantities",
    penalties: "1.5% monthly late fee on overdue balances",
    escalation: "Annual price escalation capped at 3.5% (PPI-indexed)",
    metrics: [
      { label: "Annual Contract Value", value: "$3.4M" },
      { label: "Payment Terms", value: "Net 45" },
      { label: "Early-Pay Discount", value: "2% / 15 days" },
      { label: "Escalation Cap", value: "3.5% / yr" },
    ],
  },
  terminationAnalysis: {
    forCause: "Either party, material breach, 60-day cure period",
    forConvenience: "Buyer only, 120-day notice + wind-down fee",
    autoRenewal: "Successive 1-year terms unless cancelled",
    noticePeriod: "90 days prior to term end",
    flag: "Auto-renewal window closes Oct 2, 2025 — action required to prevent lock-in.",
  },
  riskMatrix: [
    { level: "Critical", count: 1 },
    { level: "High", count: 2 },
    { level: "Medium", count: 2 },
    { level: "Low", count: 1 },
  ],
  riskByCategory: [
    { category: "Liability", score: 92 },
    { category: "Renewal", score: 78 },
    { category: "Indemnity", score: 81 },
    { category: "IP Rights", score: 64 },
    { category: "Termination", score: 55 },
    { category: "Compliance", score: 38 },
  ],
  findings: [
    {
      type: "Unlimited Liability",
      severity: "Critical",
      excerpt:
        "Notwithstanding anything to the contrary, Buyer's liability for breach of its payment and indemnification obligations shall not be subject to any limitation or cap.",
      explanation:
        "No aggregate cap on Buyer liability. Exposure is uncapped for damages, potentially far exceeding total contract value.",
      section: "§9.4 Limitation of Liability",
    },
    {
      type: "Auto Renewal",
      severity: "High",
      excerpt:
        "This Agreement shall automatically renew for successive one (1) year terms unless either party provides written notice at least ninety (90) days prior to the end of the then-current term.",
      explanation:
        "Auto-renews for 1-year terms unless cancelled 90 days prior. Missing the window locks in another full year.",
      section: "§12.2 Term & Renewal",
    },
    {
      type: "Aggressive Indemnification",
      severity: "High",
      excerpt:
        "Buyer shall indemnify, defend and hold harmless Supplier from any and all claims, including those arising in whole or in part from Supplier's negligence.",
      explanation:
        "Broad indemnity requires Buyer to cover claims even where the Supplier was negligent — atypical and unfavorable.",
      section: "§10.1 Indemnification",
    },
    {
      type: "IP Assignment",
      severity: "Medium",
      excerpt:
        "All improvements, modifications, and derivative works to the manufacturing process developed hereunder shall be the sole and exclusive property of Supplier.",
      explanation:
        "Co-developed process improvements assign entirely to Supplier rather than being jointly owned.",
      section: "§8.3 Intellectual Property",
    },
    {
      type: "Non-Compete",
      severity: "Medium",
      excerpt:
        "During the Term and for eighteen (18) months thereafter, Buyer shall not engage any competing supplier for components substantially similar to those provided herein within the Territory.",
      explanation:
        "18-month post-term exclusivity restricts Buyer's sourcing flexibility within defined regions.",
      section: "§11.5 Exclusivity",
    },
    {
      type: "Unilateral Modification",
      severity: "Low",
      excerpt:
        "Supplier reserves the right to modify delivery schedules upon fifteen (15) days' notice where required by manufacturing capacity constraints.",
      explanation:
        "Supplier may adjust delivery schedules with short notice, which could disrupt Buyer production planning.",
      section: "§4.6 Delivery",
    },
  ],
  recommendations: [
    {
      priority: "Urgent",
      title: "Negotiate a liability cap before renewal",
      detail:
        "Propose capping aggregate liability at 12 months of fees. The current uncapped provision (§9.4) is the single largest source of risk exposure.",
    },
    {
      priority: "Urgent",
      title: "Calendar the non-renewal deadline",
      detail:
        "Set an internal reminder for September 2, 2025 — 30 days before the 90-day cancellation window closes on October 2, 2025.",
    },
    {
      priority: "Recommended",
      title: "Rebalance indemnification language",
      detail:
        "Carve out Supplier's own negligence from Buyer's indemnity obligation in §10.1 to align with market-standard mutual indemnification.",
    },
    {
      priority: "Recommended",
      title: "Convert IP assignment to joint ownership",
      detail:
        "Amend §8.3 so co-developed process improvements are jointly owned or licensed back to Buyer for internal use.",
    },
    {
      priority: "Optional",
      title: "Tighten delivery-modification notice",
      detail:
        "Extend the §4.6 notice period from 15 to 30 days to better protect Buyer's production scheduling.",
    },
  ],
  history: [
    {
      version: "v3.0",
      date: "Apr 14, 2026 · 4:18 PM",
      trigger: "Document re-upload",
      actor: "Sarah Chen",
      initials: "SC",
      riskScore: 72,
      findings: 6,
      status: "Complete",
    },
    {
      version: "v2.0",
      date: "Feb 02, 2026 · 11:02 AM",
      trigger: "Q3 amendment added",
      actor: "David Okafor",
      initials: "DO",
      riskScore: 80,
      findings: 7,
      status: "Outdated",
    },
    {
      version: "v1.0",
      date: "Dec 12, 2025 · 9:47 AM",
      trigger: "Initial upload",
      actor: "Sarah Chen",
      initials: "SC",
      riskScore: 85,
      findings: 8,
      status: "Outdated",
    },
  ],
};
