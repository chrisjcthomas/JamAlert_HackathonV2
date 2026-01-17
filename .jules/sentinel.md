## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.

## 2026-01-17 - Insecure Default JWT Secret
**Vulnerability:** The application defaulted to a hardcoded `JWT_SECRET` ('your-secret-key-change-in-production') even in production environments if the environment variable was missing.
**Learning:** Default values for critical secrets are dangerous "footguns". It's better to fail fast (crash) than to run insecurely.
**Prevention:** Implemented a strict check in `auth-service.js` to throw a fatal error if `NODE_ENV` is 'production' and `JWT_SECRET` is the default value.
