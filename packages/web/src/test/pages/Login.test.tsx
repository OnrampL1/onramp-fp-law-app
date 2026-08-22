import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  navigate: vi.fn(),
  login: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );

  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock("../../hooks/useAuth", () => ({
  useAuth: mocks.useAuth,
}));

import { Login } from "../../pages/auth/Login";

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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.login.mockResolvedValue(activeUser);
});

function mockAuth(overrides = {}) {
  mocks.useAuth.mockReturnValue({
    user: null,
    isLoading: false,
    login: mocks.login,
    acceptInvitation: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  });
}

function renderLogin() {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

describe("Login", () => {
  it("shows a loading state while authentication initializes", () => {
    mockAuth({ isLoading: true });

    renderLogin();

    expect(
      screen.queryByRole("button", { name: /sign in/i }),
    ).not.toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("redirects authenticated users away from login", async () => {
    mockAuth({
      user: activeUser,
      isLoading: false,
    });

    renderLogin();

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith("/dashboard", {
        replace: true,
      });
    });

    expect(
      screen.queryByRole("button", { name: /sign in/i }),
    ).not.toBeInTheDocument();
  });

  it("redirects authenticated users who need onboarding to onboarding", async () => {
    mockAuth({
      user: onboardingUser,
      isLoading: false,
    });

    renderLogin();

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith("/onboarding", {
        replace: true,
      });
    });
  });

  it("renders the login form for unauthenticated users", () => {
    mockAuth();

    renderLogin();

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("logs in and redirects to the dashboard", async () => {
    const user = userEvent.setup();
    mockAuth();

    renderLogin();

    await user.type(
      screen.getByLabelText(/email address/i),
      "user@example.com",
    );
    await user.type(screen.getByLabelText(/^password$/i), "Password123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith(
        "user@example.com",
        "Password123!",
      );
    });

    expect(mocks.navigate).toHaveBeenCalledWith("/dashboard", {
      replace: true,
    });
  });

  it("logs in and redirects onboarding-required users to onboarding", async () => {
    const user = userEvent.setup();
    mocks.login.mockResolvedValueOnce(onboardingUser);
    mockAuth();

    renderLogin();

    await user.type(
      screen.getByLabelText(/email address/i),
      "owner@example.com",
    );
    await user.type(screen.getByLabelText(/^password$/i), "Password123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith(
        "owner@example.com",
        "Password123!",
      );
    });

    expect(mocks.navigate).toHaveBeenCalledWith("/onboarding", {
      replace: true,
    });
  });
});
