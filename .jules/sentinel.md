## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.

## 2026-01-08 - Rate Limiting Missing on Sensitive Endpoints
**Vulnerability:** Authentication endpoints (`/api/auth/login` and `/api/auth/register`) lacked rate limiting, allowing unlimited brute-force attempts.
**Learning:** Default Express setups do not include rate limiting. High-value targets like login endpoints require strict application-layer limits (e.g., 5 attempts/hour) distinct from global API limits.
**Prevention:** Integrate `express-rate-limit` as standard middleware. Apply strict limits specifically to authentication routes using dedicated limiters.
