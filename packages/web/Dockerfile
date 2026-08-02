# Debian-based (glibc), not alpine, for this stage specifically: Rollup's
# optional native binary in the committed lockfile doesn't include the
# linux-musl variant Alpine needs, a known npm/Rollup interaction bug. This
# stage is discarded after the build, so it doesn't affect the runtime image.
FROM node:20-slim AS builder
WORKDIR /app

# package.json only, deliberately not package-lock.json: the committed
# lockfile was generated on Windows and pins Rollup's Windows-native optional
# dependency. npm trusts an existing lockfile even under `npm install`, so
# the fix for this known bug (npm/cli#4828) is to let npm resolve fresh here
# rather than hand it a lockfile for the wrong platform — scoped to this
# build stage only, the repo's actual lockfile is untouched.
COPY package.json ./
COPY packages/web/package.json ./packages/web/
RUN npm install --workspace=@starter-kit/web

# packages/web/tsconfig.json extends packages/shared/config/tsconfig.base.json
# at build time only — web has no runtime dependency on @starter-kit/shared,
# but tsc needs this file on disk to resolve its config chain.
COPY packages/shared/config ./packages/shared/config
COPY packages/web ./packages/web
RUN npm run build --workspace=@starter-kit/web

FROM nginx:1.27-alpine AS runner

ARG GIT_SHA=unknown
ARG IMAGE_VERSION=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="clausio-web" \
      org.opencontainers.image.description="Clausio frontend (static build)" \
      org.opencontainers.image.source="https://github.com/MoustafaWehbe/onramp-fp-law-app" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.version="${IMAGE_VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}"

COPY --from=builder /app/packages/web/dist /usr/share/nginx/html
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# 127.0.0.1, not localhost: nginx's `listen 80;` is IPv4-only, but wget
# resolves "localhost" to the IPv6 loopback first inside this container and
# fails with connection refused before ever trying IPv4.
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/health || exit 1
