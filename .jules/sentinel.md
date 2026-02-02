## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.

## 2024-05-24 - Missing Rate Limiting on Auth Endpoints
**Vulnerability:** Brute-force attacks were possible on `/api/auth/login` and `/api/auth/register` due to missing rate limiting.
**Learning:** Backend services deployed behind proxies (Vercel/Railway) require `app.set('trust proxy', 1)` for accurate IP-based rate limiting.
**Prevention:** Applied a custom in-memory `RateLimiter` middleware to sensitive endpoints. Future endpoints should use this shared middleware.
