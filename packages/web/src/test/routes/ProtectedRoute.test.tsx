import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: mocks.useAuth,
}));

import { ProtectedRoute } from "../../routes/ProtectedRoute";

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

function renderRoute(initialPath = "/dashboard") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/onboarding" element={<div>Onboarding Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ProtectedRoute", () => {
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

  it("redirects onboarding-required users to onboarding", () => {
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

  it("renders app content for onboarded users", () => {
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
