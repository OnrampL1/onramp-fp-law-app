# Migration Notes: Sequelize → Prisma

This branch fully replaces Sequelize with Prisma as the database layer, and
rewrites authentication on top of it. If you're pulling this for the first
time, read this before running anything.

## What changed

- The database schema is now owned entirely by Prisma
  (`packages/shared/prisma/schema.prisma` + `prisma/migrations/`).
- Sequelize, `sequelize-cli`, all Sequelize models, migrations, and seeders
  have been removed from the repo — there is nothing left that depends on
  them.
- Authentication (`register` / `login` / `refresh` / `logout` / `me`) has
  been rewritten against the Prisma `User` model. The old open
  self-registration endpoint is gone — Clausio has no public sign-up;
  membership is granted by Invitation only, so `POST /api/auth/register`
  is now `POST /api/auth/accept-invitation`.
- Refresh token revocation is now a Redis blacklist (keyed by JWT `jti`,
  TTL = remaining token life) instead of database-backed `sessions` /
  `refresh_tokens` tables — those tables no longer exist.

## What you need to do after pulling

```bash
npm install                # picks up prisma, tsx, dotenv-cli, @prisma/client
docker-compose up -d        # Postgres + Redis

cp .env.example .env        # only if you don't already have a .env

npm run db:generate         # generates the Prisma Client — do this before running anything else
npm run db:migrate          # applies the committed migrations to your local database
npm run db:seed             # optional: realistic demo data + working demo logins

npm run dev
```

## If `npm run db:migrate` fails with "relation already exists"

This means your local Postgres still has tables from the **old** Sequelize
schema (from before this branch). Prisma's migrations try to create tables
with the same names (`organizations`, `users`, `contracts`, etc.) and will
collide with the old ones.

This is local dev data only — the fix is to reset your local database's
`public` schema and re-run the migration:

```sql
-- Connect with psql, a GUI client, or however you normally reach your local Postgres:
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

Then run `npm run db:migrate` again.

## What you should *not* do anymore

- No `sequelize-cli` commands of any kind — the tooling is gone.
- No manually running migrations from inside `packages/api` — migrations
  now live in and run from `packages/shared`.

## Demo logins (after `npm run db:seed`)

All seeded users share one password: **`Password123!`**

| Role | Email |
|---|---|
| Owner | `sarah.whitfield@ridgelinevoss.com` |
| Admin | `marcus.chen@ridgelinevoss.com` |
| Internal (Legal) | `priya.nair@ridgelinevoss.com` |
| Internal (Ops) | `daniel.osei@ridgelinevoss.com` |

There's also a fifth demo user, `jordan.blake@ridgelinevoss.com`, seeded in
`INVITED` status (not yet active) with a matching pending `Invitation`, to
demonstrate the invitation flow — it won't log in until that invitation is
accepted via `POST /api/auth/accept-invitation`.
