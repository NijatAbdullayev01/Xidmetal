# API — production multi-stage (monorepo)
# Build: docker build -f apps/api/Dockerfile -t xidmetal-api .
# Run:  docker run --env-file .env -p 4000:4000 xidmetal-api

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.2.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/database/package.json packages/database/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/shared packages/shared
COPY packages/database packages/database
COPY apps/api apps/api
RUN pnpm --filter @xidmetal/database generate \
  && pnpm --filter @xidmetal/shared build \
  && pnpm --filter @xidmetal/api build

FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@9.2.0 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/packages ./packages
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/v1/health/ready || exit 1
CMD ["sh", "-c", "pnpm --filter @xidmetal/database exec prisma migrate deploy && pnpm --filter @xidmetal/api start:prod"]
