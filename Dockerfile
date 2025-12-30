FROM node:20-alpine AS base

# 安装依赖阶段
FROM base AS deps
WORKDIR /app
COPY package*.json ./
# 跳过 Puppeteer Chrome 下载以节省空间和避免 ENOSPC 错误
# 生产环境我们将使用系统安装的 Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_SKIP_DOWNLOAD=true
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

# 复制 Next.js standalone 构建产物
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 在 runner 阶段直接安装 mermaid-cli（生产依赖）
# 这比从 deps 复制更可靠，npm 会自动处理所有依赖关系
# 在 runner 阶段全局安装 mermaid-cli 和 puppeteer
# 使用全局安装避免破坏 /app/node_modules (Next.js standalone 依赖)
ENV NPM_CONFIG_PREFIX=/usr/local
RUN npm install -g @mermaid-js/mermaid-cli puppeteer

# 确保全局安装的包可以被 require (虽然我们主要是用 CLI)
ENV NODE_PATH=/usr/local/lib/node_modules

# 设置权限
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

