const mockPrisma = {
  user: {
    findFirst: jest.fn(),
  },
};

const mockUploadFile = jest.fn();
const mockDeleteFile = jest.fn();
const mockGetPresignedUrl = jest.fn();

jest.mock("@starter-kit/shared", () => ({
  getPrismaClient: () => mockPrisma,
  uploadFile: mockUploadFile,
  deleteFile: mockDeleteFile,
  getPresignedUrl: mockGetPresignedUrl,
}));

const mockOrganizationBrainRepository = {
  create: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
  findById: jest.fn(),
  softDelete: jest.fn(),
};

jest.mock("../../src/repositories/organization-brain.repository", () => ({
  organizationBrainRepository: mockOrganizationBrainRepository,
}));

import { organizationBrainService } from "../../src/services/organization-brain.service";

const activeUser = {
  id: "user-1",
  organizationId: "org-1",
  status: "ACTIVE",
  organization: {
    id: "org-1",
    status: "ACTIVE",
  },
};

const actor = {
  userId: "user-1",
  organizationId: "org-1",
};

const requestContext = {
  ipAddress: "127.0.0.1",
  userAgent: "jest",
};

const createdAt = new Date("2026-08-09T10:00:00.000Z");
const updatedAt = new Date("2026-08-09T10:05:00.000Z");

function createRepositoryRow(overrides = {}) {
  return {
    id: "brain-1",
    title: "Vendor MSA",
    type: "TEMPLATE",
    source: "UPLOAD",
    fileName: "Vendor-MSA.pdf",
    mimeType: "application/pdf",
    sizeBytes: 12,
    createdBy: {
      fullName: "Ada Lovelace",
    },
    createdAt,
    updatedAt,
    ...overrides,
  };
}

function createDetailRow(overrides = {}) {
  return {
    ...createRepositoryRow(),
    storageKey: "organization-brain/org-1/file-id-Vendor-MSA.pdf",
    checksum: "checksum-1",
    ...overrides,
  };
}

function createMulterFile(overrides: Partial<Express.Multer.File> = {}) {
  const buffer = Buffer.from("%PDF test file", "utf8");

  return {
    fieldname: "file",
    originalname: "Vendor MSA.pdf",
    encoding: "7bit",
    mimetype: "application/pdf",
    size: buffer.length,
    buffer,
    stream: undefined as never,
    destination: "",
    filename: "",
    path: "",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();

  mockPrisma.user.findFirst.mockResolvedValue(activeUser);
  mockUploadFile.mockResolvedValue(undefined);
  mockDeleteFile.mockResolvedValue(undefined);
  mockGetPresignedUrl.mockResolvedValue("https://signed.example.com/file");

  mockOrganizationBrainRepository.create.mockResolvedValue(
    createRepositoryRow(),
  );
  mockOrganizationBrainRepository.findMany.mockResolvedValue([]);
  mockOrganizationBrainRepository.count.mockResolvedValue(0);
  mockOrganizationBrainRepository.findById.mockResolvedValue(createDetailRow());
  mockOrganizationBrainRepository.softDelete.mockResolvedValue(true);
});

