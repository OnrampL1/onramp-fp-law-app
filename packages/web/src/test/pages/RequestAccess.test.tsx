import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  submitAccessRequest: vi.fn(),
}));

vi.mock("../../services/access-request.service", () => ({
  submitAccessRequest: mocks.submitAccessRequest,
}));

import { RequestAccess } from "../../pages/RequestAccess";

function renderPage() {
  return render(
    <MemoryRouter>
      <RequestAccess />
    </MemoryRouter>,
  );
}

async function fillRequiredFields() {
  const user = userEvent.setup();

  await user.type(screen.getByLabelText(/first name/i), "Alex");
  await user.type(screen.getByLabelText(/last name/i), "Morgan");
  await user.type(screen.getByLabelText(/work email/i), "Alex@Example.com");
  await user.type(
    screen.getByLabelText(/organization name/i),
    "Acme Legal Ops",
  );
  await user.type(
    screen.getByLabelText(/intended use/i),
    "We want to manage legal contracts in one secure workspace.",
  );

  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.submitAccessRequest.mockResolvedValue({
    message: "If eligible, your access request has been submitted for review.",
  });
});

describe("RequestAccess", () => {
  it("submits a valid access request and shows the generic success message", async () => {
    renderPage();

    const user = await fillRequiredFields();

    await user.click(screen.getByRole("button", { name: /submit request/i }));

    await waitFor(() => {
      expect(mocks.submitAccessRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          contactFirstName: "Alex",
          contactLastName: "Morgan",
          contactEmail: "alex@example.com",
          organizationName: "Acme Legal Ops",
          intendedUse:
            "We want to manage legal contracts in one secure workspace.",
          website: "",
        }),
      );
    });

    expect(await screen.findByText(/request received/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        "If eligible, your access request has been submitted for review.",
      ),
    ).toBeInTheDocument();
  });

  it("blocks invalid emails before calling the API", async () => {
    renderPage();

    const user = await fillRequiredFields();

    await user.clear(screen.getByLabelText(/work email/i));
    await user.type(screen.getByLabelText(/work email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /submit request/i }));

    expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
    expect(mocks.submitAccessRequest).not.toHaveBeenCalled();
  });

  it("requires enough intended-use detail", async () => {
    renderPage();

    const user = await fillRequiredFields();

    await user.clear(screen.getByLabelText(/intended use/i));
    await user.type(screen.getByLabelText(/intended use/i), "Too short");
    await user.click(screen.getByRole("button", { name: /submit request/i }));

    expect(
      await screen.findByText(/tell us a little more/i),
    ).toBeInTheDocument();
    expect(mocks.submitAccessRequest).not.toHaveBeenCalled();
  });

  it("shows a safe error message when submission fails", async () => {
    mocks.submitAccessRequest.mockRejectedValue(new Error("Network error"));

    renderPage();

    const user = await fillRequiredFields();

    await user.click(screen.getByRole("button", { name: /submit request/i }));

    expect(
      await screen.findByText(/we could not submit your request/i),
    ).toBeInTheDocument();
  });
});
