/**
 * Creates a rate limiter middleware.
 * Each instance maintains its own storage map.
 *
 * @param {Object} options Configuration options
 * @param {number} options.windowMs Time window in milliseconds (default: 15 minutes)
 * @param {number} options.max Max number of requests per window (default: 100)
 * @param {string} options.message Error message to return
 * @returns {Function} Express middleware
 */
const rateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const max = options.max || 100;
  const message = options.message || 'Too many requests, please try again later.';

  // Independent storage for this limiter instance
  const store = new Map();

  // Clean up expired entries periodically
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, data] of store.entries()) {
      if (now > data.resetTime) {
        store.delete(key);
      }
    }
  }, 60 * 1000); // Check every minute

  // Ensure interval doesn't block process exit
  if (cleanupInterval.unref) cleanupInterval.unref();

  return (req, res, next) => {
    // Use req.ip which handles proxy if 'trust proxy' is set
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    let data = store.get(key);

    // If no entry or window expired, create new window
    if (!data || now > data.resetTime) {
      data = {
        count: 0,
        resetTime: now + windowMs
      };
      store.set(key, data);
    }

    // Increment request count
    data.count++;

    // Set standard rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - data.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(data.resetTime / 1000));

    // Check limit
    if (data.count > max) {
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: message
      });
    }

    next();
  };
};

module.exports = rateLimiter;
