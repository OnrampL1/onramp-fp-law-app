# Clausio Deployment Architecture

Status: **Frozen.** This document describes the deployment architecture as
agreed after the Deployment Architecture Review. It is authoritative for
infrastructure and deployment decisions, in the same sense that the System
Design Blueprint, the Domain & Business Rules document, and the DDS are
authoritative for the application itself. Implementation batches execute
this design; they do not redesign it. Changes to anything in this document
require a new Deployment Review, not an ad hoc change during implementation.

---

## 1. Overview

### Purpose

This document specifies how Clausio is deployed to production infrastructure
— the runtime topology, the infrastructure components, their networking,
security posture, persistence, and the CI/CD pipeline that ships code to
them. It exists so that a backend or DevOps engineer joining the project can
understand the full deployment without reading Docker Compose files or CI
scripts line by line.

### Deployment goals

- **Learning and demonstration first.** This deployment targets a single
  small VPS, not production traffic. Every decision below is calibrated to
  that scale — professional in structure, but not over-engineered for load
  the system will not see.
- **Reproducibility.** The entire runtime should be recreatable from the
  repository plus one environment file — no undocumented manual steps on
  the server itself.
- **Multi-project readiness.** The VPS is expected to host more than one
  project over time. The architecture treats "shared, cross-project
  infrastructure" and "this project's infrastructure" as two distinct
  concerns from day one, rather than retrofitting the split later.
- **Clean migration path.** Moving to a bigger VPS, a managed database, or
  a real S3 provider should be a configuration change, not a rewrite.

### Scope

Covers the production deployment of `packages/api`, `packages/web`,
`packages/workers`, and the infrastructure they depend on (PostgreSQL,
Redis, MinIO), plus the reverse proxy and CI/CD pipeline that front and
ship them. It does not cover local development setup (see the root
`docker-compose.yml` and `.env.example`, which remain development-only) or
application-level architecture (see the System Design Blueprint, Domain &
Business Rules, and DDS).

---

## 2. Deployment Architecture

### High-level deployment diagram

```
                                   Internet
                                       │
                                   DNS (A record)
                             clausio.wahabtlais.site
                                       │
                              HTTPS (443) / HTTP→HTTPS (80)
                                       │
   ════════════════════════════════════════════════════════════════════
   PUBLIC — the only host ports bound on this VPS
   ════════════════════════════════════════════════════════════════════
                          /opt/reverse-proxy
                    ┌─────────────────────────┐
                    │  nginx (container)         │   TLS termination
                    │  + certbot sidecar          │   ACME renewal (webroot)
                    │  network: public             │
                    │  network: clausio_internal    │  (joined, not owned)
                    └────────────┬────────────┘
                                  │
                proxy_pass /            proxy_pass /api
                       │                       │
   ════════════════════▼═══════════════════════▼═══════════════════════
   INTERNAL — network "clausio_internal", no host ports, unreachable
   from the Internet under any circumstance
   ════════════════════════════════════════════════════════════════════
        ┌────────────────┐        ┌────────────────┐
        │  web (frontend)  │        │  api              │
        │  static nginx     │        │  Express           │
        └────────────────┘        └────────┬───────┘
                                              │
                              ┌───────────────┼────────────────┐
                              │ Prisma          │ BullMQ .add()   │
                              ▼                 ▼                │
                    ┌──────────────┐   ┌──────────┐             │
                    │  PostgreSQL    │   │  Redis     │◄─────────────┘
                    └──────────────┘   └────┬─────┘
                                              │ BullMQ Worker (consumes)
                                              ▼
                                    ┌──────────────┐
                                    │  workers        │
                                    └───────┬──────┘
                                              │ S3 API
                                              ▼
                                    ┌──────────────┐
                                    │  MinIO           │
                                    │  console: never   │
                                    │  exposed            │
                                    └──────────────┘
```

### Runtime topology

Seven runtime components across two logical tiers:

| Tier | Components |
|---|---|
| Edge (shared, cross-project) | reverse proxy (nginx + certbot) |
| Application (Clausio-owned) | `web`, `api`, `workers`, `postgres`, `redis`, `minio` |

The edge tier is intentionally not Clausio's — it belongs to the VPS as a
whole and is expected to front other projects later without modification.
Everything in the application tier belongs to, and is deployed with,
Clausio specifically.

### Public vs. internal services

