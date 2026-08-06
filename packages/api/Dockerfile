FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# Install dependencies
COPY package*.json ./
COPY packages/api/package*.json ./packages/api/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --workspace=@starter-kit/api --workspace=@starter-kit/shared

# Copy source
COPY packages/shared ./packages/shared
COPY packages/api ./packages/api

# Prisma Client is generated from the schema, not compiled by tsc, and must
# be generated on this same Alpine/musl platform it will later run on.
# `generate` never connects to the database, so a placeholder URL is enough
# to satisfy the schema's env("DATABASE_URL") reference.
RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
    npx prisma generate --schema=packages/shared/prisma/schema.prisma

# Build shared first, then api
RUN npm run build --workspace=@starter-kit/shared
RUN npm run build --workspace=@starter-kit/api

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl

ARG GIT_SHA=unknown
ARG IMAGE_VERSION=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="clausio-api" \
      org.opencontainers.image.description="Clausio contract management API" \
      org.opencontainers.image.source="https://github.com/onrampl1/onramp-fp-law-app" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.version="${IMAGE_VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}"

ENV NODE_ENV=production

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/packages/shared/package.json ./packages/shared/package.json
# schema.prisma + migrations, not just compiled output: this image doubles
# as the one that runs `prisma migrate deploy` as an explicit deploy step
# (Section 8 of the Deployment Architecture doc) — that command needs the
# raw schema on disk, not the generated client.
COPY --from=base /app/packages/shared/prisma ./packages/shared/prisma
COPY --from=base /app/packages/api/dist ./packages/api/dist
COPY packages/api/package.json ./packages/api/
COPY packages/api/openapi.yaml ./packages/api/dist/openapi.yaml

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

CMD ["node", "packages/api/dist/server.js"]