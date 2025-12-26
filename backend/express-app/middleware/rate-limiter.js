/**
 * Simple in-memory rate limiter middleware
 * Stores request counts in a Map
 *
 * @param {Object} options Configuration options
 * @param {number} options.windowMs Time window in milliseconds
 * @param {number} options.max Max number of requests within windowMs
 * @param {string} [options.message] Error message to return
 * @param {Function} [options.keyGenerator] Function to generate key (defaults to IP)
 * @returns {Function} Express middleware
 */
const rateLimiter = ({ windowMs, max, message, keyGenerator }) => {
  // Store for IP requests: Map<key, { count, resetTime }>
  const requests = new Map();

  // Cleanup interval to prevent memory leaks (runs every 10 minutes)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requests.entries()) {
      if (now > data.resetTime) {
        requests.delete(key);
      }
    }
  }, 10 * 60 * 1000);

  // Ensure interval doesn't block process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    // Get client identifier (IP by default)
    const key = keyGenerator ? keyGenerator(req) : (req.ip || req.connection.remoteAddress);
    const now = Date.now();

    // Get or create record
    let record = requests.get(key);

    // If no record or expired, reset
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs
      };
      requests.set(key, record);
    }

    // Increment count
    record.count++;

    // Check limit
    if (record.count > max) {
      // Calculate retry after seconds
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);

      // Set Retry-After header
      res.setHeader('Retry-After', retryAfter);

      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: message || `Too many requests, please try again after ${retryAfter} seconds`
      });
    }

    next();
  };
};

module.exports = rateLimiter;
