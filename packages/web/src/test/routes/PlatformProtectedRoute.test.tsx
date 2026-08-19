import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  usePlatformAuth: vi.fn(),
}));

vi.mock("../../hooks/usePlatformAuth", () => ({
  usePlatformAuth: mocks.usePlatformAuth,
}));

import { PlatformProtectedRoute } from "../../routes/PlatformProtectedRoute";

function renderRoute(initialPath = "/platform/organizations") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<PlatformProtectedRoute />}>
          <Route
            path="/platform/organizations"
            element={<div>Platform Organizations Page</div>}
          />
        </Route>
        <Route
          path="/platform/login"
          element={<div>Platform Login Page</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PlatformProtectedRoute", () => {
  it("shows a loading state while platform auth initializes", () => {
    mocks.usePlatformAuth.mockReturnValue({
      platformUser: null,
      isPlatformLoading: true,
      platformLogin: vi.fn(),
      platformLogout: vi.fn(),
    });

    renderRoute();

    expect(
      screen.queryByText("Platform Organizations Page"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Platform Login Page")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users to platform login", () => {
    mocks.usePlatformAuth.mockReturnValue({
      platformUser: null,
      isPlatformLoading: false,
      platformLogin: vi.fn(),
      platformLogout: vi.fn(),
    });

    renderRoute();

    expect(screen.getByText("Platform Login Page")).toBeInTheDocument();
  });

  it("renders protected platform content for authenticated platform users", () => {
    mocks.usePlatformAuth.mockReturnValue({
      platformUser: {
        id: "platform-1",
        email: "platform.admin@clausio.local",
        fullName: "Platform Admin",
        role: "SUPER_ADMIN",
      },
      isPlatformLoading: false,
      platformLogin: vi.fn(),
      platformLogout: vi.fn(),
    });

    renderRoute();

    expect(screen.getByText("Platform Organizations Page")).toBeInTheDocument();
  });
});
