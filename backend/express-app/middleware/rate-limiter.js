const rateLimit = require('express-rate-limit');

// Rate limiting middleware for general API routes
// Limit to 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: 'Too many requests',
    message: 'You have exceeded the request limit. Please try again later.'
  }
});

// Stricter rate limiting for authentication routes (login/register)
// Limit to 10 requests per 15 minutes to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts',
    message: 'Please try again after 15 minutes.'
  }
});

module.exports = {
  apiLimiter,
  authLimiter
};
