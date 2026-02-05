## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.

## 2026-02-05 - In-Memory Rate Limiting
**Vulnerability:** Missing rate limiting on sensitive auth endpoints.
**Learning:** For small/stateless services, a custom in-memory rate limiter can be effective without adding heavy dependencies, provided it cleans up old data.
**Prevention:** Always implement rate limiting on auth endpoints. Use `app.set('trust proxy', 1)` when behind proxies.
