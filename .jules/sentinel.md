## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.

## 2024-05-24 - Insecure JWT Secret Fallback
**Vulnerability:** The `JWT_SECRET` in `backend/express-app/auth-service.js` fell back to a hardcoded string ('your-secret-key-change-in-production') if the environment variable was missing, even in production.
**Learning:** Silent fallbacks for security-critical configuration allow deployments to run insecurely without warning.
**Prevention:** Strictly validate all security configuration at startup. In production, the application should crash immediately if secrets are missing, rather than using defaults.
