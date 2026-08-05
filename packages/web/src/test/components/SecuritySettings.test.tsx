import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: mocks.useAuth,
}));

import { SecuritySettings } from "@/components/settings/SecuritySettings";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useAuth.mockReturnValue({
    user: {
      id: "user-1",
      organizationId: "org-1",
      email: "user@example.com",
      fullName: "User Example",
      role: "INTERNAL",
    },
  });
});

describe("SecuritySettings", () => {
  it("does not render a duplicate sign out action", () => {
    render(<SecuritySettings />);

    expect(screen.getByText(/account security/i)).toBeInTheDocument();
    expect(screen.getByText(/access permissions/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /sign out/i }),
    ).not.toBeInTheDocument();
  });
});
