## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.

## 2025-02-18 - Rate Limiting without Dependencies
**Vulnerability:** Missing rate limiting on sensitive auth endpoints exposed the app to brute-force attacks.
**Learning:** In constrained environments where adding new dependencies (like `express-rate-limit`) is restricted, a custom in-memory middleware using `Map` and `setInterval` cleanup is a viable, lightweight alternative.
**Prevention:** Always implement rate limiting on `/login` and `/register`. Use `trust proxy` configuration when deploying behind load balancers.