Exactly one component is public: the reverse proxy, on 80/443. Every other
component — `web`, `api`, `workers`, `postgres`, `redis`, `minio` — has no
host port binding at all, in any environment this document governs. This is
a hard invariant, not a default that individual services may opt out of.
The rationale is covered in full in Section 5 and Section 6, since it is
both a networking decision and a security decision.

### Docker networks

Two networks:

- **`public`** — only the reverse proxy is attached. This is the only
  network with a path to the host's published ports.
- **`clausio_internal`** — `web`, `api`, `workers`, `postgres`, `redis`,
  `minio`, and the reverse proxy (which bridges both). Service discovery
  within this network uses Docker's internal DNS (service names), which is
  also what makes `DATABASE_URL`/`REDIS_URL`/`S3_ENDPOINT` point at
  `postgres`/`redis`/`minio` rather than a physical address — see Section
  12 for why this matters for future scalability.

---

## 3. Infrastructure Components

### Reverse Proxy

- **Responsibility:** TLS termination, HTTP→HTTPS redirect, routing by path
  (`/` to the frontend, `/api` to the API), and — uniquely among these
  components — being the only thing exposed to the Internet.
- **Why it exists:** Every deployed system needs a single, well-understood
  point where encryption is terminated and where public traffic is
  authorized to enter. Concentrating that in one component is what makes
  "nothing else is public" an enforceable rule rather than a convention.
- **Communication:** Inbound from the Internet on 80/443. Outbound to `web`
  and `api` over `clausio_internal`. Runs a `certbot` sidecar that shares a
  volume with it for ACME HTTP-01 challenges.
- **Persistence:** Configuration and TLS certificates only — no application
  data.
- **Security:** The single hardening point for headers, TLS configuration,
  and rate limiting at the edge, in addition to what `helmet` and
  `express-rate-limit` already provide inside the API.

### Frontend (`web`)

- **Responsibility:** Serve the built React static assets (the output of
  `vite build`). No server-side logic.
- **Why it exists as its own container:** It is deliberately *not* baked
  into the reverse proxy image, even though that would save a small amount
  of memory. The reverse proxy is shared, cross-project infrastructure; the
  frontend is Clausio-specific. Coupling them would mean every Clausio
  frontend release rebuilds shared infrastructure that also fronts other
  projects, and a bad Clausio build would risk taking down routing for
  everything else on the VPS. Keeping them separate preserves the reverse
  proxy's role as pure, project-agnostic routing.
- **Communication:** Receives proxied requests from the reverse proxy over
  `clausio_internal`. Makes no outbound calls of its own — it is static
  content.
- **Persistence:** None. Fully rebuilt on every deploy from source.
- **Security:** No host port, no secrets, no database access. The smallest
  possible attack surface of any component in the system.

### API

- **Responsibility:** The Express REST API — request validation,
  authentication, business orchestration, and all reads/writes to
  PostgreSQL.
- **Why it exists:** The only component authorized to talk to PostgreSQL,
  Redis (for job enqueueing and auth-token revocation), and MinIO
  (uploads). The browser never reaches any of those directly — the API is
  the enforced boundary between untrusted input and the data layer.
- **Communication:** Inbound only from the reverse proxy. Outbound to
  `postgres` (Prisma), `redis` (BullMQ enqueue + auth blacklist), and
  `minio` (S3 upload).
- **Persistence:** None — stateless. Any instance can be replaced without
  data loss.
- **Security:** `app.set("trust proxy", 1)` is required here specifically
  *because* a reverse proxy now sits in front of it — see Section 6. Auth
  cookies are `httpOnly`, `secure` in production, scoped to `path: /api`.
  CORS is same-origin in this topology (see Section 5's path-based routing
  rationale).

### Workers

- **Responsibility:** Consume background jobs from Redis (currently:
  contract text extraction) and write results back to PostgreSQL.
- **Why it exists as a separate process from the API:** Text extraction
  (PDF/DOCX parsing) is blocking, variable-duration work. Running it inside
  an HTTP request/response cycle would tie up the API for however long
  parsing takes. A separate process can also fail, retry, and scale
  independently of the API without any of that affecting request-serving
  capacity.
- **Communication:** Consumes from `redis` (BullMQ), reads/writes
  `postgres` (Prisma), reads/writes `minio` (download source file, in
  future phases may write derived artifacts).
- **Persistence:** None — stateless. Job state lives in Redis; results land
  in PostgreSQL.
- **Security:** No host port, no public reachability at all. Extraction
  concurrency is deliberately kept low (1–2, down from the higher value
  used in development) specifically because of the 1 GB RAM ceiling —
  parsing large files is the single most likely source of memory pressure
  on this VPS.

