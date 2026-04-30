# 多阶段构建：后端 + 前端构建
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/

RUN npm ci --only=production && \
    cd client && npm ci

COPY . .

RUN cd client && npm run build && \
    npm cache clean --force

# 生产镜像
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/config ./config
COPY --from=builder /app/entities ./entities
COPY --from=builder /app/logger ./logger
COPY --from=builder /app/middleware ./middleware
COPY --from=builder /app/routes ./routes
COPY --from=builder /app/services ./services
COPY --from=builder /app/asset ./asset
COPY --from=builder /app/app.js ./
COPY --from=builder /app/package.json ./

RUN mkdir -p /app/logs/access /app/logs/error /app/logs/system

EXPOSE 5100

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5100/api/captcha', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "app.js"]
