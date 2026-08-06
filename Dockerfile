# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev

COPY package*.json ./
COPY prisma/ ./prisma/
COPY prisma.config.ts ./

RUN npm ci

COPY . .
RUN npm run build

# Runtime stage - Node 22 with Puppeteer support
FROM node:22-alpine

WORKDIR /app

# Install Puppeteer system dependencies
RUN apk add --no-cache \
  chromium \
  font-noto-cjk

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
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

CMD ["npm", "start"]
