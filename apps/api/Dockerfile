# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/shared/package.json   packages/shared/
COPY packages/db/package.json       packages/db/
COPY packages/ui/package.json       packages/ui/
COPY packages/llm/package.json      packages/llm/
COPY apps/runtime/package.json      apps/runtime/
COPY apps/api/package.json          apps/api/

RUN pnpm install --frozen-lockfile

COPY packages/ packages/
COPY apps/runtime/ apps/runtime/
COPY apps/api/ apps/api/
COPY tsconfig.base.json ./

ENV DATABASE_URL=postgresql://dummy:dummy@localhost/dummy
RUN pnpm --filter @ybot/db generate
RUN pnpm --filter @ybot/db build
RUN pnpm --filter @ybot/shared build
RUN pnpm --filter @ybot/llm build
RUN pnpm --filter @ybot/runtime build
RUN pnpm --filter @ybot/api build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

COPY --from=builder /app/node_modules                  node_modules/
COPY --from=builder /app/packages/shared/dist          packages/shared/dist/
COPY --from=builder /app/packages/shared/package.json  packages/shared/package.json
COPY --from=builder /app/packages/llm/dist             packages/llm/dist/
COPY --from=builder /app/packages/llm/package.json     packages/llm/package.json
COPY --from=builder /app/packages/db                   packages/db/
COPY --from=builder /app/apps/runtime/dist             apps/runtime/dist/
COPY --from=builder /app/apps/runtime/package.json     apps/runtime/package.json
COPY --from=builder /app/apps/api/dist                 apps/api/dist/
COPY --from=builder /app/apps/api/package.json         apps/api/package.json

EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
