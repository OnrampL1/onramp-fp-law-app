import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { ExpiringContractsList } from "@/components/dashboard/ExpiringContractsList";
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

describe("ExpiringContractsList", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders real expiring contracts with days remaining", () => {
    renderComponent(<ExpiringContractsList contracts={[contract]} />);

    expect(screen.getByText("Vendor Services Agreement")).toBeInTheDocument();
    expect(screen.getByText(/Coral Bay Hospitality Group/)).toBeInTheDocument();
    expect(screen.getByText("13")).toBeInTheDocument();
    expect(screen.getByText("days")).toBeInTheDocument();
  });

  it("shows at most 3 contracts even when more are passed in", () => {
    const contracts: DashboardContractItem[] = Array.from(
      { length: 5 },
      (_, i) => ({
        ...contract,
        id: `contract-${i}`,
        title: `Contract ${i}`,
      }),
    );

    renderComponent(<ExpiringContractsList contracts={contracts} />);

    expect(screen.getByText("Contract 0")).toBeInTheDocument();
    expect(screen.getByText("Contract 1")).toBeInTheDocument();
    expect(screen.getByText("Contract 2")).toBeInTheDocument();
    expect(screen.queryByText("Contract 3")).not.toBeInTheDocument();
    expect(screen.queryByText("Contract 4")).not.toBeInTheDocument();
  });

  it("shows an empty state when no contracts expire soon", () => {
    renderComponent(<ExpiringContractsList contracts={[]} />);

    expect(
      screen.getByText("No contracts expire in the next 30 days."),
    ).toBeInTheDocument();
  });

  it("shows a loading state", () => {
    renderComponent(<ExpiringContractsList contracts={undefined} isLoading />);

    expect(
      screen.getByText("Loading expiring contracts..."),
    ).toBeInTheDocument();
  });
});
