# Multi-stage build with slim Node for smaller image
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Copy all source files first
COPY . .

# Install dependencies (Prisma postinstall runs here with schema present)
RUN npm ci

# Build the application
RUN npm run build

# Runtime stage
FROM node:22-slim

WORKDIR /app

# Install Chromium and runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  chromium-browser \
  libnss3 \
  libxss1 \
  fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*

# Copy built app from builder - exclude node_modules to install fresh
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

# Install production dependencies only
RUN npm ci --omit=dev

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

CMD ["npm", "start"]