describe("OrganizationBrainService.createFromUpload", () => {
  it("stores a valid upload with an organization-scoped storage key", async () => {
    const file = createMulterFile();

    const result = await organizationBrainService.createFromUpload({
      metadata: {
        title: "Vendor MSA",
        type: "TEMPLATE",
      },
      file,
      actor,
      requestContext,
    });

    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: "user-1",
        organizationId: "org-1",
      },
      include: {
        organization: true,
      },
    });

    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.stringMatching(
        /^organization-brain\/org-1\/[0-9a-f-]+-Vendor-MSA\.pdf$/,
      ),
      file.buffer,
      "application/pdf",
    );

    expect(mockOrganizationBrainRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        createdByUserId: "user-1",
        title: "Vendor MSA",
        type: "TEMPLATE",
        source: "UPLOAD",
        fileName: "Vendor-MSA.pdf",
        mimeType: "application/pdf",
        sizeBytes: file.size,
        checksum: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
      expect.objectContaining({
        action: "ORGANIZATION_BRAIN_ITEM_CREATED",
        actorUserId: "user-1",
        organizationId: "org-1",
        ipAddress: "127.0.0.1",
        userAgent: "jest",
      }),
    );

    expect(result).toEqual({
      id: "brain-1",
      title: "Vendor MSA",
      type: "TEMPLATE",
      source: "UPLOAD",
      fileName: "Vendor-MSA.pdf",
      mimeType: "application/pdf",
      sizeBytes: 12,
      createdByName: "Ada Lovelace",
      createdAt: "2026-08-09T10:00:00.000Z",
      updatedAt: "2026-08-09T10:05:00.000Z",
    });
  });

  it("rejects a missing file", async () => {
    await expect(
      organizationBrainService.createFromUpload({
        metadata: {
          title: "Vendor MSA",
          type: "TEMPLATE",
        },
        file: undefined,
        actor,
        requestContext,
      }),
    ).rejects.toMatchObject({ statusCode: 422 });

    expect(mockUploadFile).not.toHaveBeenCalled();
    expect(mockOrganizationBrainRepository.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid PDF signature", async () => {
    await expect(
      organizationBrainService.createFromUpload({
        metadata: {
          title: "Vendor MSA",
          type: "TEMPLATE",
        },
        file: createMulterFile({
          buffer: Buffer.from("not a pdf", "utf8"),
          size: 9,
        }),
        actor,
        requestContext,
      }),
    ).rejects.toMatchObject({ statusCode: 422 });

    expect(mockUploadFile).not.toHaveBeenCalled();
    expect(mockOrganizationBrainRepository.create).not.toHaveBeenCalled();
  });

  it("returns a safe error when storage upload fails", async () => {
    mockUploadFile.mockRejectedValue(new Error("s3 unavailable"));

    await expect(
      organizationBrainService.createFromUpload({
        metadata: {
          title: "Vendor MSA",
          type: "TEMPLATE",
        },
        file: createMulterFile(),
        actor,
        requestContext,
      }),
    ).rejects.toMatchObject({ statusCode: 502 });

    expect(mockOrganizationBrainRepository.create).not.toHaveBeenCalled();
  });
});

describe("OrganizationBrainService.createFromPaste", () => {
  it("stores pasted content as a text file", async () => {
    await organizationBrainService.createFromPaste({
      input: {
        title: "Preferred Liability Clause",
        type: "CLAUSE",
        content: "  Limit liability to fees paid.  ",
      },
      actor,
      requestContext,
    });

    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.stringMatching(
        /^organization-brain\/org-1\/[0-9a-f-]+-Preferred-Liability-Clause\.txt$/,
      ),
      Buffer.from("Limit liability to fees paid.", "utf8"),
      "text/plain",
    );

    expect(mockOrganizationBrainRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        createdByUserId: "user-1",
        title: "Preferred Liability Clause",
        type: "CLAUSE",
        source: "PASTE",
        fileName: "Preferred-Liability-Clause.txt",
        mimeType: "text/plain",
        sizeBytes: Buffer.byteLength("Limit liability to fees paid.", "utf8"),
        checksum: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
      expect.objectContaining({
        action: "ORGANIZATION_BRAIN_ITEM_CREATED",
      }),
    );
  });

  it("rejects inactive users", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      ...activeUser,
      status: "SUSPENDED",
    });

    await expect(
      organizationBrainService.createFromPaste({
        input: {
          title: "Policy",
          type: "POLICY",
          content: "Use company template.",
        },
        actor,
        requestContext,
      }),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it("rejects inactive organizations", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      ...activeUser,
      organization: {
        id: "org-1",
        status: "SUSPENDED",
      },
    });

    await expect(
      organizationBrainService.createFromPaste({
        input: {
          title: "Policy",
          type: "POLICY",
          content: "Use company template.",
        },
        actor,
        requestContext,
      }),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(mockUploadFile).not.toHaveBeenCalled();
  });
});

