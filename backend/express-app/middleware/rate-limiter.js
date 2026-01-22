/**
 * Simple in-memory rate limiter middleware
 *
 * 🛡️ Security Feature: Rate Limiting
 * Prevents brute-force attacks and Denial of Service (DoS)
 * by limiting the number of requests from a single IP address
 * within a specified time window.
 */

const rateLimiter = ({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests' }) => {
  // Store request counts per IP
  const requests = new Map();

  // Cleanup interval to remove expired entries
  // Runs every minute to prevent memory leaks
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of requests.entries()) {
      if (now > data.resetTime) {
        requests.delete(ip);
      }
    }
  }, 60 * 1000);

  // Unref the interval so it doesn't prevent the process from exiting
  if (interval.unref) interval.unref();

  return (req, res, next) => {
    // Get client IP address
    // Note: Depends on 'trust proxy' setting in Express if behind a proxy
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    let data = requests.get(ip);

    // If no data or window expired, start new window
    if (!data || now > data.resetTime) {
      data = {
        count: 0,
        resetTime: now + windowMs
      };
      requests.set(ip, data);
    }

    // Increment request count
    data.count++;

    // Check if limit exceeded
    if (data.count > max) {
      console.warn(`⚠️ Rate limit exceeded for IP: ${ip}`);

      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        message: message,
        retryAfter: Math.ceil((data.resetTime - now) / 1000)
      });
    }

    next();
  };
};

module.exports = rateLimiter;
