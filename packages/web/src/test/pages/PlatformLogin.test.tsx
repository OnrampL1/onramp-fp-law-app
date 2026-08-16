import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  usePlatformAuth: vi.fn(),
  navigate: vi.fn(),
  platformLogin: vi.fn(),
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

vi.mock("../../hooks/usePlatformAuth", () => ({
  usePlatformAuth: mocks.usePlatformAuth,
}));

import { PlatformLogin } from "../../pages/platform/PlatformLogin";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.platformLogin.mockResolvedValue(undefined);
});

function mockPlatformAuth(overrides = {}) {
  mocks.usePlatformAuth.mockReturnValue({
    platformUser: null,
    isPlatformLoading: false,
    platformLogin: mocks.platformLogin,
    platformLogout: vi.fn(),
    ...overrides,
  });
}

describe("PlatformLogin", () => {
  it("shows a loading state while platform authentication initializes", () => {
    mockPlatformAuth({ isPlatformLoading: true });

    render(<PlatformLogin />);

    expect(
      screen.queryByRole("button", { name: /sign in/i }),
    ).not.toBeInTheDocument();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("redirects authenticated platform users to the platform organization page", async () => {
    mockPlatformAuth({
      platformUser: {
        id: "platform-1",
        email: "platform.admin@clausio.local",
        fullName: "Platform Admin",
        role: "SUPER_ADMIN",
      },
      isPlatformLoading: false,
    });

    render(<PlatformLogin />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith("/platform/organizations", {
        replace: true,
      });
    });
  });

  it("logs in with platform credentials and redirects to platform organizations", async () => {
    const user = userEvent.setup();
    mockPlatformAuth();

    render(<PlatformLogin />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "platform.admin@clausio.local",
    );
    await user.type(screen.getByLabelText(/^password$/i), "Password123!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mocks.platformLogin).toHaveBeenCalledWith(
        "platform.admin@clausio.local",
        "Password123!",
      );
    });

    expect(mocks.navigate).toHaveBeenCalledWith("/platform/organizations", {
      replace: true,
    });
  });

  it("uses a generic email placeholder instead of exposing the seeded account", () => {
    mockPlatformAuth();

    render(<PlatformLogin />);

    expect(screen.getByPlaceholderText("you@company.com")).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("platform.admin@clausio.local"),
    ).not.toBeInTheDocument();
  });
});
