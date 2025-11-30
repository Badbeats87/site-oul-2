import logger from "../../config/logger.js";

/**
 * Global error handling middleware
 */
export const errorHandler = (error, req, res, next) => {
  const requestId = req.id || "unknown";

  // Log the error
  logger.error(`[${requestId}] Error: ${error.message}`, {
    status: error.status || 500,
    stack: error.stack,
  });

  // Default error response
  const status = error.status || 500;
  const message = error.message || "Internal Server Error";

  // Send error response
  res.status(status).json({
    success: false,
    error: {
      message,
      status,
      requestId,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    },
  });
};

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}