### PostgreSQL

- **Responsibility:** System of record — contracts, users, organizations,
  audit logs, everything durable.
- **Why it exists:** The application's actual state. Every other component
  in this system is replaceable without data loss; this one is not.
- **Communication:** Reached only by `api` and `workers`, only over
  `clausio_internal`. No host port in production, under any circumstance
  (see the Docker+UFW note in Section 6 for why this specific rule is
  non-negotiable).
- **Persistence:** Bind-mounted to `/opt/clausio/data/postgres`. See
  Section 7 for why bind mounts specifically.
- **Security:** Credentials rotated for production (never the development
  defaults). `shared_buffers` and connection limits tuned down from
  Postgres's defaults, which assume a larger host than this VPS provides.

### Redis

- **Responsibility:** Two logically separate uses on one instance — BullMQ
  job-queue storage, and the JWT revocation blacklist (`auth:blacklist:<jti>`
  keys with TTL). These are accessed via two separate connections with
  deliberately different failure semantics: the queue connection tolerates
  waiting during an outage (jobs can wait), the auth connection fails fast
  (a hung login is worse than a clear 503).
- **Why it exists:** Backs BullMQ (see Section 8 for why background jobs
  exist at all) and provides revocation for an otherwise stateless JWT
  scheme.
- **Communication:** Reached only by `api` (both connections) and `workers`
  (queue connection only), over `clausio_internal`.
- **Persistence:** Bind-mounted to `/opt/clausio/data/redis`, though its
  contents (job state, blacklist entries) are treated as disposable — see
  Section 7's backup scope.
- **Security:** No host port. Nothing in Redis is sensitive enough to
  require encryption at rest beyond what the host disk already provides,
  but it is still never reachable from outside `clausio_internal`.

### MinIO

- **Responsibility:** S3-compatible object storage for uploaded contract
  files.
- **Why it exists:** Keeps uploaded files out of both the database and any
  container's ephemeral filesystem, behind the same `uploadFile`/
  `downloadFile` interface that would work against real AWS S3 or
  DigitalOcean Spaces unchanged — see Section 12.
- **Communication:** Reached only by `api` (uploads) and `workers`
  (downloads for extraction), over `clausio_internal`.
- **Persistence:** Bind-mounted to `/opt/clausio/data/minio`. Uploaded
  contract files live inside this bind mount as MinIO objects — there is
  no separate raw "uploads" directory; MinIO's storage *is* the uploads
  storage.
- **Security:** The S3 API port has no host binding. The MinIO web console
  is never exposed publicly under any circumstance — if administrative
  access to it is ever needed, it is reached via SSH port-forwarding, never
  a published port.

---

## 4. Directory Structure

```
/opt/
  reverse-proxy/
    conf.d/               nginx routing config, one file per fronted project
    docker-compose.yml
                          Shared, cross-project. The only component on this
                          VPS with a host-bound port. Owns nothing project-
                          specific.

  clausio/
    app/                  This repository, checked out on the server.
    data/
      postgres/
      redis/
      minio/
    logs/
    backups/
    .env.prod             Never committed to git.
    docker-compose.prod.yml

  <future-project>/
    app/  data/  logs/  backups/  .env.prod  docker-compose.prod.yml
                          Same shape, added later without touching
                          reverse-proxy/ or clausio/.
```

**Reasoning.** The directory boundary mirrors the architectural boundary
from Section 2: infrastructure that is shared across projects
(`reverse-proxy/`) is physically separated from infrastructure that belongs
to one project (`clausio/`). This is what makes "add a second project to
this VPS later" an additive change — a new sibling directory, a new
`conf.d` entry in `reverse-proxy/` — rather than a restructuring of
anything that already exists.

The folder is named `reverse-proxy`, not `nginx`, deliberately: it is named
for its responsibility, not its current implementation. If the reverse
proxy technology ever changes, every reference to it (cron jobs, systemd
units, backup scripts, operational muscle memory) remains correct without
a rename. This is a zero-cost naming decision made once, not a speculative
abstraction — it does not conflict with the project's general preference
to wait for a second occurrence before building abstractions, because
nothing here is deferred engineering effort; it is simply a name chosen
correctly the first time.

---

## 5. Networking

- **`public` network:** attached only to the reverse proxy. This is the
  only network with any path to a host-published port.
