# Reverse Proxy — Deployment Runbook

This directory is shared, cross-project infrastructure — the one component
on the VPS allowed to bind ports 80/443 (see the Clausio Deployment
Architecture doc for the full reasoning). It's self-contained on purpose:
everything needed to recreate it from scratch lives here.

Expected location on the VPS: `/opt/reverse-proxy`.

---

## Prerequisites

- Docker + the `docker compose` (v2) CLI installed on the host.
- DNS for `clausio.wahabtlais.site` already pointed at this VPS's public IP.
- **Clausio's own stack must already be running** before any of this.
  `docker-compose.prod.yml` (at `/opt/clausio/app`) is what creates the
  `clausio_internal` network — this project's `docker-compose.yml`
  references it as `external: true` and will fail to start if it doesn't
  exist yet. Deployment order is always: Clausio's stack first, this one
  second.

---

## First deployment (bootstrap)

Nginx's HTTPS server block requires a certificate file to exist before it
will even start — but Let's Encrypt can't issue a real one until nginx is
already running and serving the ACME challenge over plain HTTP. The
standard way through that chicken-and-egg problem is a short-lived dummy
certificate that lets nginx start once, get replaced with the real thing,
then reload.

```bash
cd /opt/reverse-proxy

# 1. Generate a throwaway self-signed cert — just enough for nginx to boot.
mkdir -p certbot/conf/live/clausio.wahabtlais.site
docker run --rm -v "$(pwd)/certbot/conf:/certs" alpine/openssl req \
  -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout /certs/live/clausio.wahabtlais.site/privkey.pem \
  -out /certs/live/clausio.wahabtlais.site/fullchain.pem \
  -subj "/CN=localhost"

# 2. Start nginx. It now has *a* certificate to load, even though it's fake.
docker compose up -d nginx

# 3. Request the real certificate via the HTTP-01 challenge (plain HTTP,
#    served by the location /.well-known/acme-challenge/ block).
docker compose --profile tools run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d clausio.wahabtlais.site \
  --email <your-email> --agree-tos --no-eff-email

# 4. Reload nginx so it picks up the real certificate.
docker compose exec nginx nginx -s reload
```

After step 4, `https://clausio.wahabtlais.site` is serving with a real,
trusted certificate. Verify with `curl -I https://clausio.wahabtlais.site/health`.

`certbot` uses the `tools` Compose profile specifically so it's never
started as a side effect of a routine `docker compose up`/`up -d` — every
invocation of it is explicit and named, both here and in renewal below.

---

## Renewal

Not automatic on its own — set up a host-level cron entry (this is a
deliberate architectural choice: renewal is a scheduled host task, not a
long-running container):

```
0 3 * * * cd /opt/reverse-proxy && docker compose --profile tools run --rm certbot renew --quiet && docker compose exec nginx nginx -s reload
```

`certbot renew` only actually renews when a certificate is within its
renewal window (default: last 30 days of validity) — running it daily is
safe and standard; it's a no-op most days. The `nginx -s reload` after it
is cheap and harmless even on the days nothing renewed.

---

## Starting nginx day-to-day

Once bootstrapped, normal start/stop is just:

```bash
docker compose up -d      # nginx only — certbot's `tools` profile keeps it out
docker compose down       # stops nginx; certbot was never running anyway
```

`docker compose ps` should show exactly one service, `nginx`, `Up (healthy)`.

---

## Expected deployment order, end to end

1. Clausio's `docker-compose.prod.yml` up (creates `clausio_internal`).
2. `prisma migrate deploy` (Clausio's own migration step).
3. Rest of Clausio's stack up (`api`, `workers`, `web`).
4. This reverse proxy's bootstrap sequence (above), first time only.
5. On every subsequent deploy: just `docker compose up -d` here — no
   bootstrap steps needed again, the certificate and its renewal cron
   persist independently of any application deploy.

---

## Recreating on a brand-new VPS

Nothing here depends on prior state except the `clausio_internal` network
(created by Clausio's own stack, see above). A fresh VPS needs: this
`reverse-proxy/` directory, Docker installed, DNS already pointed at it,
and the bootstrap sequence run once. `certbot/conf/` and `certbot/www/`
are gitignored on purpose (see `.gitignore`) — they hold generated
certificates and ACME state, never checked into the repository, and get
recreated fresh by the bootstrap steps above every time.
