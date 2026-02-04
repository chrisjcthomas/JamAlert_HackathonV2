/**
 * Custom Rate Limiter Middleware
 *
 * Creates an in-memory rate limiter to protect sensitive endpoints
 * from brute-force and DoS attacks.
 *
 * Note: This uses in-memory storage, which resets on server restart.
 * For a distributed environment (multiple server instances), use Redis.
 */
const rateLimit = (options) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
  const max = options.max || 100; // 100 requests default
  const message = options.message || {
    success: false,
    error: 'Too many requests, please try again later.'
  };

  // Store request counts: key = IP, value = { count, startTime }
  const requests = new Map();

  // Cleanup interval to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requests.entries()) {
      if (now - data.startTime > windowMs) {
        requests.delete(key);
      }
    }
  }, windowMs);

  // Unref the interval so it doesn't prevent the process from exiting
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    // Use IP as key. Ensure 'trust proxy' is set in app if behind a proxy.
    const key = req.ip;
    const now = Date.now();

    if (!requests.has(key)) {
      requests.set(key, {
        count: 1,
        startTime: now
      });
      return next();
    }

    const data = requests.get(key);

    // Check if window has expired for this user
    if (now - data.startTime > windowMs) {
      // Reset window
      data.count = 1;
      data.startTime = now;
      return next();
    }

    // Check limit
    if (data.count >= max) {
      return res.status(429).json(message);
    }

    // Increment count
    data.count++;
    next();
  };
};

module.exports = rateLimit;
