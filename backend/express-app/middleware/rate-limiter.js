const rateLimit = require('express-rate-limit');

// Rate limit for authentication routes (stricter)
// Limit: 10 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: 'Too many login attempts, please try again after 15 minutes',
    message: 'Security protection activated'
  }
});

// Rate limit for general API routes
// Limit: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    message: 'Rate limit exceeded'
  }
});

module.exports = {
  authLimiter,
  apiLimiter
};
