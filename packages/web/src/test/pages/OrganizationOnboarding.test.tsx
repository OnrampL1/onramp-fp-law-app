import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useAuth: vi.fn(),
  useOrganizationOnboarding: vi.fn(),
  useCompleteOrganizationOnboarding: vi.fn(),
  mutateAsync: vi.fn(),
  refreshProfile: vi.fn(),
  useOrganizationSettings: vi.fn(),
  useUploadOrganizationLogo: vi.fn(),
  useDeleteOrganizationLogo: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("../../hooks/useOnboarding", () => ({
  useOrganizationOnboarding: mocks.useOrganizationOnboarding,
  useCompleteOrganizationOnboarding: mocks.useCompleteOrganizationOnboarding,
}));

vi.mock("../../hooks/useSettings", () => ({
  useOrganizationSettings: mocks.useOrganizationSettings,
  useUploadOrganizationLogo: mocks.useUploadOrganizationLogo,
  useDeleteOrganizationLogo: mocks.useDeleteOrganizationLogo,
}));

import { OrganizationOnboarding } from "../../pages/onboarding/OrganizationOnboarding";

beforeEach(() => {
  vi.clearAllMocks();

  mocks.refreshProfile.mockResolvedValue({
    id: "owner-1",
    organizationId: "org-1",
    email: "owner@acme.test",
    fullName: "Owner User",
    role: "OWNER",
    organizationStatus: "ACTIVE",
    onboardingRequired: false,
  });

  mocks.useAuth.mockReturnValue({
    user: {
      id: "owner-1",
      organizationId: "org-1",
      email: "owner@acme.test",
      fullName: "Owner User",
      role: "OWNER",
      organizationStatus: "OWNER_ASSIGNED",
      onboardingRequired: true,
    },
    isLoading: false,
    login: vi.fn(),
    acceptInvitation: vi.fn(),
    refreshProfile: mocks.refreshProfile,
    logout: vi.fn(),
  });

  mocks.useOrganizationOnboarding.mockReturnValue({
    data: {
      organization: {
        id: "org-1",
        name: "Acme Legal",
        slug: "acme-legal",
        status: "OWNER_ASSIGNED",
        onboardingRequired: true,
      },
      settings: {
        timezone: "UTC",
        language: "en",
        notificationPreferences: null,
      },
      permissions: {
        canCompleteOnboarding: true,
      },
    },
    isLoading: false,
    isError: false,
  });

  mocks.mutateAsync.mockResolvedValue({
    organization: {
      id: "org-1",
      name: "Acme Legal Ops",
      slug: "acme-legal",
      status: "ACTIVE",
      onboardingRequired: false,
    },
    settings: {
      timezone: "UTC",
      language: "en",
      notificationPreferences: {
        contractUpdates: true,
        riskAlerts: true,
        aiInsights: true,
      },
    },
    permissions: {
      canCompleteOnboarding: false,
    },
  });

  mocks.useCompleteOrganizationOnboarding.mockReturnValue({
    mutateAsync: mocks.mutateAsync,
    isPending: false,
  });

  mocks.useOrganizationSettings.mockReturnValue({
    data: {
      organization: {
        id: "org-1",
        name: "Acme Legal",
        slug: "acme-legal",
        status: "OWNER_ASSIGNED",
      },
      settings: {
        timezone: "UTC",
        language: "en",
        logoUrl: null,
        logoUrlExpiresInSeconds: null,
        notificationPreferences: null,
        branding: null,
      },
      permissions: {
        canManageSettings: true,
        canRenameOrganization: true,
      },
    },
    isLoading: false,
    isError: false,
  });

  mocks.useUploadOrganizationLogo.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });

  mocks.useDeleteOrganizationLogo.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
});

describe("OrganizationOnboarding", () => {
  it("renders current organization setup data", () => {
    render(<OrganizationOnboarding />);

    expect(screen.getByDisplayValue("Acme Legal")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /complete setup/i }),
    ).toBeEnabled();
  });

  it("completes onboarding, refreshes auth profile, and redirects to dashboard", async () => {
    const user = userEvent.setup();

    render(<OrganizationOnboarding />);

    const nameInput = screen.getByLabelText(/organization name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Acme Legal Ops");

    await user.click(screen.getByRole("button", { name: /complete setup/i }));

    await waitFor(() => {
      expect(mocks.mutateAsync).toHaveBeenCalledWith({
        name: "Acme Legal Ops",
        notificationPreferences: {
          contractUpdates: true,
          riskAlerts: true,
          aiInsights: true,
        },
      });
    });

    expect(mocks.refreshProfile).toHaveBeenCalled();
    expect(mocks.navigate).toHaveBeenCalledWith("/dashboard", {
      replace: true,
    });
  });

  it("disables completion when the backend says the user cannot complete onboarding", () => {
    mocks.useOrganizationOnboarding.mockReturnValue({
      data: {
        organization: {
          id: "org-1",
          name: "Acme Legal",
          slug: "acme-legal",
          status: "OWNER_ASSIGNED",
          onboardingRequired: true,
        },
        settings: {
          timezone: "UTC",
          language: "en",
          notificationPreferences: null,
        },
        permissions: {
          canCompleteOnboarding: false,
        },
      },
      isLoading: false,
      isError: false,
    });

    render(<OrganizationOnboarding />);

    expect(
      screen.getByRole("button", { name: /complete setup/i }),
    ).toBeDisabled();
    expect(
      screen.getByText(/assigned organization owner/i),
    ).toBeInTheDocument();
  });

  it("shows an error when completion fails", async () => {
    const user = userEvent.setup();

    mocks.mutateAsync.mockRejectedValueOnce({
      response: {
        data: {
          error: "Owner onboarding must be completed by the assigned owner",
        },
      },
      isAxiosError: true,
    });

    render(<OrganizationOnboarding />);

    await user.click(screen.getByRole("button", { name: /complete setup/i }));

    expect(
      await screen.findByText(
        "Owner onboarding must be completed by the assigned owner",
      ),
    ).toBeInTheDocument();
  });
});
