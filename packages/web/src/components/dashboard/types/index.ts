// ─── Shared domain types ──────────────────────────────────────────────────────

export type ContractStatus = "Active" | "Draft" | "Expired" | "Terminated";
export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export interface Contract {
  id: string;
  name: string;
  type: string;
  counterparty: string;
  status: ContractStatus;
  expirationDate: string | null;
  riskLevel: RiskLevel;
  lastUpdated: string;
}

export interface ActivityItem {
  id: string;
  actor: string;
  actorType: "user" | "ai";
  action: string;
  target: string;
  time: string;
}

export interface ExpiringContract {
  daysLeft: number;
  name: string;
  counterparty: string;
  value?: string;
  risk: RiskLevel;
}

export interface AiInsight {
  icon: React.ReactNode;
  label: string;
  count: number;
  description: string;
}

export interface StatCardData {
  icon: React.ReactNode;
  delta: string;
  deltaPositive: boolean;
  value: string | number;
  label: string;
  sublabel?: string;
}