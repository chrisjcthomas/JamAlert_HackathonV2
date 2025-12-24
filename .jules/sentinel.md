## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.
## 2024-05-23 - Custom Rate Limiter Pattern
**Vulnerability:** Missing rate limiting on sensitive endpoints allows for brute-force attacks.
**Learning:** Adding external dependencies requires approval, so implementing a simple, in-memory rate limiter using JS Maps is a viable, lightweight pattern for Express apps that don't need distributed state (Redis).
**Prevention:** Always include rate limiting middleware on auth routes. Use 'trust proxy' when deploying behind load balancers like Vercel/Railway to ensure IP-based limiting works correctly.
