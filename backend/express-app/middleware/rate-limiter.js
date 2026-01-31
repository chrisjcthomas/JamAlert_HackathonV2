/**
 * Simple in-memory rate limiter for Express
 * Prevents brute-force attacks on sensitive endpoints
 */
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
    this.max = options.max || 10; // Limit each IP to 10 requests per windowMs default
    this.hits = new Map();

    // Cleanup interval to prevent memory leaks from old IPs
    // Runs every windowMs to clean up expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.windowMs);

    // Ensure cleanup doesn't block process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [ip, data] of this.hits.entries()) {
      if (now - data.startTime > this.windowMs) {
        this.hits.delete(ip);
      }
    }
  }

  middleware() {
    return (req, res, next) => {
      // Get IP address - handle proxies correctly if configured
      // req.ip in Express is usually sufficient if 'trust proxy' is set
      const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';

      const now = Date.now();

      if (!this.hits.has(ip)) {
        this.hits.set(ip, { count: 1, startTime: now });
        return next();
      }

      const data = this.hits.get(ip);

      // Check if window has passed
      if (now - data.startTime > this.windowMs) {
        data.count = 1;
        data.startTime = now;
        this.hits.set(ip, data);
        return next();
      }

      // Check limit
      if (data.count >= this.max) {
        console.warn(`⚠️ Rate limit exceeded for IP: ${ip}`);
        return res.status(429).json({
          success: false,
          error: 'Too many requests',
          message: 'Please try again later after 15 minutes'
        });
      }

      // Increment count
      data.count++;
      this.hits.set(ip, data);
      next();
    };
  }

  // Helper for testing
  reset() {
    this.hits.clear();
  }

  // Clean up interval for testing/shutdown
  stop() {
    clearInterval(this.cleanupInterval);
  }
}

// Create a default instance for auth routes (10 requests per 15 minutes)
const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10 // 10 requests
});

module.exports = {
  RateLimiter,
  rateLimiter: authLimiter.middleware()
};
