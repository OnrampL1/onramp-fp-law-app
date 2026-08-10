export interface InvestigatorSource {
  chunkId: string;
  excerpt: string;
  headingPath: string | null;
}

export interface InvestigatorHistoryTurn {
  question: string;
  answer: string;
}

export interface AskInvestigatorPayload {
  question: string;
  history?: InvestigatorHistoryTurn[];
}

export interface AskInvestigatorResponse {
  answer: string;
  sources: InvestigatorSource[];
  confidence?: number;
  chunksRetrieved: number;
}
