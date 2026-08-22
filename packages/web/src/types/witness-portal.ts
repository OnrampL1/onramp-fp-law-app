import type { WitnessLinkResult } from "./witness";
import type { ContractDetailResponse } from "./contracts";

// Matches toPublicContractPreview() in witness.service.ts — the minimal
// preview returned alongside redemption, not the full scoped-read view.
export interface WitnessContractPreview {
  id: string;
  title: string;
  counterparty: string;
  businessStatus: string;
  legalState: string | null;
  expirationDate: string | null;
}

export interface WitnessRedeemResult {
  contract: WitnessContractPreview;
  witnessToken: WitnessLinkResult;
}

// Matches WitnessScopedContract in openapi.yaml / the WITNESS_CONTRACT_SELECT
// fields — the real read-only view returned by GET /witness/contract, once
// a witness session cookie has been established.
export interface WitnessPortalContract {
  id: string;
  title: string;
  counterparty: string;
  businessStatus: string;
  legalState: string | null;
  tags: string[];
  effectiveDate: string | null;
  expirationDate: string | null;
  // Only PENDING_EXTRACTION/EXTRACTION_FAILED matter to the portal UI — the
  // AI_* values are internal analysis progress, irrelevant to a witness, and
  // treated the same as EXTRACTION_COMPLETED (show the document).
  processingStatus: ContractDetailResponse["processingStatus"];
  processingError: string | null;
  extractedText: string | null;
}
