/**
 * Simple in-memory rate limiter
 * Used to protect sensitive endpoints from brute-force attacks
 */
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
    this.max = options.max || 100; // 100 requests default
    this.message = options.message || 'Too many requests, please try again later';
    this.requests = new Map();

    // Cleanup every minute to prevent memory leaks
    this.interval = setInterval(() => this.cleanup(), 60000);
    if (this.interval.unref) this.interval.unref();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (now > data.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  middleware() {
    return (req, res, next) => {
      // Use req.ip which Express populates (requires 'trust proxy' if behind load balancer)
      const key = req.ip || 'unknown';
      const now = Date.now();

      if (!this.requests.has(key)) {
        this.requests.set(key, {
          count: 1,
          resetTime: now + this.windowMs
        });
        return next();
      }

      const data = this.requests.get(key);

      // Check if window has expired
      if (now > data.resetTime) {
        data.count = 1;
        data.resetTime = now + this.windowMs;
        this.requests.set(key, data);
        return next();
      }

      // Check if limit exceeded
      if (data.count >= this.max) {
        return res.status(429).json({
          success: false,
          error: 'Too many requests',
          message: this.message,
          retryAfter: Math.ceil((data.resetTime - now) / 1000)
        });
      }

      // Increment count
      data.count++;
      this.requests.set(key, data);
      next();
    };
  }
}

module.exports = RateLimiter;
