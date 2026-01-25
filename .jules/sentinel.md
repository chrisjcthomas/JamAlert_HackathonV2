## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.

## 2024-05-24 - Custom In-Memory Rate Limiting
**Vulnerability:** Lack of rate limiting on authentication endpoints exposed the system to brute-force attacks.
**Learning:** Adding external dependencies (like `express-rate-limit`) can be avoided for simple use cases by implementing a lightweight in-memory middleware using `Map`.
**Prevention:** Apply the custom `rateLimit` middleware to all sensitive endpoints (login, registration, etc.) to enforce request quotas.
