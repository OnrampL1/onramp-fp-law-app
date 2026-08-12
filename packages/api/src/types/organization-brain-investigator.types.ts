export interface OrganizationBrainInvestigatorSourceDto {
  chunkId: string;
  excerpt: string;
  sourceId: string;
  headingPath: string | null;
}

export interface AskOrganizationBrainResponseDto {
  answer: string;
  sources: OrganizationBrainInvestigatorSourceDto[];
  confidence?: number;
  chunksRetrieved: number;
}
