const rateLimit = require('express-rate-limit');

// General API rate limiter
// 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: 'Too many requests',
    message: 'You have exceeded the request limit. Please try again later.'
  }
});

// Stricter auth rate limiter
// 10 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
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
