export interface AskHistoryTurn {
  question: string;
  answer: string;
}

export interface OrgBrainSource {
  chunkId: string;
  excerpt: string;
  sourceId: string;
  headingPath: string | null;
}

export interface AskOrgBrainPayload {
  question: string;
  history?: AskHistoryTurn[];
}

export interface AskOrgBrainResponse {
  answer: string;
  sources: OrgBrainSource[];
  confidence?: number;
  chunksRetrieved: number;
}

export interface LegalKbOfficialGazetteReference {
  number: string | null;
  publishDate: string | null;
  page: string | null;
}

// Mirrors packages/api/src/types/legal-kb-investigator.types.ts's
// LegalKbInvestigatorSourceDto — deliberately richer than OrgBrainSource
// (instrument/gazette/authority metadata that only exists for this
// corpus), not a shared shape forced onto both.
export interface LegalKbSource {
  chunkId: string;
  excerpt: string;
  sourceId: string;
  headingPath: string | null;
  instrumentTitle: string;
  articleNumber: string | null;
  officialGazetteReference: LegalKbOfficialGazetteReference | null;
  amendingInstrument: string | null;
  amendmentEffectiveDate: string | null;
  promulgatingAuthority: string;
  compilerSource: string;
  sourceUrl: string;
  lastVerifiedAt: string | null;
}

export interface AskLegalKbPayload {
  question: string;
  history?: AskHistoryTurn[];
}

export interface AskLegalKbResponse {
  answer: string;
  sources: LegalKbSource[];
  confidence?: number;
  chunksRetrieved: number;
}
