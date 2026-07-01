import type { WitnessReviewContract, WitnessInfo, DocumentPage } from "../types";

// ─── Contract being reviewed ──────────────────────────────────────────────────

export const REVIEW_CONTRACT: WitnessReviewContract = {
  name:          "Master Services Agreement",
  id:            "MSA-2026-0142",
  counterparty:  "Northwind Logistics, Inc.",
  effectiveDate: "June 1, 2026",
  status:        "Pending witness",
};

// ─── Witness details ──────────────────────────────────────────────────────────

export const WITNESS_INFO: WitnessInfo = {
  name:  "Jordan Avery",
  role:  "Independent Witness",
  email: "j.avery@external-counsel.com",
};

// ─── Document pages ───────────────────────────────────────────────────────────

export const DOCUMENT_PAGES: DocumentPage[] = [
  {
    pageNumber:  1,
    totalPages:  5,
    title:       "Master Services Agreement",
    sections: [
      {
        heading: "1. Definitions & Interpretation",
        paragraphs: [
          `This Master Services Agreement (the "Agreement") is entered into as of the Effective Date by and between Clausio Holdings, LLC ("Provider") and Northwind Logistics, Inc. ("Client"), each a "Party" and together the "Parties".`,
          `In this Agreement, capitalized terms have the meanings given to them in this Section 1 or where otherwise defined. "Confidential Information" means all non-public information disclosed by one Party to the other, whether oral, written, or electronic, that is designated as confidential or that reasonably should be understood to be confidential.`,
          `References to a Section are to a section of this Agreement unless otherwise stated. Headings are for convenience only and do not affect interpretation.`,
        ],
      },
    ],
  },
  {
    pageNumber:  2,
    totalPages:  5,
    title:       "Master Services Agreement",
    sections: [
      {
        heading: "2. Services",
        paragraphs: [
          `Provider agrees to perform the services described in one or more Statements of Work ("SOW") executed by both Parties. Each SOW shall specify the nature of the services, deliverables, timelines, and applicable fees.`,
          `Provider shall perform all services in a professional and workmanlike manner consistent with industry standards. Client shall provide timely access to personnel, systems, and information reasonably required for the performance of services.`,
        ],
      },
    ],
  },
  {
    pageNumber:  3,
    totalPages:  5,
    title:       "Master Services Agreement",
    sections: [
      {
        heading: "3. Fees and Payment",
        paragraphs: [
          `Client shall pay Provider the fees set forth in each SOW within thirty (30) days of receipt of an invoice. All fees are non-refundable except as expressly stated herein.`,
          `Any amounts not paid when due shall accrue interest at the rate of 1.5% per month or the maximum rate permitted by applicable law, whichever is less.`,
        ],
      },
    ],
  },
  {
    pageNumber:  4,
    totalPages:  5,
    title:       "Master Services Agreement",
    sections: [
      {
        heading: "4. Intellectual Property",
        paragraphs: [
          `Unless otherwise specified in an SOW, all work product, deliverables, and materials created by Provider in the course of performing services shall be owned by Client upon full payment of all applicable fees.`,
          `Provider retains ownership of any pre-existing tools, frameworks, or methodologies used in the performance of services.`,
        ],
      },
    ],
  },
  {
    pageNumber:  5,
    totalPages:  5,
    title:       "Master Services Agreement",
    sections: [
      {
        heading: "5. Term and Termination",
        paragraphs: [
          `This Agreement commences on the Effective Date and continues until terminated by either Party upon thirty (30) days written notice, or immediately upon material breach by the other Party.`,
          `Upon termination, each Party shall return or destroy the other's Confidential Information and certify such destruction in writing upon request.`,
        ],
      },
    ],
  },
];