/**
 * Simple in-memory rate limiter middleware
 *
 * @param {Object} options Configuration options
 * @param {number} options.windowMs Time window in milliseconds (default: 15 minutes)
 * @param {number} options.max Max number of requests per window (default: 100)
 * @param {Object} options.message Error message to return (default: { error: 'Too many requests...' })
 * @returns {Function} Express middleware
 */
const rateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
  const max = options.max || 100; // limit each IP to 100 requests per windowMs
  const message = options.message || {
    success: false,
    error: 'Too many requests, please try again later.'
  };

  // Store request timestamps mapped by IP
  // Map<string, number[]>
  const hits = new Map();

  // Cleanup interval to prevent memory leaks (runs every 10 minutes)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of hits.entries()) {
      const recent = timestamps.filter(time => time > now - windowMs);
      if (recent.length === 0) {
        hits.delete(ip);
      } else {
        hits.set(ip, recent);
      }
    }
  }, 10 * 60 * 1000);

  // Ensure interval doesn't block process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();

    if (!hits.has(ip)) {
      hits.set(ip, []);
    }

    const timestamps = hits.get(ip);

    // Filter out requests older than the window
    // Optimization: We could just check timestamps[0] but filtering ensures accuracy
    const recentTimestamps = timestamps.filter(time => time > now - windowMs);

    if (recentTimestamps.length >= max) {
      // Don't add blocked request to history, or do we?
      // Usually standard is not to count blocked requests against the limit expiration,
      // but some do. Let's keep it simple: just block.
      return res.status(429).json(message);
    }

    recentTimestamps.push(now);
    hits.set(ip, recentTimestamps);

    next();
  };
};

module.exports = rateLimiter;
