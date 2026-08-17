import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlatformOrganizationListItem } from "../../types/platform-organization";

const mocks = vi.hoisted(() => ({
  usePlatformAuth: vi.fn(),
  usePlatformOrganizations: vi.fn(),
  useCreatePlatformOrganization: vi.fn(),
  useAssignPlatformOrganizationOwner: vi.fn(),
  useUpdatePlatformOrganizationStatus: vi.fn(),
}));

vi.mock("../../hooks/usePlatformAuth", () => ({
  usePlatformAuth: mocks.usePlatformAuth,
}));

vi.mock("../../hooks/usePlatformOrganizations", () => ({
  usePlatformOrganizations: mocks.usePlatformOrganizations,
  useCreatePlatformOrganization: mocks.useCreatePlatformOrganization,
  useAssignPlatformOrganizationOwner: mocks.useAssignPlatformOrganizationOwner,
  useUpdatePlatformOrganizationStatus:
    mocks.useUpdatePlatformOrganizationStatus,
}));

import { PlatformOrganizations } from "../../pages/platform/PlatformOrganizations";

const organizations: PlatformOrganizationListItem[] = [
  {
    id: "org-1",
    name: "Ridgeline & Voss LLP",
    slug: "ridgeline-voss",
    status: "ACTIVE",
    ownerAssignedAt: "2026-08-01T00:00:00.000Z",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    owner: {
      id: "owner-1",
      email: "sarah.whitfield@ridgelinevoss.com",
      fullName: "Sarah Whitfield",
      role: "OWNER",
      status: "ACTIVE",
    },
    counts: {
      members: 3,
      invitations: 0,
      contracts: 8,
      auditLogs: 12,
    },
  },
  {
    id: "org-2",
    name: "New Tenant Co",
    slug: "new-tenant-co",
    status: "CREATED",
    ownerAssignedAt: null,
    createdAt: "2026-08-15T00:00:00.000Z",
    updatedAt: "2026-08-15T00:00:00.000Z",
    owner: null,
    counts: {
      members: 0,
      invitations: 0,
      contracts: 0,
      auditLogs: 0,
    },
  },
];

beforeEach(() => {
  vi.clearAllMocks();

  mocks.usePlatformOrganizations.mockReturnValue({
    data: {
      data: organizations,
      meta: {
        pagination: {
          page: 1,
          limit: 50,
          total: organizations.length,
          totalPages: 1,
        },
      },
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });

  mocks.useCreatePlatformOrganization.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
  mocks.useAssignPlatformOrganizationOwner.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
  mocks.useUpdatePlatformOrganizationStatus.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
});

function mockPlatformUser(role: "SUPER_ADMIN" | "SUPPORT_ENGINEER") {
  mocks.usePlatformAuth.mockReturnValue({
    platformUser: {
      id: "platform-1",
      email: "platform.admin@clausio.local",
      fullName: "Platform Admin",
      role,
    },
    isPlatformLoading: false,
    platformLogin: vi.fn(),
    platformLogout: vi.fn(),
  });
}

describe("PlatformOrganizations", () => {
  it("renders organization rows and platform summary cards", () => {
    mockPlatformUser("SUPER_ADMIN");

    render(<PlatformOrganizations />);

    expect(screen.getByText("Ridgeline & Voss LLP")).toBeInTheDocument();
    expect(screen.getByText("ridgeline-voss")).toBeInTheDocument();
    expect(screen.getByText("New Tenant Co")).toBeInTheDocument();
    expect(screen.getByText("Sarah Whitfield")).toBeInTheDocument();
    expect(screen.getByText("Not assigned")).toBeInTheDocument();
    expect(screen.getByText("Needs Owner")).toBeInTheDocument();
  });

  it("shows read-only access and disables mutation controls for support engineers", () => {
    mockPlatformUser("SUPPORT_ENGINEER");

    render(<PlatformOrganizations />);

    expect(
      screen.getByText(/read-only access to this organization directory/i),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /new organization/i }),
    ).toBeDisabled();

    expect(screen.getByRole("button", { name: /owner/i })).toBeDisabled();
  });

  it("enables organization management controls for super admins", () => {
    mockPlatformUser("SUPER_ADMIN");

    render(<PlatformOrganizations />);

    expect(
      screen.getByRole("button", { name: /new organization/i }),
    ).toBeEnabled();

    expect(screen.getByRole("button", { name: /owner/i })).toBeEnabled();
  });

  it("shows loading and error states", () => {
    mockPlatformUser("SUPER_ADMIN");

    mocks.usePlatformOrganizations.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    const { rerender } = render(<PlatformOrganizations />);

    expect(screen.queryByText("Ridgeline & Voss LLP")).not.toBeInTheDocument();

    mocks.usePlatformOrganizations.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    });

    rerender(<PlatformOrganizations />);

    expect(
      screen.getByText("Unable to load organizations"),
    ).toBeInTheDocument();
  });
});
