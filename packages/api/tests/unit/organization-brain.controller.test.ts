import request from "supertest";

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
};

jest.mock("@starter-kit/shared", () => ({
  ...jest.requireActual("@starter-kit/shared"),
  getPrismaClient: jest.fn(() => mockPrisma),
  isJtiBlacklisted: jest.fn().mockResolvedValue(false),
}));

jest.mock("../../src/services/organization-brain.service", () => ({
  organizationBrainService: {
    createFromUpload: jest.fn(),
    createFromPaste: jest.fn(),
    listItems: jest.fn(),
    getById: jest.fn(),
    deleteById: jest.fn(),
  },
}));

import { app } from "../../app";
import { signAccessToken } from "@starter-kit/shared";
import { organizationBrainService } from "../../src/services/organization-brain.service";

const mockOrganizationBrainService = organizationBrainService as jest.Mocked<
  typeof organizationBrainService
>;

const itemId = "11111111-1111-1111-1111-111111111111";

function cookieFor(role: "OWNER" | "ADMIN" | "INTERNAL") {
  mockPrisma.user.findUnique.mockResolvedValue({
    id: "user-1",
    organizationId: "org-1",
    role,
    status: "ACTIVE",
    organization: {
      status: "ACTIVE",
    },
  });

  const token = signAccessToken({ userId: "user-1", orgId: "org-1", role });
  return `accessToken=${token}`;
}

beforeEach(() => {
  jest.clearAllMocks();

  mockPrisma.user.findUnique.mockResolvedValue({
    id: "user-1",
    organizationId: "org-1",
    role: "INTERNAL",
    status: "ACTIVE",
    organization: {
      status: "ACTIVE",
    },
  });
});

