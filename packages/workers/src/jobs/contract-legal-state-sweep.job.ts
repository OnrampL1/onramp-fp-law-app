import type { Job } from "bullmq";
import type { Prisma } from "@prisma/client";
import { getPrismaClient } from "@starter-kit/shared";
import type {
  ContractLegalStateSweepJobData,
  ContractLegalStateSweepJobResult,
} from "@starter-kit/shared";

const prisma = getPrismaClient();

// TERMINATED is the sole manual override (set via the Terminate/Reactivate
// endpoint) and is never touched here. Every other state is a pure function
// of today's date against effectiveDate/expirationDate (see
// packages/shared/contracts/legal-state.ts's deriveLegalState) — the three
// buckets below partition every (effectiveDate, expirationDate) pair
// exactly once, so running all three unconditionally, rather than diffing
// against the current value first, is simplest and correct, at the cost of
// a harmless no-op rewrite for contracts already in the right bucket.
//
// `OR: [{ legalState: null }, ...]` is deliberate, not defensive filler:
// Postgres's three-valued logic means a plain `not: "TERMINATED"` filter
// can silently drop NULL rows depending on how the query is built, so
// null is included explicitly rather than trusted to fall out of `not`.
const NOT_TERMINATED: Prisma.ContractWhereInput = {
  deletedAt: null,
  OR: [{ legalState: null }, { legalState: { not: "TERMINATED" } }],
};

export async function processContractLegalStateSweepJob(
  _job: Job<ContractLegalStateSweepJobData, ContractLegalStateSweepJobResult>,
): Promise<ContractLegalStateSweepJobResult> {
  const now = new Date();

  const [toDraft, toExpired, toActive] = await Promise.all([
    prisma.contract.updateMany({
      where: {
        AND: [
          NOT_TERMINATED,
          { OR: [{ effectiveDate: null }, { effectiveDate: { gt: now } }] },
        ],
      },
      data: { legalState: "DRAFT" },
    }),
    prisma.contract.updateMany({
      where: {
        AND: [
          NOT_TERMINATED,
          { effectiveDate: { lte: now } },
          { expirationDate: { lte: now } },
        ],
      },
      data: { legalState: "EXPIRED" },
    }),
    prisma.contract.updateMany({
      where: {
        AND: [
          NOT_TERMINATED,
          { effectiveDate: { lte: now } },
          { OR: [{ expirationDate: null }, { expirationDate: { gt: now } }] },
        ],
      },
      data: { legalState: "ACTIVE" },
    }),
  ]);

  const updatedCount = toDraft.count + toExpired.count + toActive.count;

  if (updatedCount > 0) {
    console.info(
      `[contract-legal-state-sweep] Recomputed ${updatedCount} contract(s)`,
    );
  }

  return { updatedCount };
}
