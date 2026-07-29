import { AuditAction } from "@prisma/client";
import { z } from "zod";

const auditListBaseShape = {
  actorUserId: z.string().uuid().optional(),
  // Accepts either one action (?action=X) or several (?action=X&action=Y,
  // which express/qs parses as an array) — e.g. the Witness Workflow page's
  // Access Activity tab filtering to its 3 witness-related actions at once.
  action: z
    .union([z.nativeEnum(AuditAction), z.array(z.nativeEnum(AuditAction))])
    .optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

// Org-wide audit log listing: GET /organizations/:id/audit-logs
export const listAuditLogsQuerySchema = z.object({
  contractId: z.string().uuid().optional(),
  ...auditListBaseShape,
});

// Contract-scoped wrapper: GET /contracts/:id/audit — contractId comes from
// the path, not the query.
export const listContractAuditLogsQuerySchema = z.object(auditListBaseShape);

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
export type ListContractAuditLogsQuery = z.infer<
  typeof listContractAuditLogsQuerySchema
>;
