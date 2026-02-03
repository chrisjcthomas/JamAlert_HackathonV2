## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.

## 2024-05-24 - Fail-Secure JWT Secret Configuration
**Vulnerability:** The application was configured to fallback to a hardcoded 'default' JWT secret if the environment variable was missing, even in production.
**Learning:** Defaulting to a known secret allows the application to "work" but leaves it completely vulnerable to token forgery. This is a "fail-open" configuration.
**Prevention:** In production environments, critical security configuration (like secrets) must be mandatory. If missing, the application should crash (fail-secure) rather than proceed with insecure defaults.
