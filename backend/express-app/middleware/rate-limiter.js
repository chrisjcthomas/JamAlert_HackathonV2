/**
 * Simple in-memory rate limiter middleware
 *
 * @param {Object} options Configuration options
 * @param {number} options.windowMs Time window in milliseconds
 * @param {number} options.max Max number of requests per window
 * @param {string} options.message Error message to send
 * @returns {Function} Express middleware
 */
const rateLimiter = (options) => {
  // Storage for request counts
  // Using a Map to store IP -> { count, startTime }
  const hits = new Map();

  // Configuration defaults
  const windowMs = options.windowMs || 15 * 60 * 1000; // Default: 15 minutes
  const max = options.max || 100; // Default: 100 requests
  const message = options.message || {
    success: false,
    error: 'Too many requests, please try again later.'
  };

  // Cleanup interval to prevent memory leaks (runs every minute)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of hits.entries()) {
      if (now - data.startTime > windowMs) {
        hits.delete(ip);
      }
    }
  }, 60 * 1000);

  // Ensure interval doesn't block process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    // Get client IP
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!hits.has(ip)) {
      hits.set(ip, { count: 1, startTime: now });
    } else {
      const data = hits.get(ip);

      // Check if window has expired
      if (now - data.startTime > windowMs) {
        // Reset window
        data.count = 1;
        data.startTime = now;
      } else {
        // Increment count
        data.count++;

        // Check limit
        if (data.count > max) {
          console.warn(`Rate limit exceeded for IP: ${ip}`);
          return res.status(429).json(message);
        }
      }
    }

    next();
  };
};

module.exports = rateLimiter;
