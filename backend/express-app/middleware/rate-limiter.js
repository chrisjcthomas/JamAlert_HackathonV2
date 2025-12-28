/**
 * Simple in-memory rate limiter middleware
 * Stores request timestamps mapped by IP address
 */
const rateLimiter = (options) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // Default: 15 minutes
  const max = options.max || 100; // Default: 100 requests per window
  const message = options.message || 'Too many requests, please try again later.';

  // Storage for this specific limiter instance
  // Key: IP Address, Value: Array of timestamps
  const rateLimit = new Map();

  // Cleanup function to remove old entries from memory
  // Runs every 1 hour or 2 * windowMs, whichever is larger, to be safe
  const cleanupInterval = Math.max(windowMs * 2, 3600000);

  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, requests] of rateLimit.entries()) {
      // Remove requests older than the window
      const validRequests = requests.filter(time => time > now - windowMs);

      if (validRequests.length === 0) {
        rateLimit.delete(ip);
      } else if (validRequests.length < requests.length) {
        // Update with only valid requests if we changed anything
        rateLimit.set(ip, validRequests);
      }
    }
  }, cleanupInterval);

  // Ensure the timer doesn't block the process from exiting
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req, res, next) => {
    // Get client IP address
    // Trust proxy is needed if behind a reverse proxy (e.g. Vercel, Heroku)
    // Make sure app.set('trust proxy', 1) is set in server.js
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!rateLimit.has(ip)) {
      rateLimit.set(ip, []);
    }

    const requests = rateLimit.get(ip);

    // Filter out requests that are older than the window
    const recentRequests = requests.filter(time => time > now - windowMs);

    // Update the record
    rateLimit.set(ip, recentRequests);

    if (recentRequests.length >= max) {
      console.warn(`Rate limit exceeded for IP: ${ip}`);
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: message
      });
    }

    // Add current request timestamp
    recentRequests.push(now);
    next();
  };
};

module.exports = rateLimiter;
