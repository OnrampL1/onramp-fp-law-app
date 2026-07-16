import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TeamMember } from "../../lib/users";

const mockUseAuth = vi.fn();
const mockUseTeamMembers = vi.fn();
const mockMutate = vi.fn();

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../hooks/useUserManagement", () => ({
  useTeamMembers: () => mockUseTeamMembers(),
  useCreateInvitation: () => ({ mutate: mockMutate }),
  useResendInvitation: () => ({ mutate: mockMutate }),
  useUpdateUserStatus: () => ({ mutate: mockMutate }),
  useUpdateUserRole: () => ({ mutate: mockMutate }),
}));

import { UserManagement } from "../../pages/dashboard/UserManagement";

const members: TeamMember[] = [
  {
    source: "user",
    id: "user-1",
    name: "Alex Whitfield",
    email: "alex@clausio.test",
    role: "ADMIN",
    status: "active",
    permissionKeys: ["contracts.read", "users.manage"],
    createdAt: "2026-05-03T09:30:00Z",
    lastActiveAt: "2026-07-01T16:45:00Z",
  },
];

beforeEach(() => {
  mockUseTeamMembers.mockReturnValue({
    members,
    isLoading: false,
    isError: false,
  });
});

describe("UserManagement read-only banner", () => {
  it("does not show the read-only banner for an ADMIN user", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-1", email: "alex@clausio.test", role: "ADMIN" },
    });

    render(<UserManagement />);

    expect(screen.queryByText("Read-only access")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /invite user/i }),
    ).toBeInTheDocument();
  });

  it("does not show the read-only banner for an OWNER user", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-1", email: "alex@clausio.test", role: "OWNER" },
    });

    render(<UserManagement />);

    expect(screen.queryByText("Read-only access")).not.toBeInTheDocument();
  });

  it("shows the read-only banner for an INTERNAL user", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-2", email: "sam@clausio.test", role: "INTERNAL" },
    });

    render(<UserManagement />);

    expect(screen.getByText("Read-only access")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /invite user/i }),
    ).not.toBeInTheDocument();
  });
});
