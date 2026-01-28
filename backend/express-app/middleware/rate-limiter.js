/**
 * Simple in-memory rate limiter middleware
 *
 * Note: In a production environment with multiple instances,
 * use a distributed store like Redis instead of in-memory Map.
 *
 * @param {Object} options Configuration options
 * @param {number} options.windowMs Time window in milliseconds
 * @param {number} options.max Max number of requests per window
 * @param {string} options.message Error message to send
 */
const rateLimit = ({ windowMs, max, message = 'Too many requests, please try again later.' }) => {
  const requests = new Map();

  // Cleanup interval (every 1 minute) to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of requests.entries()) {
      if (now - data.startTime > windowMs) {
        requests.delete(ip);
      }
    }
  }, 60000);

  // Ensure interval doesn't prevent process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    // Get IP address (support proxy)
    // Note: ensure app.set('trust proxy', 1) is set in server.js
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!requests.has(ip)) {
      requests.set(ip, {
        count: 1,
        startTime: now
      });
      return next();
    }

    const data = requests.get(ip);

    // If window has passed, reset
    if (now - data.startTime > windowMs) {
      data.count = 1;
      data.startTime = now;
      return next();
    }

    // Increment count
    data.count++;

    // Check limit
    if (data.count > max) {
      console.warn(`[RateLimit] Blocked request from ${ip}`);
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: message
      });
    }

    next();
  };
};

module.exports = rateLimit;
