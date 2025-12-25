## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.

## 2025-12-25 - Authentication Brute Force Protection
**Vulnerability:** Missing rate limiting on sensitive authentication endpoints (/api/auth/login, /api/auth/register).
**Learning:** Even with an in-memory database, brute force attacks are possible. Implementing a custom in-memory rate limiter was necessary to avoid adding dependencies without approval, while ensuring 'trust proxy' was enabled for correct IP detection behind load balancers.
**Prevention:** Always apply rate limiting to public authentication endpoints and configure 'trust proxy' when deploying behind proxies like Vercel.
