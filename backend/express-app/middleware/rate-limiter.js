/**
 * Simple in-memory rate limiter middleware
 * Stores request counts in a Map
 *
 * SECURITY: Used to prevent brute-force attacks on sensitive endpoints
 */
const rateLimit = (options = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
  const max = options.max || 100; // Limit each IP to 100 requests per windowMs
  const message = options.message || {
    success: false,
    error: 'Too many requests, please try again later.'
  };

  // Storage for request counts
  // Key: IP address
  // Value: { count: number, resetTime: number }
  const hits = new Map();

  // Cleanup interval to remove old entries and prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of hits.entries()) {
      // If the window has passed, the entry is stale and can be removed
      // (Next request from this IP will create a new entry)
      if (now > data.resetTime) {
        hits.delete(ip);
      }
    }
  }, 60000); // Run cleanup every minute

  // Unref to allow process to exit if this is the only thing keeping it alive (useful for tests)
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  const middleware = (req, res, next) => {
    // Get client IP
    // Trust proxy 1 is set in server.js, so req.ip should be correct behind Vercel
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!hits.has(ip)) {
      hits.set(ip, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    const data = hits.get(ip);

    // Check if window has expired
    if (now > data.resetTime) {
      // Reset window
      hits.set(ip, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    // Check if limit exceeded
    if (data.count >= max) {
      return res.status(429).json(message);
    }

    // Increment count
    data.count++;
    hits.set(ip, data); // Map values are references, but setting it again is explicit
    next();
  };

  // Expose storage for testing
  middleware._hits = hits;
  middleware._cleanup = () => clearInterval(cleanupInterval);

  return middleware;
};

module.exports = rateLimit;
