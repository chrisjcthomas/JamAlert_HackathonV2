## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.

## 2024-05-24 - Missing Rate Limiting on Auth Endpoints
**Vulnerability:** Authentication endpoints (/api/auth/login, /api/auth/register) were vulnerable to brute-force attacks due to lack of rate limiting.
**Learning:** In-memory applications require custom, lightweight security controls that don't introduce heavy external dependencies (like Redis) if they are not already present.
**Prevention:** Implemented a reusable in-memory RateLimiter middleware that enforces request limits per IP address and includes self-cleanup mechanisms.
