## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.

## 2025-05-20 - Missing Rate Limiting on Auth Endpoints
**Vulnerability:** Authentication endpoints (/api/auth/login, /api/auth/register) lacked rate limiting, exposing them to brute-force attacks.
**Learning:** Even without persistent storage, brute-force protection is essential. An in-memory rate limiter is sufficient for stateless/ephemeral backends but distributed systems need a shared store (Redis).
**Prevention:** Implement rate limiting middleware on all public-facing authentication and sensitive endpoints.
