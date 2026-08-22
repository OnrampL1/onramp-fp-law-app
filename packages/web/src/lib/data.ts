import { createElement } from "react";
import type { SecurityFeature } from "../components/witness-workflow/types";
import {
  LockIcon,
  ShieldCheckIcon,
  ComputerIcon,
  UserGroupIcon,
} from "../components/shared/icons";

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

// Contract detail fixtures, keyed by contract id so the detail page can look
// up the correct record for whichever contract was clicked (see
// contractDetailsById usage in ContractDetails.tsx).
export const contractDetails: Record<string, ContractDetail> = {
  "CTR-10470": {
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
    type: "Supply",
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
  },
  "CTR-10479": {
    id: "CTR-10479",
    name: "Enterprise SaaS License",
    counterparty: "Helios Cloud Systems",
    status: "Active",
    effective: "January 3, 2024",
    expiration: "January 2, 2026",
    created: "December 20, 2023",
    uploadedBy: {
      name: "David Okafor",
      initials: "DO",
      email: "david.okafor@acme.com",
    },
    tags: ["Vendor", "Auto-Renew"],
    value: "$480K",
    type: "License",
    pages: 18,
    lastUpdated: "5 hours ago",
    aiSummary: {
      keyObligations: [
        "Vendor must maintain a 99.9% uptime SLA, with service credits owed for shortfalls.",
        "Customer must maintain a minimum of 250 licensed seats for the contract term.",
      ],
      paymentTerms: [
        "Annual subscription fee billed upfront, Net 30.",
        "Vendor may raise fees up to 3% annually with 60 days' notice.",
      ],
      terminationTerms: [
        "Auto-renews annually unless either party gives 60 days' written notice.",
        "Customer may terminate for cause after two consecutive quarters of SLA breach.",
      ],
    },
    riskAnalysis: [
      {
        title: "Auto-Renewal Lock-In",
        severity: "High",
        explanation:
          "The license renews automatically each year with only a narrow 60-day cancellation window, risking an unintended renewal.",
        excerpt:
          "This Agreement shall automatically renew for successive one (1) year terms unless either party provides written notice of non-renewal at least sixty (60) days prior to the end of the then-current term.",
        section: "Section 14.1 — Renewal",
      },
      {
        title: "Unilateral Price Escalation",
        severity: "Medium",
        explanation:
          "Vendor may raise fees up to 3% annually with limited notice and no negotiated cap beyond the stated ceiling.",
        excerpt:
          "Vendor may increase the Subscription Fee by up to three percent (3%) upon sixty (60) days' written notice to Customer.",
        section: "Section 6.2 — Fees",
      },
    ],
  },
  "CTR-10447": {
    id: "CTR-10447",
    name: "Office Lease Agreement",
    counterparty: "Cushwood Properties",
    status: "Active",
    effective: "July 25, 2022",
    expiration: "July 24, 2026",
    created: "July 10, 2022",
    uploadedBy: {
      name: "Priya Natarajan",
      initials: "PN",
      email: "priya.natarajan@acme.com",
    },
    tags: ["High Value"],
    value: "$1.1M",
    type: "Lease",
    pages: 32,
    lastUpdated: "1 week ago",
    aiSummary: {
      keyObligations: [
        "Tenant is responsible for base rent plus its proportionate share of operating expenses (CAM).",
        "Landlord must provide 90 days' notice before renovations affecting the tenant's space.",
      ],
      paymentTerms: [
        "Base rent due monthly in advance, escalating 2.5% annually.",
        "Security deposit equal to three months' rent held for the lease term.",
      ],
      terminationTerms: [
        "Tenant may terminate early with 6 months' notice and an early termination fee equal to 4 months' rent.",
        "Automatic renewal for one 5-year option period unless tenant opts out 180 days prior to expiration.",
      ],
    },
    riskAnalysis: [
      {
        title: "Early Termination Penalty",
        severity: "Medium",
        explanation:
          "Exiting the lease early requires 6 months' notice plus a fee equal to 4 months' rent, a significant cost to unwind the space.",
        excerpt:
          "Tenant may terminate this Lease prior to the Expiration Date upon six (6) months' written notice and payment of an early termination fee equal to four (4) months' Base Rent.",
        section: "Section 22.3 — Early Termination",
      },
      {
        title: "Long Renewal Option Window",
        severity: "Low",
        explanation:
          "The lease automatically carries a 5-year renewal option unless the tenant opts out far in advance, which is easy to miss.",
        excerpt:
          "Tenant shall have one (1) option to renew this Lease for an additional five (5) year term, which shall apply automatically unless Tenant provides notice of non-renewal at least one hundred eighty (180) days prior to the Expiration Date.",
        section: "Section 3.4 — Renewal Option",
      },
    ],
  },
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

export const internalNotesById: Record<string, InternalNote[]> = {
  "CTR-10470": [
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
  ],
  "CTR-10479": [
    {
      id: "n1",
      author: "David Okafor",
      initials: "DO",
      role: "Contracts Manager",
      time: "5 hours ago",
      body: "Helios confirmed the 250-seat floor still applies even if usage drops. Flagging for renewal review ahead of the Q4 window.",
    },
  ],
  "CTR-10447": [
    {
      id: "n1",
      author: "Priya Natarajan",
      initials: "PN",
      role: "General Counsel",
      time: "1 week ago",
      body: "The 4-month early termination fee in 22.3 is steep — let's flag this before we consider consolidating office space.",
    },
  ],
};

export type TimelineEventType =
  | "upload"
  | "status"
  | "analysis"
  | "witness"
  | "user"
  | "note";

export const contractTimelineById: Record<
  string,
  {
    type: TimelineEventType;
    actor: string;
    initials: string;
    action: string;
    detail?: string;
    time: string;
  }[]
> = {
  "CTR-10470": [
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
  ],
  "CTR-10479": [
    {
      type: "analysis",
      actor: "Clausio AI",
      initials: "AI",
      action: "completed AI analysis",
      detail: "2 risk flags identified across 18 pages",
      time: "5 hours ago",
    },
    {
      type: "note",
      actor: "David Okafor",
      initials: "DO",
      action: "added an internal note",
      detail: "Flagged the 250-seat renewal floor",
      time: "5 hours ago",
    },
    {
      type: "status",
      actor: "David Okafor",
      initials: "DO",
      action: "changed status to Active",
      detail: "From Draft",
      time: "Jan 3, 2024",
    },
    {
      type: "upload",
      actor: "David Okafor",
      initials: "DO",
      action: "uploaded the original contract",
      detail: "Enterprise SaaS License.pdf · 18 pages",
      time: "Dec 20, 2023",
    },
  ],
  "CTR-10447": [
    {
      type: "analysis",
      actor: "Clausio AI",
      initials: "AI",
      action: "completed AI analysis",
      detail: "2 risk flags identified across 32 pages",
      time: "1 week ago",
    },
    {
      type: "note",
      actor: "Priya Natarajan",
      initials: "PN",
      action: "added an internal note",
      detail: "Flagged the early termination fee",
      time: "1 week ago",
    },
    {
      type: "status",
      actor: "Priya Natarajan",
      initials: "PN",
      action: "changed status to Active",
      detail: "From Draft",
      time: "Jul 25, 2022",
    },
    {
      type: "upload",
      actor: "Priya Natarajan",
      initials: "PN",
      action: "uploaded the original contract",
      detail: "Office Lease Agreement.pdf · 32 pages",
      time: "Jul 10, 2022",
    },
  ],
};

// Mock contract body for the PDF viewer pages, keyed by contract id
export const contractPagesById: Record<
  string,
  { heading: string; clauses: { num: string; title: string; body: string }[] }[]
> = {
  "CTR-10470": [
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
  ],
  "CTR-10479": [
    {
      heading: "License Grant & Term",
      clauses: [
        {
          num: "1.",
          title: "Parties & Term",
          body: 'This Software License Agreement (the "Agreement") is entered into as of January 3, 2024 by and between Acme Corporation ("Customer") and Helios Cloud Systems ("Vendor") for an initial term of twenty-four (24) months.',
        },
        {
          num: "2.",
          title: "License Grant",
          body: "Vendor grants Customer a non-exclusive, non-transferable license to access the Platform for up to two hundred fifty (250) named users.",
        },
      ],
    },
    {
      heading: "Fees & Renewal",
      clauses: [
        {
          num: "6.2",
          title: "Fees",
          body: "Vendor may increase the Subscription Fee by up to three percent (3%) upon sixty (60) days' written notice to Customer.",
        },
        {
          num: "14.1",
          title: "Renewal",
          body: "This Agreement shall automatically renew for successive one (1) year terms unless either party provides written notice of non-renewal at least sixty (60) days prior to the end of the then-current term.",
        },
      ],
    },
  ],
  "CTR-10447": [
    {
      heading: "Premises & Term",
      clauses: [
        {
          num: "1.",
          title: "Premises",
          body: 'This Lease (the "Lease") is entered into as of July 25, 2022 by and between Cushwood Properties ("Landlord") and Acme Corporation ("Tenant") for the premises described in Exhibit A.',
        },
        {
          num: "3.4",
          title: "Renewal Option",
          body: "Tenant shall have one (1) option to renew this Lease for an additional five (5) year term, which shall apply automatically unless Tenant provides notice of non-renewal at least one hundred eighty (180) days prior to the Expiration Date.",
        },
      ],
    },
    {
      heading: "Rent & Termination",
      clauses: [
        {
          num: "5.",
          title: "Base Rent",
          body: "Tenant shall pay Base Rent monthly in advance, escalating two and one-half percent (2.5%) annually, plus Tenant's proportionate share of Operating Expenses.",
        },
        {
          num: "22.3",
          title: "Early Termination",
          body: "Tenant may terminate this Lease prior to the Expiration Date upon six (6) months' written notice and payment of an early termination fee equal to four (4) months' Base Rent.",
        },
      ],
    },
  ],
};

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

// ── Contract Investigator page data ───────────────────────────────────────

export type ChatRole = "user" | "assistant";

export type SourceRef = {
  clause: string;
  title: string;
  excerpt: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  sources?: SourceRef[];
  confidence?: number;
};

export type Conversation = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  messages: ChatMessage[];
};

