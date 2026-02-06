/**
 * Simple in-memory rate limiter middleware
 *
 * @param {Object} options Configuration options
 * @param {number} options.windowMs Time window in milliseconds
 * @param {number} options.max Max requests per window
 * @param {Object} options.message Error message to return
 * @returns {Function} Express middleware
 */
const rateLimit = (options) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // Default 15 minutes
  const max = options.max || 100; // Default 100 requests
  const message = options.message || {
    success: false,
    error: 'Too many requests, please try again later.'
  };

  // Store request counts: key=IP, value={count, startTime}
  const requests = new Map();

  // Cleanup interval to prevent memory leaks
  // Runs every minute to remove expired entries
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of requests.entries()) {
      if (now - data.startTime > windowMs) {
        requests.delete(ip);
      }
    }
  }, 60000);

  // Prevent the interval from keeping the process alive
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    // Get IP address - support proxies if configured
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!requests.has(ip)) {
      requests.set(ip, { count: 1, startTime: now });
      return next();
    }

    const data = requests.get(ip);

    // Check if window has passed
    if (now - data.startTime > windowMs) {
      // Reset for new window
      data.count = 1;
      data.startTime = now;
      return next();
    }

    // Check if limit exceeded
    if (data.count >= max) {
      return res.status(429).json(message);
    }

    // Increment count
    data.count++;
    next();
  };
};

module.exports = rateLimit;
