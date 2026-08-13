import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AiInsightsPanel } from "@/components/dashboard/AiInsightsPanel";

describe("AiInsightsPanel", () => {
  it("does not show fake portfolio AI insight counts", () => {
    render(
      <MemoryRouter>
        <AiInsightsPanel />
      </MemoryRouter>,
    );

    expect(screen.getByText("Mock insight counts removed")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Portfolio-level AI insight aggregation is not connected yet/i,
      ),
    ).toBeInTheDocument();

    expect(screen.queryByText("High Risk Contracts")).not.toBeInTheDocument();
    expect(screen.queryByText("Auto Renewal Alerts")).not.toBeInTheDocument();
    expect(screen.queryByText("42")).not.toBeInTheDocument();
  });
});
