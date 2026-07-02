export type UserAccessRole = "admin" | "user" | "viewer";

export type UserAccountStatus = "active" | "pending" | "disabled";

export type PermissionKey =
  | "contracts.read"
  | "contracts.write"
  | "contracts.upload"
  | "users.manage"
  | "audit.read"
  | "settings.manage";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: UserAccessRole;
  status: UserAccountStatus;
  title: string;
  team: string;
  permissionKeys: PermissionKey[];
  createdAt: string;
  lastActiveAt: string | null;
  invitedAt?: string;
};

export const roleLabels: Record<UserAccessRole, string> = {
  admin: "Administrator",
  user: "Team member",
  viewer: "Viewer",
};

export const statusLabels: Record<UserAccountStatus, string> = {
  active: "Active",
  pending: "Pending invite",
  disabled: "Disabled",
};

export const permissionLabels: Record<PermissionKey, string> = {
  "contracts.read": "View contracts",
  "contracts.write": "Edit contracts",
  "contracts.upload": "Upload contracts",
  "users.manage": "Manage users",
  "audit.read": "View audit log",
  "settings.manage": "Manage settings",
};

export const teamMembers: TeamMember[] = [
  {
    id: "usr_alex_whitfield",
    name: "Alex Whitfield",
    email: "alex@clausio.test",
    role: "admin",
    status: "active",
    title: "Legal Operations Lead",
    team: "Legal",
    permissionKeys: [
      "contracts.read",
      "contracts.write",
      "contracts.upload",
      "users.manage",
      "audit.read",
      "settings.manage",
    ],
    createdAt: "2026-05-03T09:30:00Z",
    lastActiveAt: "2026-07-01T16:45:00Z",
  },
  {
    id: "usr_maya_cheng",
    name: "Maya Cheng",
    email: "maya@clausio.test",
    role: "user",
    status: "active",
    title: "Contract Analyst",
    team: "Legal",
    permissionKeys: ["contracts.read", "contracts.write", "contracts.upload"],
    createdAt: "2026-05-18T11:10:00Z",
    lastActiveAt: "2026-07-02T07:20:00Z",
  },
  {
    id: "usr_omar_haddad",
    name: "Omar Haddad",
    email: "omar@clausio.test",
    role: "viewer",
    status: "pending",
    title: "Finance Reviewer",
    team: "Finance",
    permissionKeys: ["contracts.read"],
    createdAt: "2026-06-24T13:00:00Z",
    lastActiveAt: null,
    invitedAt: "2026-06-24T13:00:00Z",
  },
  {
    id: "usr_nora_klein",
    name: "Nora Klein",
    email: "nora@clausio.test",
    role: "viewer",
    status: "disabled",
    title: "External Counsel",
    team: "Outside Counsel",
    permissionKeys: ["contracts.read"],
    createdAt: "2026-04-12T08:15:00Z",
    lastActiveAt: "2026-06-08T10:05:00Z",
  },
];

export function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
