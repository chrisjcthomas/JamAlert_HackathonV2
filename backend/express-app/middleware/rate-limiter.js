const rateLimit = require('express-rate-limit');

// Rate limiter for authentication routes (login/register)
// Stricter limits to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Limit each IP to 10 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: 'Too many login attempts',
    message: 'Please try again after 15 minutes'
  }
});

// General API rate limiter
// More generous limits for normal API usage
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Please try again later'
  }
});

module.exports = {
  authLimiter,
  apiLimiter
};
