## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.

## 2025-05-23 - Rate Limiting on Auth Endpoints
**Vulnerability:** Authentication endpoints (`/api/auth/login`, `/api/auth/register`) lacked rate limiting, exposing the system to brute-force attacks.
**Learning:** Relying on frontend validation or obfuscation is insufficient. Public endpoints, especially authentication, must have server-side rate limits.
**Prevention:** Implemented a custom in-memory `RateLimiter` middleware to restrict requests by IP address (10 requests per 15 minutes).
