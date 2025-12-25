// Simple in-memory rate limiter middleware
// Prevents Brute Force and DoS attacks
const rateLimit = (options) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // Default 15 minutes
  const max = options.max || 100; // Default 100 requests per window
  const message = options.message || {
    success: false,
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.'
  };

  // Store request counts: IP -> { count, startTime }
  const hits = new Map();

  // Cleanup interval (every 1 minute) to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of hits.entries()) {
      if (now - data.startTime > windowMs) {
        hits.delete(ip);
      }
    }
  }, 60000);

  // Ensure interval doesn't block process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    // Get IP address (trust proxy is not explicitly enabled in server.js but standard req.ip is used)
    // If behind a proxy without trust proxy set, this might use the proxy IP (shared).
    // In production, we should ensure trust proxy is set if behind Vercel/Load Balancer.
    const ip = req.ip || req.connection.remoteAddress;

    const now = Date.now();

    if (!hits.has(ip)) {
      hits.set(ip, { count: 1, startTime: now });
      return next();
    }

    const data = hits.get(ip);

    // Check if window has passed
    if (now - data.startTime > windowMs) {
      // Reset window
      data.count = 1;
      data.startTime = now;
      hits.set(ip, data); // Update map
      return next();
    }

    // Increment count
    data.count++;

    if (data.count > max) {
      return res.status(429).json(message);
    }

    next();
  };
};

module.exports = rateLimit;
