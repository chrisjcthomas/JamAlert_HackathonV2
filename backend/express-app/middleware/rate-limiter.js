// Simple in-memory rate limiter middleware
const rateLimits = new Map();

// Clean up old entries every minute
// .unref() ensures this timer doesn't prevent the process from exiting (e.g., during tests)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimits.entries()) {
    if (value.resetTime < now) {
      rateLimits.delete(key);
    }
  }
}, 60000).unref();

/**
 * Creates a rate limiter middleware
 * @param {Object} options Configuration options
 * @param {number} options.windowMs Time window in milliseconds
 * @param {number} options.max Maximum requests per window
 * @param {string} options.message Error message
 */
function rateLimiter({ windowMs, max, message }) {
  return (req, res, next) => {
    // Get IP address (trust proxy is needed for behind load balancers)
    const ip = req.ip || req.connection.remoteAddress;
    const path = req.path;
    const key = `${ip}:${path}`; // Unique key per IP and Path

    const now = Date.now();
    const record = rateLimits.get(key) || { count: 0, resetTime: now + windowMs };

    // Reset if window expired
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    record.count++;
    rateLimits.set(key, record);

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      console.warn(`Rate limit exceeded for ${ip} on ${path}`);
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: message || 'Too many requests, please try again later.'
      });
    }

    next();
  };
}

module.exports = rateLimiter;
