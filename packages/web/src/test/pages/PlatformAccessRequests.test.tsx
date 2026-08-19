import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlatformAccessRequest } from "../../types/platform-access-request";

const mocks = vi.hoisted(() => ({
  usePlatformAccessRequests: vi.fn(),
  usePlatformAccessRequest: vi.fn(),
  useApprovePlatformAccessRequest: vi.fn(),
  useDeclinePlatformAccessRequest: vi.fn(),
  usePlatformAuth: vi.fn(),
}));

vi.mock("../../hooks/usePlatformAccessRequests", () => ({
  usePlatformAccessRequests: mocks.usePlatformAccessRequests,
  usePlatformAccessRequest: mocks.usePlatformAccessRequest,
  useApprovePlatformAccessRequest: mocks.useApprovePlatformAccessRequest,
  useDeclinePlatformAccessRequest: mocks.useDeclinePlatformAccessRequest,
}));

vi.mock("../../hooks/usePlatformAuth", () => ({
  usePlatformAuth: mocks.usePlatformAuth,
}));

import { PlatformAccessRequests } from "../../pages/platform/PlatformAccessRequests";

const accessRequests: PlatformAccessRequest[] = [
  {
    id: "request-1",
    contactFirstName: "Alex",
    contactLastName: "Morgan",
    contactEmail: "alex@example.com",
    organizationName: "Acme Legal Ops",
    websiteUrl: "https://acme.example",
    companySize: "ELEVEN_TO_FIFTY",
    country: "Lebanon",
    intendedUse: "We want to manage legal contracts in one secure workspace.",
    notes: "Mostly vendor agreements.",
    status: "PENDING",
    reviewedAt: null,
    declineReason: null,
    organization: null,
    reviewedByPlatformUser: null,
    createdAt: "2026-08-18T00:00:00.000Z",
    updatedAt: "2026-08-18T00:00:00.000Z",
  },
];

beforeEach(() => {
  vi.clearAllMocks();

  mocks.usePlatformAccessRequests.mockReturnValue({
    data: {
      data: accessRequests,
      meta: {
        pagination: {
          page: 1,
          limit: 50,
          total: accessRequests.length,
          totalPages: 1,
        },
      },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });

  mocks.usePlatformAccessRequest.mockReturnValue({
    data: accessRequests[0],
    isLoading: false,
    isError: false,
  });

  mocks.usePlatformAuth.mockReturnValue({
    platformUser: {
      id: "platform-user-1",
      email: "admin@clausio.test",
      fullName: "Platform Admin",
      role: "SUPER_ADMIN",
    },
  });

  mocks.useApprovePlatformAccessRequest.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });

  mocks.useDeclinePlatformAccessRequest.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
});

describe("PlatformAccessRequests", () => {
  it("renders access request rows and summary cards", () => {
    render(<PlatformAccessRequests />);

    expect(screen.getByText("Access Requests")).toBeInTheDocument();
    expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    expect(screen.getByText("alex@example.com")).toBeInTheDocument();
    expect(screen.getByText("Acme Legal Ops")).toBeInTheDocument();
    expect(screen.getAllByText("Pending")).toHaveLength(2);
  });

  it("shows loading and error states", () => {
    mocks.usePlatformAccessRequests.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    const { rerender } = render(<PlatformAccessRequests />);

    expect(screen.queryByText("Alex Morgan")).not.toBeInTheDocument();

    mocks.usePlatformAccessRequests.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    });

    rerender(<PlatformAccessRequests />);

    expect(
      screen.getByText("Unable to load access requests"),
    ).toBeInTheDocument();
  });

  it("opens the detail sheet for an access request", async () => {
    const user = userEvent.setup();

    render(<PlatformAccessRequests />);

    await user.click(screen.getByRole("button", { name: /view/i }));

    await waitFor(() => {
      expect(mocks.usePlatformAccessRequest).toHaveBeenCalledWith("request-1");
    });

    expect(screen.getByText("Access Request Details")).toBeInTheDocument();
    expect(
      screen.getByText(
        "We want to manage legal contracts in one secure workspace.",
      ),
    ).toBeInTheDocument();
  });
});
