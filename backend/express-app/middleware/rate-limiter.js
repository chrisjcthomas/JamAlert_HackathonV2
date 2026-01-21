/**
 * Simple in-memory rate limiter middleware
 *
 * NOTE: This is a basic implementation for a single-instance deployment.
 * For distributed deployments, use a centralized store like Redis.
 */
class RateLimiter {
  constructor(windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests, please try again later.') {
    this.windowMs = windowMs;
    this.max = max;
    this.message = message;
    this.hits = new Map();

    // Clean up expired entries periodically
    setInterval(() => this.cleanup(), 60 * 1000); // Run every minute
  }

  middleware() {
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      const now = Date.now();

      if (!this.hits.has(ip)) {
        this.hits.set(ip, []);
      }

      const timestamps = this.hits.get(ip);

      // Filter out timestamps older than the window
      const windowStart = now - this.windowMs;
      const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);

      if (validTimestamps.length >= this.max) {
        // Update with valid timestamps to prevent memory leak if we just return
        this.hits.set(ip, validTimestamps);

        console.warn(`[Security] Rate limit exceeded for IP: ${ip}`);
        return res.status(429).json({
          success: false,
          error: 'Too many requests',
          message: this.message
        });
      }

      validTimestamps.push(now);
      this.hits.set(ip, validTimestamps);

      next();
    };
  }

  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [ip, timestamps] of this.hits.entries()) {
      const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
      if (validTimestamps.length === 0) {
        this.hits.delete(ip);
      } else {
        this.hits.set(ip, validTimestamps);
      }
    }
  }
}

module.exports = RateLimiter;