- **`clausio_internal` network:** attached to `web`, `api`, `workers`,
  `postgres`, `redis`, `minio`, and the reverse proxy (which bridges both
  networks). Containers reach each other by service name via Docker's
  internal DNS — the same mechanism that lets `DATABASE_URL` resolve to
  `postgres` rather than a hardcoded IP.
- **Why only the reverse proxy exposes ports:** This is the primary
  security control in the entire deployment, not a stylistic preference.
  Network segmentation is a second, defense-in-depth layer on top of it —
  the actual guarantee that PostgreSQL/Redis/MinIO cannot be reached from
  the Internet comes from the fact that they never publish a host port at
  all, for a reason detailed in Section 6.

A single `clausio_internal` network (rather than further segmenting, say,
the data services from the application services) is a deliberate choice to
avoid complexity this deployment's scale doesn't justify. Split further
only if a real isolation requirement emerges — not preemptively.

---

## 6. Security Model

- **HTTPS termination:** at the reverse proxy, via Let's Encrypt
  certificates issued and renewed through a `certbot` sidecar container
  using the webroot ACME challenge method. Renewal is triggered by a
  host-level cron/systemd timer that runs the renewal command and reloads
  the proxy if a certificate actually renewed — the one host-level
  scheduled dependency this design has, even though the proxy itself is
  fully containerized.
- **`trust proxy`:** `app.set("trust proxy", 1)` is required in the API now
  that a reverse proxy is genuinely in front of it. Without it, `req.ip` —
  used as the `ipAddress` recorded on every audit log entry — would report
  the reverse proxy's own address instead of the real client for every
  request, silently degrading the audit trail's evidentiary value.
- **SSH:** key-based authentication only, via the existing `deploy` user.
- **Firewall (UFW):** restricted to SSH, HTTP, HTTPS. Critically, this
  protection is only real if no other container ever publishes a host
  port — Docker manipulates `iptables` directly and can insert rules that
  bypass UFW entirely for any port a container publishes, regardless of
  UFW's own configuration. This is the concrete mechanism behind the
  "nothing but the reverse proxy is public" rule in Sections 2 and 5 — it
  is not a preference, it is what makes the firewall's guarantees actually
  hold.
- **Fail2Ban:** protects SSH as already configured; may later extend to
  the reverse proxy's access logs (tracked in Section 11 as a nice-to-have,
  not required at this scale).
- **Automatic security updates:** already enabled at the OS level. Docker
  base images are pinned by tag and updated deliberately, not
  automatically — a periodic manual rebuild is a reasonable cadence at
  this project's scale.
- **Secrets management:** one root `.env.prod` file on the server, never
  committed (`.env` is git-ignored), loaded by Compose via `env_file:` —
  matching the single-root-environment-file convention already used in
  development. Every development-default credential (database password,
  MinIO root credentials, JWT signing secrets) must be rotated to real
  random values before this file is used in production.
- **Secure cookies:** access and refresh tokens are `httpOnly`,
  `sameSite: "lax"`, and `secure` whenever `NODE_ENV=production` — already
  implemented conditionally in the API; production deployment simply needs
  to actually set that environment variable.
- **Internal-only services:** `web`, `api`, `workers`, `postgres`, `redis`,
  `minio` never publish a host port, in any environment this document
  governs. This is restated here because it is simultaneously a
  networking fact (Section 5) and the load-bearing security control of the
  whole deployment.

---

## 7. Persistent Storage

- **Bind mounts, not named Docker volumes,** for all stateful data
  (`/opt/clausio/data/{postgres,redis,minio}`). Named volumes are managed
  under an opaque Docker-internal path; bind mounts to a path chosen by
  this project make backup, restore, and verification scripts simple to
  write and reason about directly against the host filesystem.
- **PostgreSQL:** the durable system of record. Backed up via `pg_dump`,
  scheduled, rotated, and — critically — verified by actually restoring
  into a scratch instance (see Section 10), not merely assumed to be
  correct because the backup command exited successfully.
- **Redis:** bind-mounted for operational convenience, but treated as
  disposable in the backup story. Its contents — queued job state, revoked
  token entries — are all safely reconstructable or simply expire; there is
  no business data here worth a dedicated backup process.
- **MinIO:** uploaded contract files exist as MinIO objects inside its
  bind-mounted data directory — there is intentionally no separate raw
  "uploads" folder that would duplicate the storage abstraction the
  application already uses (`shared/storage/client.ts`). Backing up this
  directory backs up every uploaded file.