describe("Organization Brain routes", () => {
  it("returns 401 for unauthenticated list requests", async () => {
    const res = await request(app).get("/api/organization-brain");

    expect(res.status).toBe(401);
    expect(mockOrganizationBrainService.listItems).not.toHaveBeenCalled();
  });

  it("lists items using organization scope from the token", async () => {
    mockOrganizationBrainService.listItems.mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    const res = await request(app)
      .get("/api/organization-brain?organizationId=other-org&type=POLICY")
      .set("Cookie", cookieFor("INTERNAL"));

    expect(res.status).toBe(200);
    expect(mockOrganizationBrainService.listItems).toHaveBeenCalledWith(
      "org-1",
      { type: "POLICY", search: undefined },
      { page: 1, pageSize: 20 },
    );
  });

  it("returns 422 for invalid list filters", async () => {
    const res = await request(app)
      .get("/api/organization-brain?type=BAD_TYPE")
      .set("Cookie", cookieFor("ADMIN"));

    expect(res.status).toBe(422);
    expect(mockOrganizationBrainService.listItems).not.toHaveBeenCalled();
  });

  it("allows admins to create pasted organization brain content", async () => {
    mockOrganizationBrainService.createFromPaste.mockResolvedValue({
      id: itemId,
      title: "Preferred Liability Clause",
      type: "CLAUSE",
      source: "PASTE",
      fileName: "Preferred-Liability-Clause.txt",
      mimeType: "text/plain",
      sizeBytes: 42,
      createdByName: "Admin User",
      createdAt: "2026-08-09T00:00:00.000Z",
      updatedAt: "2026-08-09T00:00:00.000Z",
    });

    const res = await request(app)
      .post("/api/organization-brain/paste")
      .set("Cookie", cookieFor("ADMIN"))
      .set("User-Agent", "jest")
      .send({
        title: "Preferred Liability Clause",
        type: "CLAUSE",
        content: "Liability is capped at fees paid in the prior 12 months.",
      });

    expect(res.status).toBe(201);
    expect(mockOrganizationBrainService.createFromPaste).toHaveBeenCalledWith({
      input: {
        title: "Preferred Liability Clause",
        type: "CLAUSE",
        content: "Liability is capped at fees paid in the prior 12 months.",
      },
      actor: { userId: "user-1", organizationId: "org-1" },
      requestContext: expect.objectContaining({
        ipAddress: expect.any(String),
        userAgent: "jest",
      }),
    });
  });

  it("blocks internal users from creating pasted content", async () => {
    const res = await request(app)
      .post("/api/organization-brain/paste")
      .set("Cookie", cookieFor("INTERNAL"))
      .send({
        title: "Internal Policy",
        type: "POLICY",
        content: "Use company standard terms.",
      });

    expect(res.status).toBe(403);
    expect(mockOrganizationBrainService.createFromPaste).not.toHaveBeenCalled();
  });

  it("returns 422 for empty pasted content", async () => {
    const res = await request(app)
      .post("/api/organization-brain/paste")
      .set("Cookie", cookieFor("OWNER"))
      .send({
        title: "Internal Policy",
        type: "POLICY",
        content: "   ",
      });

    expect(res.status).toBe(422);
    expect(mockOrganizationBrainService.createFromPaste).not.toHaveBeenCalled();
  });

  it("allows owners to upload a supported file", async () => {
    mockOrganizationBrainService.createFromUpload.mockResolvedValue({
      id: itemId,
      title: "MSA Template",
      type: "TEMPLATE",
      source: "UPLOAD",
      fileName: "msa-template.pdf",
      mimeType: "application/pdf",
      sizeBytes: 12,
      createdByName: "Owner User",
      createdAt: "2026-08-09T00:00:00.000Z",
      updatedAt: "2026-08-09T00:00:00.000Z",
    });

    const res = await request(app)
      .post("/api/organization-brain/upload")
      .set("Cookie", cookieFor("OWNER"))
      .field("title", "MSA Template")
      .field("type", "TEMPLATE")
      .attach("file", Buffer.from("%PDF-1.4 test"), {
        filename: "msa-template.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(201);
    expect(mockOrganizationBrainService.createFromUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { title: "MSA Template", type: "TEMPLATE" },
        actor: { userId: "user-1", organizationId: "org-1" },
        file: expect.objectContaining({
          originalname: "msa-template.pdf",
          mimetype: "application/pdf",
        }),
      }),
    );
  });

  it("blocks internal users from uploading files", async () => {
    const res = await request(app)
      .post("/api/organization-brain/upload")
      .set("Cookie", cookieFor("INTERNAL"))
      .field("title", "MSA Template")
      .field("type", "TEMPLATE")
      .attach("file", Buffer.from("%PDF-1.4 test"), {
        filename: "msa-template.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(403);
    expect(
      mockOrganizationBrainService.createFromUpload,
    ).not.toHaveBeenCalled();
  });

  it("returns 422 for unsupported upload file types", async () => {
    const res = await request(app)
      .post("/api/organization-brain/upload")
      .set("Cookie", cookieFor("ADMIN"))
      .field("title", "Executable")
      .field("type", "POLICY")
      .attach("file", Buffer.from("not allowed"), {
        filename: "malware.exe",
        contentType: "application/octet-stream",
      });

    expect(res.status).toBe(422);
    expect(
      mockOrganizationBrainService.createFromUpload,
    ).not.toHaveBeenCalled();
  });

  it("retrieves an item by id using token organization scope", async () => {
    mockOrganizationBrainService.getById.mockResolvedValue({
      id: itemId,
      title: "Security Policy",
      type: "POLICY",
      source: "UPLOAD",
      fileName: "security-policy.txt",
      mimeType: "text/plain",
      sizeBytes: 100,
      createdByName: "Admin User",
      createdAt: "2026-08-09T00:00:00.000Z",
      updatedAt: "2026-08-09T00:00:00.000Z",
      downloadUrl: "https://storage.example.com/signed-url",
      downloadUrlExpiresInSeconds: 900,
    });

    const res = await request(app)
      .get(`/api/organization-brain/${itemId}`)
      .set("Cookie", cookieFor("INTERNAL"));

    expect(res.status).toBe(200);
    expect(mockOrganizationBrainService.getById).toHaveBeenCalledWith(
      itemId,
      "org-1",
    );
  });

  it("allows admins to delete an item", async () => {
    mockOrganizationBrainService.deleteById.mockResolvedValue(undefined);

    const res = await request(app)
      .delete(`/api/organization-brain/${itemId}`)
      .set("Cookie", cookieFor("ADMIN"))
      .set("User-Agent", "jest");

    expect(res.status).toBe(204);
    expect(mockOrganizationBrainService.deleteById).toHaveBeenCalledWith(
      itemId,
      { userId: "user-1", organizationId: "org-1" },
      expect.objectContaining({
        ipAddress: expect.any(String),
        userAgent: "jest",
      }),
    );
  });

  it("blocks internal users from deleting items", async () => {
    const res = await request(app)
      .delete(`/api/organization-brain/${itemId}`)
      .set("Cookie", cookieFor("INTERNAL"));

    expect(res.status).toBe(403);
    expect(mockOrganizationBrainService.deleteById).not.toHaveBeenCalled();
  });
});