describe("OrganizationBrainService.listItems", () => {
  it("returns paginated organization brain items", async () => {
    mockOrganizationBrainRepository.findMany.mockResolvedValue([
      createRepositoryRow(),
    ]);
    mockOrganizationBrainRepository.count.mockResolvedValue(1);

    const result = await organizationBrainService.listItems(
      "org-1",
      { type: "TEMPLATE", search: "vendor" },
      { page: 1, pageSize: 20 },
    );

    expect(mockOrganizationBrainRepository.findMany).toHaveBeenCalledWith(
      "org-1",
      { type: "TEMPLATE", search: "vendor" },
      { page: 1, pageSize: 20 },
    );
    expect(mockOrganizationBrainRepository.count).toHaveBeenCalledWith(
      "org-1",
      { type: "TEMPLATE", search: "vendor" },
    );

    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
    expect(result.items).toHaveLength(1);
  });
});

describe("OrganizationBrainService.getById", () => {
  it("returns item details with a short-lived download URL", async () => {
    const result = await organizationBrainService.getById("brain-1", "org-1");

    expect(mockOrganizationBrainRepository.findById).toHaveBeenCalledWith(
      "brain-1",
      "org-1",
    );
    expect(mockGetPresignedUrl).toHaveBeenCalledWith(
      "organization-brain/org-1/file-id-Vendor-MSA.pdf",
      900,
    );

    expect(result).toEqual({
      id: "brain-1",
      title: "Vendor MSA",
      type: "TEMPLATE",
      source: "UPLOAD",
      fileName: "Vendor-MSA.pdf",
      mimeType: "application/pdf",
      sizeBytes: 12,
      createdByName: "Ada Lovelace",
      createdAt: "2026-08-09T10:00:00.000Z",
      updatedAt: "2026-08-09T10:05:00.000Z",
      downloadUrl: "https://signed.example.com/file",
      downloadUrlExpiresInSeconds: 900,
    });
  });

  it("throws 404 when the item is missing or belongs to another organization", async () => {
    mockOrganizationBrainRepository.findById.mockResolvedValue(null);

    await expect(
      organizationBrainService.getById("brain-1", "org-2"),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mockGetPresignedUrl).not.toHaveBeenCalled();
  });
});

describe("OrganizationBrainService.deleteById", () => {
  it("deletes the stored file and soft-deletes the database row", async () => {
    await organizationBrainService.deleteById("brain-1", actor, requestContext);

    expect(mockOrganizationBrainRepository.findById).toHaveBeenCalledWith(
      "brain-1",
      "org-1",
    );
    expect(mockDeleteFile).toHaveBeenCalledWith(
      "organization-brain/org-1/file-id-Vendor-MSA.pdf",
    );
    expect(mockOrganizationBrainRepository.softDelete).toHaveBeenCalledWith(
      "brain-1",
      "org-1",
      expect.objectContaining({
        action: "ORGANIZATION_BRAIN_ITEM_DELETED",
        actorUserId: "user-1",
        organizationId: "org-1",
        oldValue: expect.objectContaining({
          title: "Vendor MSA",
          checksum: "checksum-1",
        }),
        newValue: expect.objectContaining({
          deletedAt: expect.any(String),
        }),
      }),
    );
  });

  it("throws 404 when the item is missing or belongs to another organization", async () => {
    mockOrganizationBrainRepository.findById.mockResolvedValue(null);

    await expect(
      organizationBrainService.deleteById("brain-1", actor, requestContext),
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(mockDeleteFile).not.toHaveBeenCalled();
    expect(mockOrganizationBrainRepository.softDelete).not.toHaveBeenCalled();
  });

  it("does not soft-delete the row when stored file deletion fails", async () => {
    mockDeleteFile.mockRejectedValue(new Error("s3 unavailable"));

    await expect(
      organizationBrainService.deleteById("brain-1", actor, requestContext),
    ).rejects.toMatchObject({ statusCode: 502 });

    expect(mockOrganizationBrainRepository.softDelete).not.toHaveBeenCalled();
  });
});
