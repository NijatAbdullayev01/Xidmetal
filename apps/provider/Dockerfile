# Xidmət verən paneli — production multi-stage (monorepo)
# Build: docker build -f apps/provider/Dockerfile -t xidmetal-provider \
#   --build-arg API_URL=... --build-arg NEXT_PUBLIC_PROVIDER_URL=... .
# Run:  docker run --env-file .env -p 3022:3022 xidmetal-provider

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.2.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/provider/package.json apps/provider/
COPY packages/shared/package.json packages/shared/
COPY packages/typescript-config/package.json packages/typescript-config/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/shared packages/shared
COPY packages/typescript-config packages/typescript-config
COPY apps/provider apps/provider
ARG API_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_PROVIDER_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
RUN test -n "$NEXT_PUBLIC_PROVIDER_URL" \
  && test -n "$API_URL"
ENV API_URL=$API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_PROVIDER_URL=$NEXT_PUBLIC_PROVIDER_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID
RUN pnpm --filter @xidmetal/shared build \
  && pnpm --filter @xidmetal/provider build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3022
ENV HOSTNAME=0.0.0.0
RUN apk add --no-cache wget \
  && addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=build --chown=nextjs:nodejs /app/apps/provider/public ./apps/provider/public
COPY --from=build --chown=nextjs:nodejs /app/apps/provider/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/provider/.next/static ./apps/provider/.next/static
USER nextjs
EXPOSE 3022
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3022/ || exit 1
CMD ["node", "apps/provider/server.js"]
