import { PrismaClient } from "../../src/generated/prisma/index.js";
import logger from "../../config/logger.js";

if (!process.env.DATABASE_URL) {
  logger.warn("DATABASE_URL environment variable is not set");
}

const prisma = new PrismaClient({
  log: [
    { level: "error", emit: "stdout" },
    { level: "warn", emit: "stdout" },
  ],
});

// Log queries in development
if (process.env.NODE_ENV === "development") {
  prisma.$use(async (params, next) => {
    const before = Date.now();
    const result = await next(params);
    const after = Date.now();

    logger.debug(`[${params.model}.${params.action}] ${after - before}ms`, {
      model: params.model,
      action: params.action,
      duration: after - before,
    });

    return result;
  });
}

// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

// Handle termination signals
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, closing database connection");
  await prisma.$disconnect();
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, closing database connection");
  await prisma.$disconnect();
});

export default prisma;
