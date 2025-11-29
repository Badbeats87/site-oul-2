# This Dockerfile builds the backend service
# The actual build logic is in backend/Dockerfile

FROM node:18-alpine as builder

WORKDIR /app

# Copy backend files
COPY backend/package*.json ./

# Install all dependencies (including dev for Prisma generation)
RUN npm ci

# Copy backend application files
COPY backend .

# Generate Prisma Client with explicit schema path
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate --schema=./prisma/schema.prisma

# Verify Prisma client was generated
RUN ls -la src/generated/prisma/ || echo "Warning: Prisma client not found"

# Remove dev dependencies, keep only production
RUN npm prune --production

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy generated Prisma client from builder
COPY --from=builder /app/src/generated/prisma ./src/generated/prisma

# Copy backend application files
COPY backend .

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
