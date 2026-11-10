# Stage 1: Build Frontend and Server
FROM node:20-slim AS builder

WORKDIR /app

# Install build tools for native addons (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-slim AS runner

WORKDIR /app

# Install runtime utilities for healthcheck and native addon compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=4838
ENV DATA_DIR=/app/data

COPY package.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy compiled artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Create storage directory for uploads and SQLite database
RUN mkdir -p /app/data/uploads

EXPOSE 4838

VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4838/api/health || exit 1

CMD ["node", "dist/server/index.js"]
