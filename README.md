# Starter Kit

A full-stack TypeScript monorepo with everything pre-configured so you can focus on building features.

## Stack

| Layer           | Technology                              |
| --------------- | --------------------------------------- |
| Frontend        | React 18, Vite, Tailwind CSS, shadcn/ui |
| Backend         | Express, Prisma, Zod                    |
| Background Jobs | BullMQ, Redis                           |
| Database        | PostgreSQL                              |
| Monorepo        | Turborepo                               |
| Language        | TypeScript (everywhere)                 |

## Project Structure

```
packages/
  web/        → React + Vite frontend (port 5173)
  api/        → Express REST API (port 3000)
  workers/    → BullMQ background job processors
  shared/     → Shared utilities (auth, db models, queue, AI)
```

## Getting Started

### 1. Prerequisites

- Node.js >= 20
- Docker (for PostgreSQL + Redis)

### 2. Install dependencies

```bash
npm install
```

### 3. Start infrastructure

```bash
docker-compose up -d
```

### 4. Configure environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 5. Run database migrations

```bash
npm run db:generate   # generate the Prisma Client
npm run db:migrate     # apply migrations
npm run db:seed        # optional sample data
```

> Pulling this repo for the first time after the Sequelize → Prisma migration?
> See [MIGRATION_NOTES.md](./MIGRATION_NOTES.md) before running the above.

### 6. Start development servers

```bash
# Start all packages in parallel
npm run dev

# Or start individually
cd packages/api && npm run dev     # API on :3000
cd packages/web && npm run dev     # Web on :5173
cd packages/workers && npm run dev # Workers
```

## Windows development notes

When developing on Windows, Prisma Client files may stay locked if multiple
Node.js, API, worker, test, or dev-server processes are running at the same
time. If `prisma generate`, installs, or rebuilds fail with a locked Prisma
client DLL, stop the running development processes and retry the command.

The `packages/shared` source directories are TypeScript-only during
development. If a local TypeScript command emits `.js`, `.js.map`, or `.d.ts`
files beside the `.ts` source files, remove those generated files before
continuing. They are ignored by git because stale compiled files can be loaded
instead of the current TypeScript source.

## Domain review notes

### Invitation organization invariant

The Prisma schema links `User.invitationId` to `Invitation.id`, but the
database does not currently enforce that the accepted user's
`organizationId` matches the invitation's `organizationId`.

The current application flow preserves this invariant in service logic:
accepting an invitation creates the user from the invitation record and copies
`invitation.organizationId` onto the user. Invitation create, resend, and revoke
operations are also scoped by the actor's organization.

The remaining risk is direct database writes, seed/script changes, or future
service code that sets `User.organizationId` and `User.invitationId`
independently. Do not patch this with an ad hoc Prisma schema change in this
branch. Treat any database-level enforcement for this invariant as a separate
domain review.

## Available Scripts (root)

| Command         | Description                      |
| --------------- | -------------------------------- |
| `npm run dev`   | Start all packages in watch mode |
| `npm run build` | Build all packages               |
| `npm run test`  | Run all test suites              |
| `npm run lint`  | Lint all packages                |

## Environment Variables

See `.env.example` for all required variables.

## Testing

```bash
npm run test              # Run all tests
cd packages/api && npm test  # API unit tests (Jest)
cd packages/web && npm test  # Web tests (Vitest)
```

## Docker

The `docker-compose.yml` starts:

- **PostgreSQL 16** on port `5432`
- **Redis 7** on port `6379`
