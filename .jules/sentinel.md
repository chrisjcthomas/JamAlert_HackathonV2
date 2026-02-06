## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.

## 2024-05-24 - Missing Rate Limiting on Auth Endpoints
**Vulnerability:** The login and register endpoints were exposed without rate limiting, allowing for brute-force attacks.
**Learning:** Documentation or memory (e.g., claiming a middleware exists) can drift from the actual codebase. Always verify the existence of security controls by inspecting the file system.
**Prevention:** Implement rate limiting middleware on all authentication endpoints. Automate checks or tests to verify that sensitive endpoints return 429 when flooded.
