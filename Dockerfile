# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    DATABASE_URL=mysql://mock:mock@127.0.0.1:3306/life_leap
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@9.15.9 --activate
COPY package.json pnpm-lock.yaml .npmrc ./
COPY prisma ./prisma
# 含 devDependencies：运行时用 tsx 启动 socket/server.ts。不要在这一层设置 NODE_ENV=production。
RUN pnpm install --frozen-lockfile
COPY . .
# Render 会把服务环境变量作为 build-arg 传入。未设置时留空，客户端改为连当前页面来源。
ARG NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_APP_URL
ARG USE_MOCK_DATA=true
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    USE_MOCK_DATA=$USE_MOCK_DATA
RUN pnpm build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    USE_MOCK_DATA=true \
    PORT=10000
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 10000
CMD ["node", "scripts/start-demo.mjs"]
