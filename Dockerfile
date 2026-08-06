# Build stage
FROM node:22-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma/ ./prisma/
COPY prisma.config.ts ./

RUN npm ci

COPY . .
RUN npm run build

# Runtime stage - Node 22 slim with Chromium support
FROM node:22-slim

WORKDIR /app

# Install runtime dependencies for Chromium and fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
  chromium \
  chromium-common \
  libnss3 \
  libxss1 \
  fonts-noto-cjk \
  && rm -rf /var/lib/apt/lists/*

# Copy built app from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.env ./.env

EXPOSE 3000

# Set environment variables for Railway
ENV NODE_ENV=production
ENV PORT=3000
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

CMD ["npm", "start"]
