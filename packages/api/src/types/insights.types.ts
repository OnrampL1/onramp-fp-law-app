import type { RiskCategory } from "@prisma/client";
import type { DashboardContractItemDto } from "./dashboard.types";

export interface RiskCategorySummaryDto {
  category: RiskCategory;
  contractCount: number;
}

export interface InsightsSummaryDto {
  categories: RiskCategorySummaryDto[];
}

export interface InsightCategoryContractsPaginationDto {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface InsightCategoryContractsDto {
  category: RiskCategory;
  contracts: DashboardContractItemDto[];
  pagination: InsightCategoryContractsPaginationDto;
}
