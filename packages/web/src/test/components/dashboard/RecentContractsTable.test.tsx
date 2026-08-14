import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RecentContracts } from "@/components/dashboard/RecentContractsTable";
import type { DashboardContractItem } from "@/types/dashboard";

const contract: DashboardContractItem = {
  id: "00000000-0000-4000-8000-000000000309",
  title: "Vendor Services Agreement",
  counterparty: "Coral Bay Hospitality Group",
  businessStatus: "UNDER_REVIEW",
  legalState: "ACTIVE",
  effectiveDate: null,
  expirationDate: "2026-08-26",
  updatedAt: "2026-08-13T10:15:00.000Z",
};

function renderComponent(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("RecentContracts", () => {
  it("renders real dashboard contract rows", () => {
    renderComponent(<RecentContracts contracts={[contract]} />);

    expect(screen.getByText("Vendor Services Agreement")).toBeInTheDocument();
    expect(screen.getByText("Coral Bay Hospitality Group")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Under review")).toBeInTheDocument();

    expect(
      screen.queryByRole("columnheader", { name: /risk level/i }),
    ).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no contracts", () => {
    renderComponent(<RecentContracts contracts={[]} />);

    expect(
      screen.getByText("No contracts have been uploaded yet."),
    ).toBeInTheDocument();
  });

  it("shows a loading state", () => {
    renderComponent(<RecentContracts contracts={undefined} isLoading />);

    expect(screen.getByText("Loading recent contracts...")).toBeInTheDocument();
  });
});
