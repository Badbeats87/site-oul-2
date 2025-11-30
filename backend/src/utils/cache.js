import NodeCache from "node-cache";

/**
 * In-memory cache for API responses
 * Reduces external API calls and improves performance
 */
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 }); // 1 hour default TTL

/**
 * Get a value from cache
 * @param {string} key - Cache key
 * @returns {any} - Cached value or undefined
 */
export function getCached(key) {
  return cache.get(key);
}

/**
 * Set a value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttl - Time to live in seconds (optional)
 * @returns {boolean} - True if set successfully
 */
export function setCached(key, value, ttl = 3600) {
  return cache.set(key, value, ttl);
}

/**
 * Delete a cache entry
 * @param {string} key - Cache key
 * @returns {number} - Number of deleted keys
 */
export function deleteCached(key) {
  return cache.del(key);
}

/**
 * Clear all cache entries
 */
export function clearCache() {
  cache.flushAll();
}

/**
 * Get cache statistics
 * @returns {Object} - Cache stats
 */
export function getCacheStats() {
  return cache.getStats();
}

/**
 * Helper to generate cache key for API calls
 * @param {string} service - Service name (e.g., 'discogs', 'ebay')
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Request parameters
 * @returns {string} - Generated cache key
 */
export function generateCacheKey(service, endpoint, params = {}) {
  const paramStr = JSON.stringify(params);
  return `${service}:${endpoint}:${Buffer.from(paramStr).toString("base64")}`;
}

/**
 * Get or set cache value (cache-aside pattern)
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch data if not in cache
 * @param {number} ttl - Time to live in seconds
 * @returns {Promise<any>} - Cached or freshly fetched value
 */
export async function getOrSet(key, fetchFn, ttl = 3600) {
  const cached = getCached(key);
  if (cached) {
    return cached;
  }

  const value = await fetchFn();
  setCached(key, value, ttl);
  return value;
}
