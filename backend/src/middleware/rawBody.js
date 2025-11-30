import logger from "../../config/logger.js";

/**
 * Middleware to capture raw body for webhook signature verification
 * Must be used before json() middleware
 */
export function captureRawBody(req, res, next) {
  const chunks = [];

  req.on("data", (chunk) => {
    chunks.push(chunk);
  });

  req.on("end", () => {
    try {
      const rawBody = Buffer.concat(chunks).toString("utf8");
      req.rawBody = rawBody;

      // Re-parse as JSON for the rest of the middleware
      if (rawBody) {
        try {
          req.body = JSON.parse(rawBody);
        } catch (error) {
          logger.debug("Failed to parse request body as JSON", {
            error: error.message,
          });
          req.body = {};
        }
      } else {
        req.body = {};
      }

      next();
    } catch (error) {
      logger.error("Error capturing raw body", {
        error: error.message,
      });
      next(error);
    }
  });

  req.on("error", (error) => {
    logger.error("Error reading request stream", {
      error: error.message,
    });
    next(error);
  });
}

export default captureRawBody;
