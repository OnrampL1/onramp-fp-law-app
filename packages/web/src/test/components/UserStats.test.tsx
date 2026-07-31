import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { UserStats } from "@/components/users/UserStats";
import type { TeamMember } from "@/lib/users";

// Regression test: Internal users / Team members previously counted pending
// Invitation rows as if they were active members, because both are merged
// into one TeamMember[] for the table. Daniel + Priya are real INTERNAL
// Users; Jordan is a pending INTERNAL invitation and must not inflate either
// count — only "Pending invites" should reflect it.
const members: TeamMember[] = [
  {
    source: "user",
    id: "user-daniel",
    name: "Daniel Reyes",
    email: "daniel@clausio.test",
    role: "INTERNAL",
    status: "active",
    permissionKeys: ["contracts.read"],
    createdAt: "2026-05-01T00:00:00Z",
    lastActiveAt: "2026-07-01T00:00:00Z",
  },
  {
    source: "user",
    id: "user-priya",
    name: "Priya Nair",
    email: "priya@clausio.test",
    role: "INTERNAL",
    status: "active",
    permissionKeys: ["contracts.read"],
    createdAt: "2026-05-02T00:00:00Z",
    lastActiveAt: "2026-07-02T00:00:00Z",
  },
  {
    source: "invitation",
    id: "invite-jordan",
    name: null,
    email: "jordan@clausio.test",
    role: "INTERNAL",
    status: "pending",
    permissionKeys: ["contracts.read"],
    createdAt: "2026-07-10T00:00:00Z",
    lastActiveAt: null,
    invitedAt: "2026-07-10T00:00:00Z",
  },
];

describe("UserStats", () => {
  it("excludes pending invitations from Team members and Internal users counts", () => {
    render(<UserStats users={members} />);

    const teamMembersCard = screen.getByText("Team members").closest("div");
    const internalUsersCard = screen.getByText("Internal users").closest("div");
    const pendingCard = screen.getByText("Pending invites").closest("div");

    expect(teamMembersCard).toHaveTextContent("2");
    expect(internalUsersCard).toHaveTextContent("2");
    expect(pendingCard).toHaveTextContent("1");
  });
});
