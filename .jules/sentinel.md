## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.

## 2024-05-24 - Hardcoded Secrets in Utility Scripts
**Vulnerability:** Hardcoded admin password found in `backend/create-admin.js`.
**Learning:** Utility and setup scripts are often overlooked during security reviews and can contain hardcoded secrets intended for "quick setup".
**Prevention:** Ensure all scripts, including setup/seed scripts, use environment variables for sensitive data. Remove any "default" hardcoded passwords even in comments.
