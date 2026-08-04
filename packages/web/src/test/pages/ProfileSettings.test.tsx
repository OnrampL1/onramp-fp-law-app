import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLogout = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      organizationId: "org-1",
      fullName: "Priya Nair",
      email: "priya@example.com",
      role: "INTERNAL",
    },
    logout: mockLogout,
  }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useChangePassword: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
    isError: false,
  }),
}));

import { ProfileSettings } from "@/components/settings/ProfileSettings";

beforeEach(() => {
  vi.clearAllMocks();
  mockMutateAsync.mockResolvedValue(undefined);
  mockLogout.mockResolvedValue(undefined);
});

function renderProfileSettings() {
  render(
    <MemoryRouter>
      <ProfileSettings />
    </MemoryRouter>,
  );
}

describe("ProfileSettings", () => {
  it("keeps identity information read-only", () => {
    renderProfileSettings();

    expect(screen.getByLabelText(/full name/i)).toHaveValue("Priya Nair");
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute("readonly");
    expect(screen.getByLabelText(/email address/i)).toHaveValue(
      "priya@example.com",
    );
    expect(screen.getByLabelText(/email address/i)).toHaveAttribute("readonly");
  });

  it("submits a password change for the current user", async () => {
    const user = userEvent.setup();
    renderProfileSettings();

    await user.type(screen.getByLabelText(/current password/i), "Password123!");
    await user.type(screen.getByLabelText(/^new password$/i), "NewPassword123");
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "NewPassword123",
    );

    await user.click(screen.getByRole("button", { name: /change password/i }));

    expect(mockMutateAsync).toHaveBeenCalledWith({
      currentPassword: "Password123!",
      newPassword: "NewPassword123",
      confirmNewPassword: "NewPassword123",
    });
    expect(mockLogout).toHaveBeenCalled();
  });

  it("validates matching password confirmation before submitting", async () => {
    const user = userEvent.setup();
    renderProfileSettings();

    await user.type(screen.getByLabelText(/current password/i), "Password123!");
    await user.type(screen.getByLabelText(/^new password$/i), "NewPassword123");
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "DifferentPassword123",
    );

    await user.click(screen.getByRole("button", { name: /change password/i }));

    expect(
      await screen.findByText(/password confirmation does not match/i),
    ).toBeInTheDocument();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});