- **Backups as versioned code:** `scripts/backup.sh`, `scripts/restore.sh`,
  and `scripts/verify-backup.sh` live in the repository at the top level
  (not inside any `packages/*` workspace, since they are deployment
  tooling, not application code), read connection details from the
  environment rather than hardcoding them, and are invoked by a
  host-level scheduled task. `verify-backup.sh` specifically exists to
  catch the common failure mode of a backup process that has been quietly
  producing corrupt or empty dumps — a backup that has never been
  test-restored is an assumption, not a guarantee.

---

## 8. CI/CD Architecture

```
GitHub (push to main)
        │
        ▼
GitHub Actions
        │  test / lint / build (turbo)
        │  build images, tag with git SHA (+ semver on manual release tag)
        │  push to ghcr.io/<user>/clausio-{api,web,workers}
        ▼
SSH → VPS
        │  docker compose pull
        │  prisma migrate deploy        (explicit step, before cutover)
        │  docker compose up -d
        │  curl /health — fail the deploy if unhealthy
        ▼
Running containers
```

**Why builds happen in GitHub Actions, not on the VPS.** The VPS has 1
vCPU and 1 GB RAM, already allocated across six running containers.
Building images (`npm ci`, `tsc`, Prisma client generation) concurrently
with a live stack risks both a slow deploy and genuine memory pressure on
a box with no headroom to spare. GitHub Actions provides substantially
more compute for this, at no cost, and it decouples "can we build
successfully" from "is the production box currently busy serving
traffic." The VPS's only job in this pipeline is to pull already-built
images and restart — the least resource-intensive shape that job can take.

Migrations run as an explicit, visible pipeline step rather than being
implicitly bundled into container startup, so a failed migration is a
failed CI step with clear output, not a mysteriously unhealthy container.
The health check at the end is what makes "the deploy succeeded" mean
something more than "the compose command exited zero."

---

## 9. Docker Image Strategy

- **Every push to `main` is tagged with its git SHA**, automatically, at
  build time. This is the tag actually used for rollback — unambiguous,
  and requires no judgment call about what constitutes a "release."
- **Semantic version tags are added deliberately**, only when a git tag
  (e.g. `v1.0.0`) is pushed, via a separate release workflow that tags the
  already-built image for that commit. This is intentionally not automatic
  on every commit — forcing a major/minor/patch decision on every push
  would be process overhead this project doesn't need yet, while a
  human-readable version does matter once the deployment is being
  demonstrated professionally.
- **`:latest` is never the tag actually deployed.** It may exist as a
  convenience pointer, but the pipeline always deploys an explicit SHA or
  semver tag, so "what is currently running in production" is always
  answerable with certainty rather than "whatever `latest` happened to
  point at when it was last pulled."

---

## 10. Operational Conventions

- **Logs go to stdout/stderr**, never to files inside a container. Docker's
  own log driver captures them; the `json-file` driver's `max-size`/
  `max-file` options are configured per service so logs cannot silently
  grow to fill the 25 GB disk over time.
- **Docker health checks** are defined for every stateful service
  (already the pattern for `postgres`/`redis`/`minio` in development) and
  extended to the API's existing `/health` endpoint in production, so
  `depends_on: condition: service_healthy` expresses real startup
  ordering rather than a fixed sleep.
- **Restart policy is `unless-stopped`** across every service — restarts
  automatically after a crash or host reboot, but does not fight a
  deliberate `docker compose stop`.
- **Memory limits are set per service**, sized against the 1 GB total
  budget (minus OS/Docker daemon overhead), so a spike or leak in any one
  container — most plausibly `workers` during large-file extraction —
  cannot exhaust the host and take down PostgreSQL or Redis with it. The
  2 GB swap already provisioned is a safety margin for slowdown, not a
  substitute for these limits.
- **Backup and restore-verification** run on their own schedule,
  independent of deploys, per Section 7.

---

## 11. Deployment Opportunities

Consistent with the Domain Opportunities process used elsewhere in this
project: nothing below is implemented as a side effect of this document.
Each item is discussed and approved on its own before it is built.

**Required for correctness**
- `app.set("trust proxy", 1)` in the API.
- No host-published ports for `postgres`, `redis`, `minio`, `api`,
  `workers` in any production compose file.
- All development-default credentials and JWT secrets rotated before
  first production use.
- Frontend served by its own container, decoupled from the shared reverse
  proxy.
- `prisma migrate deploy` as an explicit CI/CD pipeline step.
- Git-SHA image tagging on every build.

