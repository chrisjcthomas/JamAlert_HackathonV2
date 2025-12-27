const rateLimit = require('express-rate-limit');

// Rate limiter for authentication endpoints
// Limits each IP to 10 attempts per 15 minutes
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per `window`
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: 'Too many login attempts, please try again after 15 minutes'
  }
});

module.exports = authRateLimiter;
