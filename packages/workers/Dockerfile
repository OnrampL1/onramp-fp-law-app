FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

# Install dependencies
COPY package*.json ./
COPY packages/workers/package*.json ./packages/workers/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --workspace=@starter-kit/workers --workspace=@starter-kit/shared

# Copy source
COPY packages/shared ./packages/shared
COPY packages/workers ./packages/workers

RUN DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder" \
    npx prisma generate --schema=packages/shared/prisma/schema.prisma

# Build shared first, then workers
RUN npm run build --workspace=@starter-kit/shared
RUN npm run build --workspace=@starter-kit/workers

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl

ARG GIT_SHA=unknown
ARG IMAGE_VERSION=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="clausio-workers" \
      org.opencontainers.image.description="Clausio background job workers (extraction, email, embeddings)" \
      org.opencontainers.image.source="https://github.com/MoustafaWehbe/onramp-fp-law-app" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.version="${IMAGE_VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}"

ENV NODE_ENV=production

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=base /app/packages/workers/dist ./packages/workers/dist
COPY packages/workers/package.json ./packages/workers/

USER node

CMD ["node", "packages/workers/dist/index.js"]