**Valuable enhancement**
- Building images in CI and pushing to GHCR rather than building on the
  VPS.
- SHA-tagged rollback plus a manual, git-tag-triggered semantic version
  release workflow.
- Health-check gating of the CI/CD pipeline.
- Off-site copy of PostgreSQL backups, beyond the VPS itself.
- Docker log rotation limits (`max-size`/`max-file`).
- Non-root `USER` directives in application Dockerfiles.
- `verify-backup.sh` automated restore-and-sanity-check.
- Automated certbot renewal plus reverse-proxy reload.

**Nice-to-have**
- External uptime monitoring (a free ping-based service is proportionate
  at this scale; a self-hosted observability stack is not).
- Fail2Ban rules extended to the reverse proxy's access logs.
- Traefik as a future drop-in replacement for hand-configured nginx +
  certbot, if the shared reverse proxy ever needs to front substantially
  more projects.
- A shell alias/symlink for `/opt/reverse-proxy` if the full path proves
  cumbersome day-to-day.

---

## 12. Future Scalability

None of the following require rewriting the application, because each was
a deliberate constraint of the design rather than an accident:

- **Larger VPS.** Every service is already containerized with explicit
  resource limits rather than assuming unlimited host resources.
  Migrating is: provision the new box, restore the PostgreSQL backup and
  the MinIO bind-mount, repoint DNS. The tested restore procedure
  (Section 7) is what actually makes this painless, more than any code
  change would.
- **Managed PostgreSQL.** The application reaches the database exclusively
  through `DATABASE_URL`, resolved by Prisma. Pointing it at a managed
  database is a configuration change.
- **AWS S3 instead of MinIO.** `shared/storage/client.ts` already targets
  any S3-compatible endpoint via `S3_ENDPOINT`/`S3_FORCE_PATH_STYLE`.
  Migrating is an environment change plus a one-time data copy — no
  application code assumes MinIO specifically.
- **Additional projects behind the shared reverse proxy.** This is the
  entire reason `reverse-proxy/` is separated from `clausio/` in Section
  4 — a new project is a new sibling directory and a new `conf.d` entry,
  never a change to Clausio's own stack or vice versa.
- **Future monitoring and observability.** Structured stdout logging
  (Section 10) and the existing `/health` endpoint are the minimum
  foundation a future metrics/observability stack would build on. Nothing
  heavier is justified at this project's current scale, but nothing here
  blocks adding it later either.

Explicitly out of scope until a real requirement justifies them:
Kubernetes or any orchestrator beyond Docker Compose, a service mesh,
per-service autoscaling, splitting into multiple compose stacks, or
multi-region deployment.

---

## 13. Architecture Decisions

Summary of the major decisions intentionally made during the Deployment
Architecture Review, recorded here for future reference:

1. **Containerized reverse proxy, not host-installed nginx.** Chosen for
   consistency with a fully `docker compose`-reproducible system.
   Host-nginx's main advantage — simpler TLS via certbot's nginx plugin —
   is addressed instead with a `certbot` sidecar container using the
   webroot method, plus one small host-level cron entry for renewal.

2. **Separate frontend container, not baked into the reverse proxy
   image.** Required by the shared-reverse-proxy decision below: shared,
   cross-project infrastructure must never contain one project's build
   artifacts.

3. **One shared reverse proxy for the whole VPS**, not one per project.
   Only one process can bind host ports 80/443; centralizing it gives one
   place to manage TLS and routing across every project this VPS will
   ever host.

4. **Bind mounts instead of named Docker volumes** for all persistent
   data, so backup and restore tooling operates against known,
   host-visible paths rather than Docker-internal storage.

5. **Docker Compose for production orchestration**, not Kubernetes or
   Docker Swarm. Matches the actual scale of one VPS with 1 GB RAM;
   orchestration overhead beyond Compose is not justified here.

6. **Images built in GitHub Actions, never on the VPS.** A direct
   consequence of the VPS's resource ceiling — building on-box risks
   memory pressure against a live stack with no headroom to spare.

7. **Dual image tagging — git SHA always, semantic version on deliberate
   release.** SHA tagging costs nothing and gives exact rollback
   traceability; semantic versioning is added only when a release is
   actually being cut, avoiding forced versioning discipline on every
   commit.

8. **Two-network design (`public` / `clausio_internal`).** Defense in
   depth layered on top of the primary control, which is that nothing but
   the reverse proxy ever publishes a host port at all.
