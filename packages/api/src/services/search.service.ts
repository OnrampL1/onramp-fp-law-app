import { getPrismaClient } from "@starter-kit/shared";
import { extractFileNameFromKey } from "./contract.service";
import type { LiveSearchEntry } from "../types/search.types";

const prisma = getPrismaClient();

const RESULTS_PER_CATEGORY = 20;

interface ContractSearchRow {
  id: string;
  title: string;
  counterparty: string;
  tags: string[];
  fileKey: string;
}

function matchesInsensitive(value: string, query: string): boolean {
  return value.toLowerCase().includes(query.toLowerCase());
}

// Tags live in a Postgres text[] column, which Prisma's query builder can
// only filter by exact-value membership (`has`/`hasSome`) — substring
// matching against individual array elements needs the unnest() below, so
// this one query runs raw rather than through the normal repository layer.
async function searchContracts(
  organizationId: string,
  query: string,
): Promise<LiveSearchEntry[]> {
  const like = `%${query}%`;

  const rows = await prisma.$queryRaw<ContractSearchRow[]>`
    SELECT id, title, counterparty, tags, file_key AS "fileKey"
    FROM contracts
    WHERE organization_id = ${organizationId}::uuid
      AND deleted_at IS NULL
      AND (
        title ILIKE ${like}
        OR counterparty ILIKE ${like}
        OR file_key ILIKE ${like}
        OR EXISTS (SELECT 1 FROM unnest(tags) AS t WHERE t ILIKE ${like})
      )
    ORDER BY updated_at DESC
    LIMIT ${RESULTS_PER_CATEGORY}
  `;

  return rows.map((row) => {
    if (matchesInsensitive(row.title, query)) {
      return {
        id: `contract:${row.id}`,
        name: row.title,
        route: `/contracts/${row.id}`,
        category: "contracts",
      };
    }

    if (matchesInsensitive(row.counterparty, query)) {
      return {
        id: `contract:${row.id}`,
        name: row.title,
        route: `/contracts/${row.id}`,
        category: "contracts",
        subtext: `Counterparty: ${row.counterparty}`,
      };
    }

    const matchedTag = row.tags.find((tag) => matchesInsensitive(tag, query));
    if (matchedTag) {
      return {
        id: `contract:${row.id}`,
        name: row.title,
        route: `/contracts/${row.id}`,
        category: "contracts",
        subtext: `Tag: ${matchedTag}`,
      };
    }

    return {
      id: `contract:${row.id}`,
      name: row.title,
      route: `/contracts/${row.id}`,
      category: "contracts",
      subtext: `File: ${extractFileNameFromKey(row.fileKey)}`,
    };
  });
}

// Individual users have no standalone route today (User Management's detail
// view is a side sheet with no URL-addressable open state), so every hit
// routes to the list page rather than the specific person.
async function searchUsers(
  organizationId: string,
  query: string,
): Promise<LiveSearchEntry[]> {
  const rows = await prisma.user.findMany({
    where: {
      organizationId,
      OR: [
        { fullName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, fullName: true, email: true },
    orderBy: { fullName: "asc" },
    take: RESULTS_PER_CATEGORY,
  });

  return rows.map((row) => ({
    id: `user:${row.id}`,
    name: row.fullName,
    route: "/users",
    category: "users",
    ...(matchesInsensitive(row.fullName, query)
      ? {}
      : { subtext: row.email }),
  }));
}

// One organization per tenant, so this is a single-row lookup rather than a
// list — the match target is the org's own name, so it never carries
// subtext.
async function searchOrganization(
  organizationId: string,
  query: string,
): Promise<LiveSearchEntry[]> {
  const organization = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      name: { contains: query, mode: "insensitive" },
    },
    select: { id: true, name: true },
  });

  if (!organization) return [];

  return [
    {
      id: `organization:${organization.id}`,
      name: organization.name,
      route: "/settings?section=organization",
      category: "organization",
    },
  ];
}

async function search(
  organizationId: string,
  query: string,
): Promise<LiveSearchEntry[]> {
  const [contracts, users, organization] = await Promise.all([
    searchContracts(organizationId, query),
    searchUsers(organizationId, query),
    searchOrganization(organizationId, query),
  ]);

  return [...contracts, ...users, ...organization];
}

export const searchService = {
  search,
};
