## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.

## 2026-01-24 - Missing Rate Limiting on Authentication Endpoints
**Vulnerability:** The `/api/auth/login` and `/api/auth/register` endpoints had no rate limiting, allowing for unlimited brute-force attempts against user accounts.
**Learning:** Middleware descriptions in documentation or comments do not guarantee existence in code. A check of `server.js` revealed the rate limiter was completely missing despite expectations.
**Prevention:** Implement rate limiting middleware (Token Bucket or Fixed Window) on all public-facing sensitive endpoints. Verify presence with integration tests that simulate high-volume traffic.
