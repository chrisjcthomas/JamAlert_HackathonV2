## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.

## 2024-05-24 - Custom Rate Limiting Pattern
**Vulnerability:** Missing rate limiting on sensitive authentication endpoints allowed for potential brute-force attacks.
**Learning:** Adding external dependencies for simple security controls isn't always necessary or permitted. A simple in-memory fixed window counter can effectively mitigate brute-force risks for single-instance applications.
**Prevention:** Use the custom `middleware/rate-limiter.js` pattern for any new sensitive endpoints (e.g., password reset, 2FA verification) to enforce rate limits without adding dependencies.
