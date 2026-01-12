## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.

## 2024-05-24 - Rate Limiting Placement
**Vulnerability:** Missing rate limiting on authentication endpoints allowed for brute-force attacks.
**Learning:** Rate limiting middleware must be placed *before* body parsing middleware (`express.json`, `express.urlencoded`). If placed after, an attacker can still cause Denial of Service (DoS) by sending large payloads that the server spends resources parsing before blocking the request.
**Prevention:** Always verify middleware order in Express applications. Place security middleware (Helmet, Rate Limit, CORS) at the very top of the stack.
