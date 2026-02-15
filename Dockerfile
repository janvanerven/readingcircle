# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/

# Install dependencies
RUN npm install

# Copy source code
COPY shared/ shared/
COPY server/ server/
COPY client/ client/

# Build shared, server, client
RUN npm run build -w shared && \
    npm run build -w server && \
    npm run build -w client

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./
COPY shared/package.json shared/
COPY server/package.json server/

# Install production dependencies only
RUN npm install --omit=dev

# Copy built artifacts
COPY --from=builder /app/shared/dist shared/dist
COPY --from=builder /app/server/dist server/dist
COPY --from=builder /app/client/dist client/dist

# Create data directory
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/readingcircle.db
ENV PORT=3000

EXPOSE 3000

VOLUME ["/app/data"]

CMD ["node", "server/dist/index.js"]
