import rateLimit from "express-rate-limit";

/**
 * Rate limiting middleware for external API integrations
 * These are more restrictive than auth endpoints since they call external APIs
 */

// Discogs has a rate limit of 60 requests per minute for authenticated requests
// We'll use a more conservative limit to avoid hitting their rate limit
export const discogsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per user
  message: "Too many Discogs requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting if using cached data
    // Could be enhanced to check cache headers
    return false;
  },
});

// eBay has higher rate limits, but we'll be conservative
export const ebayLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 requests per minute per user
  message: "Too many eBay requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Global integration rate limiting
// Across all integrations, users can make at most 100 requests per minute
export const integrationsGlobalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per user
  message: "Too many integration requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});
