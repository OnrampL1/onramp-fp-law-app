import type { DashboardContractItem } from "./dashboard";

export type RiskCategory =
  | "LIABILITY"
  | "INDEMNIFICATION"
  | "AUTO_RENEWAL"
  | "TERMINATION"
  | "PAYMENT"
  | "CONFIDENTIALITY"
  | "NON_COMPETE"
  | "IP_ASSIGNMENT"
  | "OTHER";

export interface RiskCategorySummary {
  category: RiskCategory;
  contractCount: number;
}

export interface InsightsSummary {
  categories: RiskCategorySummary[];
}

export interface InsightCategoryContracts {
  category: RiskCategory;
  contracts: DashboardContractItem[];
}
