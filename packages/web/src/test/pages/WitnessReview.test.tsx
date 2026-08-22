import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WitnessPortalContract } from "@/types/witness-portal";

const mockUseWitnessPortal = vi.fn();

vi.mock("react-router-dom", () => ({
  useParams: () => ({ token: "raw-token" }),
}));

vi.mock("@/hooks/useWitnessPortal", () => ({
  useWitnessPortal: () => mockUseWitnessPortal(),
}));

import { WitnessReview } from "../../pages/WitnessReview";

function baseContract(): WitnessPortalContract {
  return {
    id: "contract-1",
    title: "Master Services Agreement",
    counterparty: "Acme Corp",
    businessStatus: "UNDER_REVIEW",
    legalState: null,
    tags: [],
    effectiveDate: null,
    expirationDate: null,
    processingStatus: "EXTRACTION_COMPLETED",
    processingError: null,
    extractedText: "Full contract text here.",
  };
}

function mockPortalData(overrides: Partial<WitnessPortalContract>) {
  mockUseWitnessPortal.mockReturnValue({
    data: {
      contract: { ...baseContract(), ...overrides },
      witnessName: "Jamie Rivera",
      witnessEmail: "jamie@example.com",
      usedAt: "2026-08-01T10:00:00Z",
    },
    isLoading: false,
    isError: false,
    errorInfo: null,
    refetch: vi.fn(),
  });
}

describe("WitnessReview document processing states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the extracted text viewer when extraction has completed", () => {
    mockPortalData({ processingStatus: "EXTRACTION_COMPLETED" });

    render(<WitnessReview />);

    expect(screen.getByText("Full contract text here.")).toBeInTheDocument();
    expect(
      screen.queryByText(/extracting document text/i),
    ).not.toBeInTheDocument();
  });

  it("shows a 'still processing' state instead of the viewer while extraction is pending", () => {
    mockPortalData({ processingStatus: "PENDING_EXTRACTION" });

    render(<WitnessReview />);

    expect(
      screen.getByText(/extracting document text — this can take a moment/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Full contract text here."),
    ).not.toBeInTheDocument();
  });

  it("shows a failure state with the processingError message when extraction failed", () => {
    mockPortalData({
      processingStatus: "EXTRACTION_FAILED",
      processingError: "Unsupported file format",
    });

    render(<WitnessReview />);

    expect(screen.getByText("Text extraction failed")).toBeInTheDocument();
    expect(screen.getByText("Unsupported file format")).toBeInTheDocument();
  });

  it("treats AI_* statuses the same as a completed extraction, since AI progress isn't witness-facing", () => {
    mockPortalData({ processingStatus: "AI_FAILED" });

    render(<WitnessReview />);

    expect(screen.getByText("Full contract text here.")).toBeInTheDocument();
    expect(
      screen.queryByText(/extracting document text/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Text extraction failed"),
    ).not.toBeInTheDocument();
  });
});
