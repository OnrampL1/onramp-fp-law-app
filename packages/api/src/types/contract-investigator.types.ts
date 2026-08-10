export interface InvestigatorSourceDto {
  chunkId: string;
  excerpt: string;
  headingPath: string | null;
}

export interface AskInvestigatorResponseDto {
  answer: string;
  sources: InvestigatorSourceDto[];
  confidence?: number;
  chunksRetrieved: number;
}
