/**
 * Simple in-memory rate limiter middleware
 */
const createRateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
  const max = options.max || 100; // Limit each IP to 100 requests per windowMs
  const message = options.message || {
    success: false,
    error: 'Too many requests, please try again later.'
  };
  const statusCode = options.statusCode || 429;

  // Store request counts: key=ip, value={ count, resetTime }
  const hits = new Map();

  // Cleanup interval to remove expired entries (run every minute)
  // Store it on the function instance so it can be cleared in tests
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of hits.entries()) {
      if (now > data.resetTime) {
        hits.delete(ip);
      }
    }
  }, 60 * 1000);

  // Unref the interval so it doesn't prevent the process from exiting
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  const middleware = (req, res, next) => {
    try {
      // Get IP address
      // In Express with 'trust proxy', req.ip is the client IP
      const ip = req.ip || req.connection.remoteAddress || 'unknown';

      const now = Date.now();

      if (!hits.has(ip)) {
        hits.set(ip, {
          count: 1,
          resetTime: now + windowMs
        });
        return next();
      }

      const data = hits.get(ip);

      if (now > data.resetTime) {
        // Window expired, reset
        data.count = 1;
        data.resetTime = now + windowMs;
        hits.set(ip, data);
        return next();
      }

      data.count++;
      hits.set(ip, data);

      if (data.count > max) {
        return res.status(statusCode).json(message);
      }

      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      next(); // Fail open to avoid blocking legitimate traffic on error
    }
  };

  // Expose storage and cleanup for testing
  middleware.storage = hits;
  middleware.cleanupInterval = cleanupInterval;

  return middleware;
};

module.exports = createRateLimiter;
