# Admin panel — production multi-stage (monorepo)
# Build: docker build -f apps/admin/Dockerfile -t xidmetal-admin \
#   --build-arg API_URL=... --build-arg NEXT_PUBLIC_ADMIN_URL=... .
# Run:  docker run --env-file .env -p 3021:3021 xidmetal-admin

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.2.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/admin/package.json apps/admin/
COPY packages/shared/package.json packages/shared/
COPY packages/typescript-config/package.json packages/typescript-config/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/shared packages/shared
COPY packages/typescript-config packages/typescript-config
COPY apps/admin apps/admin
ARG API_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ADMIN_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_SENTRY_DSN
RUN test -n "$NEXT_PUBLIC_ADMIN_URL" \
  && test -n "$API_URL"
ENV API_URL=$API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_ADMIN_URL=$NEXT_PUBLIC_ADMIN_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
RUN pnpm --filter @xidmetal/shared build \
  && pnpm --filter @xidmetal/admin build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3021
ENV HOSTNAME=0.0.0.0
RUN apk add --no-cache wget \
  && addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=build --chown=nextjs:nodejs /app/apps/admin/public ./apps/admin/public
COPY --from=build --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static
USER nextjs
EXPOSE 3021
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3021/ || exit 1
CMD ["node", "apps/admin/server.js"]
