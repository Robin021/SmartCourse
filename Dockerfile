FROM node:20-alpine AS base

# 安装依赖阶段
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 构建阶段
FROM base AS builder
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 生产运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# 安装 Chromium 和 Puppeteer 所需的系统依赖
# 这对于 @mermaid-js/mermaid-cli 在生产环境渲染 Mermaid 图表是必需的
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-cjk

# 配置 Puppeteer 使用系统安装的 Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 复制 mermaid-cli 及其所有依赖到 node_modules
# Next.js standalone 模式不包含这些运行时需要的模块
# 复制 .bin 目录以保留可执行文件符号链接
COPY --from=deps /app/node_modules/.bin ./node_modules/.bin

# 复制 mermaid-cli 及其依赖
COPY --from=deps /app/node_modules/@mermaid-js ./node_modules/@mermaid-js
COPY --from=deps /app/node_modules/mermaid ./node_modules/mermaid
COPY --from=deps /app/node_modules/puppeteer ./node_modules/puppeteer
COPY --from=deps /app/node_modules/puppeteer-core ./node_modules/puppeteer-core

# 复制 mermaid-cli 的运行时依赖
COPY --from=deps /app/node_modules/chalk ./node_modules/chalk
COPY --from=deps /app/node_modules/commander ./node_modules/commander
COPY --from=deps /app/node_modules/glob ./node_modules/glob
COPY --from=deps /app/node_modules/js-yaml ./node_modules/js-yaml
COPY --from=deps /app/node_modules/lodash ./node_modules/lodash

# 复制 mermaid 和相关图表库的依赖 (使用 RUN + cp 来处理通配符和可能不存在的包)
COPY --from=deps /app/node_modules /tmp/all_modules
RUN cd /tmp/all_modules && \
    for pkg in d3 d3-* dagre dagre-* dompurify khroma stylis dayjs elkjs cytoscape cytoscape-* uuid robust-predicates delaunator internmap; do \
    if [ -d "$pkg" ]; then cp -r "$pkg" /app/node_modules/; fi; \
    done && \
    rm -rf /tmp/all_modules

# 创建临时目录供 mermaid 渲染使用
RUN mkdir -p /tmp && chmod 1777 /tmp

# 设置权限
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
