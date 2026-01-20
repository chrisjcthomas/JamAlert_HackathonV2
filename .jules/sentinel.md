## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.

## 2025-02-24 - Rate Limiting for Auth Endpoints
**Vulnerability:** Missing rate limiting on sensitive authentication endpoints (`/api/auth/login` and `/api/auth/register`) making them susceptible to brute-force attacks.
**Learning:** Implementing rate limiting with `express-rate-limit` requires careful attention to library versions. Version 7+ uses named exports (`const { rateLimit } = require('express-rate-limit')`), while older versions used default exports. A mismatch causes server crash.
**Prevention:** Always verify library documentation or changelogs when adding new dependencies. Implement specific limits for sensitive routes (e.g., 10 req/15min) rather than just global limits to balance security and usability.
