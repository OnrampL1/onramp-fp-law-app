import request from "supertest";

jest.mock("../../src/services/access-request.service", () => ({
  accessRequestService: {
    submitAccessRequest: jest.fn(),
  },
}));

import { app } from "../../app";
import { accessRequestService } from "../../src/services/access-request.service";

const mockAccessRequestService = accessRequestService as jest.Mocked<
  typeof accessRequestService
>;

const validPayload = {
  contactFirstName: "Alex",
  contactLastName: "Morgan",
  contactEmail: "Alex@Example.com",
  organizationName: "Acme Legal Ops",
  websiteUrl: "https://acme.example",
  companySize: "ELEVEN_TO_FIFTY",
  country: "Lebanon",
  intendedUse: "We want to manage legal contracts in one secure workspace.",
  notes: "Mostly vendor agreements.",
};

beforeEach(() => {
  jest.clearAllMocks();

  mockAccessRequestService.submitAccessRequest.mockResolvedValue({
    message: "If eligible, your access request has been submitted for review.",
    outcome: "CREATED",
  });
});

describe("POST /api/access-requests", () => {
  it("allows public submission without authentication", async () => {
    const res = await request(app)
      .post("/api/access-requests")
      .send(validPayload);

    expect(res.status).toBe(202);
    expect(mockAccessRequestService.submitAccessRequest).toHaveBeenCalledWith({
      ...validPayload,
      contactEmail: "alex@example.com",
    });
  });

  it("rejects invalid email", async () => {
    const res = await request(app)
      .post("/api/access-requests")
      .send({
        ...validPayload,
        contactEmail: "not-an-email",
      });

    expect(res.status).toBe(422);
    expect(mockAccessRequestService.submitAccessRequest).not.toHaveBeenCalled();
  });

  it("rejects oversized text fields", async () => {
    const res = await request(app)
      .post("/api/access-requests")
      .send({
        ...validPayload,
        intendedUse: "x".repeat(1001),
      });

    expect(res.status).toBe(422);
    expect(mockAccessRequestService.submitAccessRequest).not.toHaveBeenCalled();
  });

  it("rejects non-http website URLs", async () => {
    const res = await request(app)
      .post("/api/access-requests")
      .send({
        ...validPayload,
        websiteUrl: "javascript:alert(1)",
      });

    expect(res.status).toBe(422);
    expect(mockAccessRequestService.submitAccessRequest).not.toHaveBeenCalled();
  });

  it("rejects honeypot submissions", async () => {
    const res = await request(app)
      .post("/api/access-requests")
      .send({
        ...validPayload,
        website: "bot-filled-value",
      });

    expect(res.status).toBe(422);
    expect(mockAccessRequestService.submitAccessRequest).not.toHaveBeenCalled();
  });
});
