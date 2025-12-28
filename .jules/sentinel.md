## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.
## 2024-05-24 - Rate Limiting Implementation
**Vulnerability:** Missing rate limiting on authentication endpoints (/api/auth/login, /api/auth/register).
**Learning:** In-memory rate limiting requires careful state management (scoping) to prevent shared state bugs across different middleware instances. Also, trusting proxies is essential for correct IP detection in cloud environments like Vercel.
**Prevention:** Use a factory pattern for middleware that maintains internal state, and always configure 'trust proxy' when deploying behind a reverse proxy.
