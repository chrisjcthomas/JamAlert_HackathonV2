## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.

## 2024-05-24 - Missing Rate Limiting on Auth Endpoints
**Vulnerability:** Login and registration endpoints were exposed without rate limiting, allowing potential brute force attacks.
**Learning:** Basic security middleware (like rate limiting) must be explicitly verified, not assumed to exist. In-memory solutions can be a valid stopgap for single-instance apps without adding dependencies.
**Prevention:** Implement rate limiting middleware on all authentication routes. Use `app.set('trust proxy', 1)` when deploying behind load balancers to ensure correct IP tracking.
