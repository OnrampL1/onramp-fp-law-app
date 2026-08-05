import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("@/components/contracts/ContractsTable", () => ({
  ContractsTable: () => <div data-testid="contracts-table" />,
}));

import Contracts from "@/pages/contracts/Contracts";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Contracts", () => {
  it("navigates to the upload page from the upload contract button", async () => {
    const user = userEvent.setup();

    render(<Contracts />);

    await user.click(screen.getByRole("button", { name: /upload contract/i }));

    expect(mocks.navigate).toHaveBeenCalledWith("/upload");
  });
});
