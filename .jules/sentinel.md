## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.

## 2024-05-24 - Missing Rate Limiting on Authentication Endpoints
**Vulnerability:** Login and registration endpoints lacked rate limiting, allowing potential brute-force attacks on user credentials.
**Learning:** Frameworks like Express do not include rate limiting by default. Relying on "standard" setups often leaves these gaps. Custom in-memory limiters require careful cleanup logic (e.g., intervals) to prevent memory leaks in long-running processes.
**Prevention:** Always implement rate limiting on public endpoints, especially authentication routes. Prefer established libraries (`express-rate-limit`) but understand how to implement safe in-memory fallbacks when dependencies are constrained.