export const suggestedQuestions: string[] = [
  "What are the termination conditions?",
  "Is there a cap on liability?",
  "When does this contract auto-renew?",
  "Summarize the payment terms",
];

// Temporary: generic conversation history shared across contracts for demo
// purposes. When the backend is ready, scope this per contract id, e.g.:
//   const { data } = useQuery(['investigator-history', contractId], () => api.getConversations(contractId));
export const conversationHistory: Conversation[] = [
  {
    id: "conv-1",
    title: "Liability exposure",
    preview: "Is Buyer's liability capped under this agreement?",
    updatedAt: "2 days ago",
    messages: [
      {
        id: "conv-1-m1",
        role: "user",
        content: "Is Buyer's liability capped under this agreement?",
      },
      {
        id: "conv-1-m2",
        role: "assistant",
        content:
          "No. **Buyer's liability is uncapped** for breach of payment and indemnification obligations.",
        sources: [
          {
            clause: "Section 9.4",
            title: "Limitation of Liability",
            excerpt:
              "Notwithstanding anything to the contrary, Buyer's liability for breach of its payment and indemnification obligations shall not be subject to any limitation or cap.",
          },
        ],
        confidence: 96,
      },
    ],
  },
  {
    id: "conv-2",
    title: "Renewal window",
    preview: "When do we need to give notice to avoid auto-renewal?",
    updatedAt: "5 days ago",
    messages: [
      {
        id: "conv-2-m1",
        role: "user",
        content: "When do we need to give notice to avoid auto-renewal?",
      },
      {
        id: "conv-2-m2",
        role: "assistant",
        content:
          "You must provide **written notice at least 90 days** before the current term ends, or the agreement auto-renews for another year.",
        sources: [
          {
            clause: "Section 12.2",
            title: "Term & Renewal",
            excerpt:
              "This Agreement shall automatically renew for successive one (1) year terms unless either party provides written notice of non-renewal at least ninety (90) days prior to the end of the then-current term.",
          },
        ],
        confidence: 92,
      },
    ],
  },
];

