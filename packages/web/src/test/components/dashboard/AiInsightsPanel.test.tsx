import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { AiInsightsPanel } from "@/components/dashboard/AiInsightsPanel";

const mocks = vi.hoisted(() => ({
  useInsightsSummary: vi.fn(),
}));

vi.mock("@/hooks/useInsights", () => ({
  useInsightsSummary: mocks.useInsightsSummary,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AiInsightsPanel", () => {
  it("renders real per-category contract counts", () => {
    mocks.useInsightsSummary.mockReturnValue({
      data: {
        categories: [
          { category: "LIABILITY", contractCount: 3 },
          { category: "AUTO_RENEWAL", contractCount: 5 },
          { category: "NON_COMPETE", contractCount: 0 },
          { category: "IP_ASSIGNMENT", contractCount: 1 },
          { category: "INDEMNIFICATION", contractCount: 2 },
          { category: "TERMINATION", contractCount: 0 },
          { category: "PAYMENT", contractCount: 0 },
          { category: "CONFIDENTIALITY", contractCount: 0 },
          { category: "OTHER", contractCount: 0 },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter>
        <AiInsightsPanel />
      </MemoryRouter>,
    );

    expect(screen.getByText("Liability")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Auto-renewal")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();

    // A category with real findings (Indemnification: 2) is shown even
    // though it isn't one of the categories that used to be hardcoded.
    expect(screen.getByText("Indemnification")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    // A zero-count category is not shown - nothing to drill into yet.
    expect(screen.queryByText("Non-compete")).not.toBeInTheDocument();
    expect(screen.queryByText("Termination")).not.toBeInTheDocument();
  });

  it("shows an error state with retry", () => {
    mocks.useInsightsSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter>
        <AiInsightsPanel />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Insights could not be loaded."),
    ).toBeInTheDocument();
  });
});
