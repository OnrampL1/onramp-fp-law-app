export interface ContractNoteDto {
  id: string;
  contractId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractNoteListPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ContractNoteListResult {
  items: ContractNoteDto[];
  pagination: ContractNoteListPaginationMeta;
}