// Very small keyword-matched mock resolver standing in for a real LLM call,
// grounded in the same per-contract data used on the Contract Details page.
// When the backend is ready, replace this with an API call:
//   const { data } = await api.askClauseInvestigator(contract.id, question);
export function resolveAnswer(
  question: string,
  contract: ContractDetail,
): { content: string; sources: SourceRef[]; confidence: number } {
  const q = question.toLowerCase();

  if (
    q.includes("payment") ||
    q.includes("invoice") ||
    q.includes("pay") ||
    q.includes("net ")
  ) {
    const term = contract.aiSummary.paymentTerms[0];
    return {
      content: `Based on the payment terms: **${term}**`,
      sources: [
        { clause: "Payment Terms", title: "Payment Terms", excerpt: term },
      ],
      confidence: 90,
    };
  }

  if (
    q.includes("renew") ||
    q.includes("terminat") ||
    q.includes("cancel") ||
    q.includes("notice") ||
    q.includes("expir")
  ) {
    const term = contract.aiSummary.terminationTerms[0];
    return {
      content: `Regarding termination and renewal: **${term}**`,
      sources: [
        { clause: "Termination", title: "Termination Terms", excerpt: term },
      ],
      confidence: 88,
    };
  }

  const words = q.split(/\s+/).filter((w) => w.length > 3);
  const findingMatch = contract.riskAnalysis.find((r) =>
    words.some((w) => r.title.toLowerCase().includes(w)),
  );

  if (findingMatch) {
    return {
      content: findingMatch.explanation,
      sources: [
        {
          clause: findingMatch.section,
          title: findingMatch.title,
          excerpt: findingMatch.excerpt,
        },
      ],
      confidence: 91,
    };
  }

  return {
    content:
      "I couldn't find a clause directly addressing that in this contract. Try asking about payment terms, termination, renewal, or liability.",
    sources: [],
    confidence: 55,
  };
}

