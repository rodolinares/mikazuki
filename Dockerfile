FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src/ ./src/
RUN pnpm build

RUN addgroup -S mikazuki && adduser -S -G mikazuki mikazuki
USER mikazuki

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD [ -f /tmp/mikazuki-alive ] && [ "$(($(date +%s) - $(cat /tmp/mikazuki-alive) / 1000))" -lt 120 ] || exit 1

CMD ["node", "dist/index.js"]
