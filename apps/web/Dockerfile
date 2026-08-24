# Web (marketplace) — production multi-stage (monorepo)
# Build: docker build -f apps/web/Dockerfile -t xidmetal-web \
#   --build-arg API_URL=... --build-arg NEXT_PUBLIC_APP_URL=... \
#   --build-arg NEXT_PUBLIC_WS_URL=... .
# Run:  docker run --env-file .env -p 3020:3020 xidmetal-web

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.2.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/typescript-config/package.json packages/typescript-config/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/shared packages/shared
COPY packages/typescript-config packages/typescript-config
COPY apps/web apps/web
ARG API_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_ADMIN_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_PAYMENTS_ENABLED=false
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_FCM_VAPID_KEY
ARG NEXT_PUBLIC_FCM_API_KEY
ARG NEXT_PUBLIC_FCM_PROJECT_ID
ARG NEXT_PUBLIC_FCM_APP_ID
ARG NEXT_PUBLIC_FCM_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_COMING_SOON=false
RUN test -n "$NEXT_PUBLIC_APP_URL" \
  && test -n "$API_URL"
ENV API_URL=$API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_ADMIN_URL=$NEXT_PUBLIC_ADMIN_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_PAYMENTS_ENABLED=$NEXT_PUBLIC_PAYMENTS_ENABLED
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_FCM_VAPID_KEY=$NEXT_PUBLIC_FCM_VAPID_KEY
ENV NEXT_PUBLIC_FCM_API_KEY=$NEXT_PUBLIC_FCM_API_KEY
ENV NEXT_PUBLIC_FCM_PROJECT_ID=$NEXT_PUBLIC_FCM_PROJECT_ID
ENV NEXT_PUBLIC_FCM_APP_ID=$NEXT_PUBLIC_FCM_APP_ID
ENV NEXT_PUBLIC_FCM_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FCM_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_COMING_SOON=$NEXT_PUBLIC_COMING_SOON
RUN pnpm --filter @xidmetal/shared build \
  && pnpm --filter @xidmetal/web build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3020
ENV HOSTNAME=0.0.0.0
RUN apk add --no-cache wget \
  && addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=build --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
USER nextjs
EXPOSE 3020
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3020/ || exit 1
CMD ["node", "apps/web/server.js"]
