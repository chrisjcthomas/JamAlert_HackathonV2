/**
 * Simple in-memory rate limiter middleware.
 * NOTE: For production with multiple instances, use an external store like Redis.
 *
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Max number of requests per window
 * @param {string} options.message - Error message to send when limit reached
 */
const rateLimiter = (options) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
  const max = options.max || 100; // 100 requests default
  const message = options.message || 'Too many requests, please try again later.';

  // Independent store for this instance
  const rateLimit = new Map();

  // Clean up expired entries every 5 minutes to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimit.entries()) {
      // If the record is older than 2x the window, safe to remove
      if (now - record.startTime > windowMs * 2) {
         rateLimit.delete(ip);
      }
    }
  }, 5 * 60 * 1000);

  // Ensure the interval doesn't keep the process alive
  if (cleanupInterval.unref) cleanupInterval.unref();

  return (req, res, next) => {
    // Use req.ip or fallbacks. Note: Ensure 'trust proxy' is set if behind a proxy.
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!rateLimit.has(ip)) {
      rateLimit.set(ip, {
        count: 1,
        startTime: now
      });
      return next();
    }

    const record = rateLimit.get(ip);

    // Check if window has passed
    if (now - record.startTime > windowMs) {
      record.count = 1;
      record.startTime = now;
      return next();
    }

    // Check if limit exceeded
    if (record.count >= max) {
      res.setHeader('Retry-After', Math.ceil((record.startTime + windowMs - now) / 1000));
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: message
      });
    }

    // Increment count
    record.count++;
    next();
  };
};

module.exports = rateLimiter;
