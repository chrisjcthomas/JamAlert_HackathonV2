/**
 * Simple in-memory rate limiter middleware
 *
 * @param {Object} options Configuration options
 * @param {number} options.windowMs Time window in milliseconds (default: 15 minutes)
 * @param {number} options.max Max number of connections during windowMs (default: 100)
 * @param {Object} options.message Error message to send when limit is reached
 * @returns {Function} Express middleware
 */
const rateLimit = (options = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
  const max = options.max || 100; // Limit each IP to 100 requests per windowMs
  const message = options.message || {
    success: false,
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.'
  };

  // Store request counts: Map<ip, { count: number, resetTime: number }>
  const hits = new Map();

  // Cleanup interval to prevent memory leaks
  // We run this every windowMs to clear expired entries
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of hits.entries()) {
      if (now > data.resetTime) {
        hits.delete(ip);
      }
    }
  }, windowMs);

  // Unref the interval so it doesn't prevent the process from exiting
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    // Get client IP
    // Note: server.js must enable 'trust proxy' for this to work correctly behind load balancers
    const ip = req.ip || req.socket.remoteAddress;
    const now = Date.now();

    if (!hits.has(ip)) {
      hits.set(ip, { count: 1, resetTime: now + windowMs });

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));

      return next();
    }

    const data = hits.get(ip);

    // Check if window has expired
    if (now > data.resetTime) {
      // Reset for new window
      data.count = 1;
      data.resetTime = now + windowMs;
      hits.set(ip, data);

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil(data.resetTime / 1000));

      return next();
    }

    // Check if limit exceeded
    if (data.count >= max) {
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil(data.resetTime / 1000));
      res.setHeader('Retry-After', Math.ceil((data.resetTime - now) / 1000));

      return res.status(429).json(message);
    }

    // Increment count
    data.count++;
    hits.set(ip, data); // Update reference might not be needed if object is mutated, but safe

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', max - data.count);
    res.setHeader('X-RateLimit-Reset', Math.ceil(data.resetTime / 1000));

    next();
  };
};

module.exports = rateLimit;
