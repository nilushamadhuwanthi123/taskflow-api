# ---- Builder stage ----------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY src ./src

# ---- Production stage --------------------------------------------------
FROM node:20-alpine AS production

ENV NODE_ENV=production
ENV PORT=5000

WORKDIR /app

# Run as a non-root user rather than the default root
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY package.json ./

USER nodeuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 5000) + '/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

CMD ["node", "src/server.js"]
