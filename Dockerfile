# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

# Install all dependencies (including dev for Prisma generation)
RUN npm ci

# Copy backend source code and frontend assets
COPY backend/src ./src
COPY backend/prisma ./prisma
COPY backend/config ./config
COPY backend/pages ./pages
COPY backend/js ./js
COPY backend/styles ./styles

# Generate Prisma Client
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# Remove dev dependencies, keep only production
RUN npm prune --production

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy backend source code from builder
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/config ./config

# Copy generated Prisma client from builder
COPY --from=builder /app/src/generated/prisma ./src/generated/prisma

# Copy frontend assets from builder
COPY --from=builder /app/pages ./pages
COPY --from=builder /app/js ./js
COPY --from=builder /app/styles ./styles

# Copy package.json
COPY backend/package.json ./

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create logs directory
RUN mkdir -p logs && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start server
CMD ["npm", "start"]
