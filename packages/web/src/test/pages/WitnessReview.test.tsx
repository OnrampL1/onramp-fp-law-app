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
    organizationName: "Acme Legal LLP",
    organizationLogoUrl: null,
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

  it("brands the header with the owning organization, not Clausio", () => {
    mockPortalData({});

    render(<WitnessReview />);

    expect(screen.getByText("Acme Legal LLP")).toBeInTheDocument();
    expect(screen.queryByText("Clausio")).not.toBeInTheDocument();
  });

  it("warns that closing the page loses access, since opening it already redeemed the single-use link", () => {
    mockPortalData({});

    render(<WitnessReview />);

    expect(screen.getByText(/This link is single-use\./)).toBeInTheDocument();
    expect(
      screen.getByText(/you won't be able to reopen it/),
    ).toBeInTheDocument();
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

  it("splits numbered ALL-CAPS clause headings into their own sections, even without blank lines between them", () => {
    mockPortalData({
      extractedText:
        "This Agreement is effective as of January 1, 2026.\n" +
        "1. PURPOSE\n" +
        "The Parties establish a joint venture to develop software.\n" +
        "2. TERM\n" +
        "This Agreement expires on December 31, 2026.",
    });

    render(<WitnessReview />);

    expect(screen.getByText("1. PURPOSE")).toBeInTheDocument();
    expect(
      screen.getByText(
        "The Parties establish a joint venture to develop software.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("2. TERM")).toBeInTheDocument();
    expect(
      screen.getByText("This Agreement expires on December 31, 2026."),
    ).toBeInTheDocument();
  });

  it("does not treat a numbered sentence as a clause heading (only all-caps headings qualify)", () => {
    mockPortalData({
      extractedText: "1. The Parties shall act in good faith at all times.",
    });

    render(<WitnessReview />);

    expect(
      screen.getByText(
        "1. The Parties shall act in good faith at all times.",
      ),
    ).toBeInTheDocument();
  });

  it("drops a leading 'CONTRACT n:' marker and its duplicated all-caps title echo, leaving the real preamble sentence on its own", () => {
    mockPortalData({
      extractedText:
        "CONTRACT 11: Joint Venture and Revenue-Sharing\n" +
        "Agreement\n" +
        "JOINT VENTURE AND REVENUE-SHARING AGREEMENT\n" +
        'This Joint Venture and Revenue-Sharing Agreement ("Agreement") is between HLG and Partner.\n' +
        "1. PURPOSE\n" +
        "The Parties establish a joint venture.",
    });

    render(<WitnessReview />);

    expect(screen.queryByText(/CONTRACT 11/)).not.toBeInTheDocument();
    expect(
      screen.queryByText("JOINT VENTURE AND REVENUE-SHARING AGREEMENT"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'This Joint Venture and Revenue-Sharing Agreement ("Agreement") is between HLG and Partner.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("1. PURPOSE")).toBeInTheDocument();
  });

  it("drops a standalone all-caps title line even without a 'CONTRACT n:' marker ahead of it", () => {
    mockPortalData({
      extractedText:
        "MUTUAL NON-DISCLOSURE AGREEMENT\n" +
        "The parties agree to exchange confidential information.",
    });

    render(<WitnessReview />);

    expect(
      screen.queryByText("MUTUAL NON-DISCLOSURE AGREEMENT"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "The parties agree to exchange confidential information.",
      ),
    ).toBeInTheDocument();
  });

  it("separates the signature block from the clause before it, and each party's fields from the other's", () => {
    mockPortalData({
      extractedText:
        "13. GENERAL\n" +
        "No Party may bind the other outside approved venture activities.\n" +
        "SIGNATURES\n" +
        "IN WITNESS WHEREOF, the Parties have executed this Agreement.\n" +
        "HARFOUSH LAW GROUP\n" +
        "By: ______\n" +
        "Name: ______\n" +
        "REDWOOD COMMERCE HOLDINGS LTD.\n" +
        "By: ______\n" +
        "Name: ______",
    });

    render(<WitnessReview />);

    expect(screen.getByText("13. GENERAL")).toBeInTheDocument();
    expect(
      screen.getByText(
        "No Party may bind the other outside approved venture activities.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("SIGNATURES")).toBeInTheDocument();
    expect(
      screen.getByText(
        "IN WITNESS WHEREOF, the Parties have executed this Agreement.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("HARFOUSH LAW GROUP")).toBeInTheDocument();
    expect(
      screen.getByText("REDWOOD COMMERCE HOLDINGS LTD."),
    ).toBeInTheDocument();
    // Each party's fields form their own paragraph, not one merged block.
    const fieldParagraphs = screen.getAllByText("By: ______ Name: ______");
    expect(fieldParagraphs).toHaveLength(2);
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