// Witness Workflow page data --------------------------------------------------
//
// WITNESS_STATS / REVIEW_STAGES / ACCESS_ACTIVITY used to live here as mock
// data. They're now computed for real: KPI cards + the review-progress
// funnel from useWitnessLinkStats() (GET /users/witness-link/stats), and
// Access Activity from the real audit log (useAuditLogsList, filtered to
// the 3 witness actions) — see WitnessWorkflow.tsx / WitnessReviewProgress.tsx.

// ─── Security features ────────────────────────────────────────────────────────

export const SECURITY_FEATURES: SecurityFeature[] = [
  {
    icon: createElement(LockIcon),
    title: "Link Encryption",
    subtitle: "AES-256 token payloads",
    badgeLabel: "Secure",
    badgeVariant: "secure",
  },
  {
    icon: createElement(ShieldCheckIcon),
    title: "Token Validation",
    subtitle: "Signed, single-use JWT",
    badgeLabel: "Active",
    badgeVariant: "active",
  },
  {
    icon: createElement(ComputerIcon),
    title: "Access Restrictions",
    subtitle: "IP & device binding",
    badgeLabel: "Enforced",
    badgeVariant: "enforced",
  },
  {
    icon: createElement(UserGroupIcon),
    title: "Single Contract Scope",
    subtitle: "One contract per link",
    badgeLabel: "Verified",
    badgeVariant: "verified",
  },
];
