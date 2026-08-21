import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: mocks.useAuth,
}));

import { OnboardingRoute } from "../../routes/OnboardingRoute";

const activeUser = {
  id: "user-1",
  organizationId: "org-1",
  email: "owner@example.com",
  fullName: "Owner User",
  role: "OWNER",
  organizationStatus: "ACTIVE",
  onboardingRequired: false,
};

const onboardingUser = {
  ...activeUser,
  organizationStatus: "OWNER_ASSIGNED",
  onboardingRequired: true,
};

function renderRoute(initialPath = "/onboarding") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<OnboardingRoute />}>
          <Route path="/onboarding" element={<div>Onboarding Page</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OnboardingRoute", () => {
  it("redirects unauthenticated users to login", () => {
    mocks.useAuth.mockReturnValue({
      user: null,
      isLoading: false,
      login: vi.fn(),
      acceptInvitation: vi.fn(),
      logout: vi.fn(),
    });

    renderRoute();

    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("renders onboarding for users who need onboarding", () => {
    mocks.useAuth.mockReturnValue({
      user: onboardingUser,
      isLoading: false,
      login: vi.fn(),
      acceptInvitation: vi.fn(),
      logout: vi.fn(),
    });

    renderRoute();

    expect(screen.getByText("Onboarding Page")).toBeInTheDocument();
  });

  it("redirects completed users back to the dashboard", () => {
    mocks.useAuth.mockReturnValue({
      user: activeUser,
      isLoading: false,
      login: vi.fn(),
      acceptInvitation: vi.fn(),
      logout: vi.fn(),
    });

    renderRoute();

    expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
  });
});
