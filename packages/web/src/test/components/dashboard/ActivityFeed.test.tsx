import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useAuditLogsList: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("@/hooks/useAuditLogsList", () => ({
  useAuditLogsList: mocks.useAuditLogsList,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
}));

beforeEach(() => {
  vi.clearAllMocks();

  mocks.useQuery.mockReturnValue({
    data: [
      {
        id: "user-1",
        fullName: "Priya Nair",
      },
    ],
  });

  mocks.useAuditLogsList.mockReturnValue({
    data: { items: [] },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
});

describe("ActivityFeed", () => {
  it("shows restricted state for internal users and avoids audit data", () => {
    mocks.useAuth.mockReturnValue({
      user: {
        id: "user-1",
        organizationId: "org-1",
        role: "INTERNAL",
        fullName: "Internal User",
      },
    });

    render(<ActivityFeed />);

    expect(screen.getByText("Activity feed is restricted")).toBeInTheDocument();
    expect(mocks.useAuditLogsList).toHaveBeenCalledWith(undefined, {
      page: 1,
      limit: 6,
    });
  });

  it("renders real audit events for admins", () => {
    mocks.useAuth.mockReturnValue({
      user: {
        id: "admin-1",
        organizationId: "org-1",
        role: "ADMIN",
        fullName: "Admin User",
      },
    });

    mocks.useAuditLogsList.mockReturnValue({
      data: {
        items: [
          {
            id: "audit-1",
            organizationId: "org-1",
            actorType: "USER",
            actorUserId: "user-1",
            actorPlatformUserId: null,
            action: "CONTRACT_UPLOADED",
            targetEntityType: "Contract",
            targetEntityId: "contract-1",
            targetDisplayName: "Vendor Services Agreement",
            contractId: "contract-1",
            witnessInvitationId: null,
            oldValue: null,
            newValue: null,
            ipAddress: null,
            userAgent: null,
            createdAt: "2026-08-13T10:15:00.000Z",
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ActivityFeed />);

    expect(mocks.useAuditLogsList).toHaveBeenCalledWith("org-1", {
      page: 1,
      limit: 6,
    });

    expect(screen.getByText("Priya Nair")).toBeInTheDocument();
    expect(screen.getByText("contract uploaded")).toBeInTheDocument();
    expect(screen.getByText("Vendor Services Agreement")).toBeInTheDocument();
  });

  it("shows a loading state", () => {
    mocks.useAuth.mockReturnValue({
      user: {
        id: "admin-1",
        organizationId: "org-1",
        role: "OWNER",
        fullName: "Owner User",
      },
    });

    mocks.useAuditLogsList.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    render(<ActivityFeed />);

    expect(screen.getByText("Loading activity...")).toBeInTheDocument();
  });
});
