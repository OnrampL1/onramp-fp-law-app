export interface LegalKbOfficialGazetteReferenceDto {
  number: string | null;
  publishDate: string | null;
  page: string | null;
}

export interface LegalKbInvestigatorSourceDto {
  chunkId: string;
  excerpt: string;
  sourceId: string;
  headingPath: string | null;
  instrumentTitle: string;
  articleNumber: string | null;
  officialGazetteReference: LegalKbOfficialGazetteReferenceDto | null;
  amendingInstrument: string | null;
  amendmentEffectiveDate: string | null;
  promulgatingAuthority: string;
  compilerSource: string;
  sourceUrl: string;
  lastVerifiedAt: string | null;
}

export interface AskLegalKbResponseDto {
  answer: string;
  sources: LegalKbInvestigatorSourceDto[];
  confidence?: number;
  chunksRetrieved: number;
}
