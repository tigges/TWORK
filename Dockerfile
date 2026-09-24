# ─── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/db/package.json       packages/db/
COPY packages/storage/package.json  packages/storage/
COPY apps/server/package.json       apps/server/
COPY apps/web/package.json          apps/web/
COPY apps/worker/package.json       apps/worker/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=deps /app/node_modules                    ./node_modules
COPY --from=deps /app/packages/db/node_modules        ./packages/db/node_modules
COPY --from=deps /app/packages/storage/node_modules   ./packages/storage/node_modules
COPY --from=deps /app/apps/server/node_modules        ./apps/server/node_modules
COPY --from=deps /app/apps/web/node_modules           ./apps/web/node_modules
COPY --from=deps /app/apps/worker/node_modules        ./apps/worker/node_modules

COPY . .

# Build packages (order matters — packages before apps)
RUN pnpm --filter @twork/db      build
RUN pnpm --filter @twork/storage build
RUN pnpm --filter @twork/server  build
RUN pnpm --filter @twork/web     build
RUN pnpm --filter @twork/worker  build

# ─── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 twork \
 && adduser  --system --uid 1001 twork

# Copy only production artefacts
COPY --from=builder --chown=twork:twork /app/packages/db/dist       ./packages/db/dist
COPY --from=builder --chown=twork:twork /app/packages/db/migrations  ./packages/db/migrations
COPY --from=builder --chown=twork:twork /app/packages/storage/dist   ./packages/storage/dist
COPY --from=builder --chown=twork:twork /app/apps/server/dist        ./apps/server/dist
COPY --from=builder --chown=twork:twork /app/apps/web/dist           ./apps/web/dist
COPY --from=builder --chown=twork:twork /app/apps/worker/dist        ./apps/worker/dist

# Copy node_modules (production deps only)
COPY --from=deps --chown=twork:twork /app/node_modules              ./node_modules
COPY --from=deps --chown=twork:twork /app/packages/db/node_modules  ./packages/db/node_modules
COPY --from=deps --chown=twork:twork /app/packages/storage/node_modules ./packages/storage/node_modules
COPY --from=deps --chown=twork:twork /app/apps/server/node_modules  ./apps/server/node_modules
COPY --from=deps --chown=twork:twork /app/apps/worker/node_modules  ./apps/worker/node_modules

USER twork

# Default: run the server.
# Override CMD in docker-compose to run the worker instead.
CMD ["node", "apps/server/dist/index.js"]
