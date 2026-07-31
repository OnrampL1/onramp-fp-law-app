// ─── Witness Review types ─────────────────────────────────────────────────────

export interface WitnessReviewContract {
  name: string;
  id: string;
  counterparty: string;
  effectiveDate: string;
  status: string;
}

export interface WitnessInfo {
  name: string;
  role: string;
  email: string;
}

export interface DocumentPage {
  pageNumber: number;
  totalPages: number;
  title: string;
  sections: DocumentSection[];
}

export interface DocumentSection {
  heading: string;
  paragraphs: string[];
}