# 多階段構建 Dockerfile
FROM node:18-alpine AS base

# 安裝依賴階段
FROM base AS deps
WORKDIR /app
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY shared/package*.json ./shared/
RUN npm ci --only=production

# 構建階段
FROM base AS builder
WORKDIR /app
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY shared/package*.json ./shared/
RUN npm ci

# 複製源代碼
COPY . .

# 構建應用
RUN npm run build:shared
RUN npm run build:backend
RUN npm run build:frontend

# 運行階段
FROM base AS runner
WORKDIR /app

# 創建非 root 用戶
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 複製必要文件
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/backend/package.json ./backend/package.json

# 設置權限
RUN chown -R nextjs:nodejs /app
USER nextjs

# 暴露端口
EXPOSE 3001

# 設置環境變量
ENV NODE_ENV=production
ENV PORT=3001

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# 啟動命令
CMD ["npm", "run", "start"]