import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TeamMember } from "../../lib/users";

const mockUseAuth = vi.fn();
const mockUseTeamMembers = vi.fn();
const mockUseInvitationHistory = vi.fn();
const mockMutate = vi.fn();

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../hooks/useUserManagement", () => ({
  useTeamMembers: () => mockUseTeamMembers(),
  useInvitationHistory: () => mockUseInvitationHistory(),
  useCreateInvitation: () => ({ mutate: mockMutate }),
  useResendInvitation: () => ({ mutate: mockMutate }),
  useRevokeInvitation: () => ({ mutate: mockMutate }),
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
  mockUseInvitationHistory.mockReturnValue({
    invitations: [],
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

const pendingInvitation: TeamMember = {
  source: "invitation",
  id: "invite-1",
  name: null,
  email: "jordan@clausio.test",
  role: "INTERNAL",
  status: "pending",
  permissionKeys: ["contracts.read"],
  createdAt: "2026-07-01T09:00:00Z",
  lastActiveAt: null,
  invitedAt: "2026-07-01T09:00:00Z",
};

describe("UserManagement invitation history", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: "user-1", email: "alex@clausio.test", role: "ADMIN" },
    });
  });

  it("keeps expired invitations out of the main roster and shows them under Previous invitations instead", () => {
    mockUseInvitationHistory.mockReturnValue({
      invitations: [
        {
          id: "invite-2",
          email: "sam@clausio.test",
          role: "INTERNAL",
          status: "EXPIRED",
          expiresAt: "2026-06-01T00:00:00Z",
          createdAt: "2026-05-25T00:00:00Z",
        },
      ],
      isLoading: false,
      isError: false,
    });

    render(<UserManagement />);

    expect(screen.getByText("Previous invitations")).toBeInTheDocument();
    expect(screen.getByText("sam@clausio.test")).toBeInTheDocument();
    // The expired invitation is not rendered as if it were an active member.
    expect(screen.queryByText("Invitation pending")).not.toBeInTheDocument();
  });

  it("does not render the Previous invitations section when there are no expired invitations", () => {
    render(<UserManagement />);

    expect(screen.queryByText("Previous invitations")).not.toBeInTheDocument();
  });
});

describe("UserManagement revoke invitation", () => {
  it("asks for confirmation before revoking a pending invitation, and calls revoke only after confirming", async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      user: { id: "user-1", email: "alex@clausio.test", role: "ADMIN" },
    });
    mockUseTeamMembers.mockReturnValue({
      members: [...members, pendingInvitation],
      isLoading: false,
      isError: false,
    });

    render(<UserManagement />);

    await user.click(
      screen.getByRole("button", { name: /actions for jordan@clausio\.test/i }),
    );
    await user.click(screen.getByRole("menuitem", { name: /revoke invite/i }));

    expect(screen.getByText("Revoke this invitation?")).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /revoke invite/i }));

    expect(mockMutate).toHaveBeenCalledWith("invite-1");
  });
});
