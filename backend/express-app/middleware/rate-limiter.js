/**
 * Simple in-memory rate limiter middleware
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} max - Max number of requests per window
 * @returns {Function} Express middleware
 */
const createRateLimiter = (windowMs, max) => {
  // Use a unique map for each limiter instance
  const requests = new Map();

  // Cleanup interval to prevent memory leaks
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of requests.entries()) {
      if (now > data.resetTime) {
        requests.delete(ip);
      }
    }
  }, windowMs);

  return (req, res, next) => {
    // req.ip works best with app.set('trust proxy', 1) if behind a proxy
    const ip = req.ip;
    const now = Date.now();

    if (!requests.has(ip)) {
      requests.set(ip, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    const data = requests.get(ip);

    if (now > data.resetTime) {
      // Window expired, reset
      data.count = 1;
      data.resetTime = now + windowMs;
      return next();
    }

    if (data.count >= max) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: 'Please try again later'
      });
    }

    data.count++;
    next();
  };
};

module.exports = createRateLimiter;
