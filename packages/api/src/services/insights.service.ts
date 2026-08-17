import type { RiskCategory } from "@prisma/client";
import { insightsRepository } from "../repositories/insights.repository";
import { toContractItemDto } from "./dashboard.service";
import type {
  InsightCategoryContractsDto,
  InsightsSummaryDto,
  RiskCategorySummaryDto,
} from "../types/insights.types";

const RISK_CATEGORIES: RiskCategory[] = [
  "LIABILITY",
  "INDEMNIFICATION",
  "AUTO_RENEWAL",
  "TERMINATION",
  "PAYMENT",
  "CONFIDENTIALITY",
  "NON_COMPETE",
  "IP_ASSIGNMENT",
  "OTHER",
];

async function getSummary(organizationId: string): Promise<InsightsSummaryDto> {
  const pairs =
    await insightsRepository.getCategoryContractPairs(organizationId);

  const counts = new Map<RiskCategory, number>(
    RISK_CATEGORIES.map((category) => [category, 0]),
  );
  for (const pair of pairs) {
    counts.set(pair.category, (counts.get(pair.category) ?? 0) + 1);
  }

  const categories: RiskCategorySummaryDto[] = RISK_CATEGORIES.map(
    (category) => ({
      category,
      contractCount: counts.get(category) ?? 0,
    }),
  );

  return { categories };
}

async function getContractsForCategory(
  organizationId: string,
  category: RiskCategory,
): Promise<InsightCategoryContractsDto> {
  const rows = await insightsRepository.getContractsByCategory(
    organizationId,
    category,
  );
  return { category, contracts: rows.map(toContractItemDto) };
}

export const insightsService = {
  getSummary,
  getContractsForCategory,
};
