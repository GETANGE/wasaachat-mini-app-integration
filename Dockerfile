# syntax=docker/dockerfile:1

ARG BUN_VERSION=1.3.14

FROM oven/bun:${BUN_VERSION}-slim AS deps
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile --production

# The on-prem nodes expose a generic QEMU CPU without AVX, and the default bun
# binary dies there with "Illegal instruction"; the baseline build runs. (Nodes
# with no SSE4.2 at all can't run bun either way; the chart keeps pods off them.)
FROM debian:bookworm-slim AS bun-baseline
ARG BUN_VERSION
ARG TARGETARCH
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl unzip \
 && if [ "$TARGETARCH" = "amd64" ]; then asset=bun-linux-x64-baseline; else asset=bun-linux-aarch64; fi \
 && curl -fsSL -o /tmp/bun.zip "https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/${asset}.zip" \
 && unzip -q /tmp/bun.zip -d /tmp \
 && mv /tmp/${asset}/bun /bun

FROM oven/bun:${BUN_VERSION}-slim
COPY --from=bun-baseline /bun /usr/local/bin/bun
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY drizzle ./drizzle
COPY public ./public
RUN mkdir -p logs public/uploads && chown -R bun:bun logs public/uploads
USER bun
EXPOSE 3000
CMD ["bun", "src/index.ts"]
