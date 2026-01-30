## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.

## 2026-01-30 - Insecure JWT Secret Fallback in Production
**Vulnerability:** The application was configured to fall back to a hardcoded weak secret ('your-secret-key-change-in-production') if `JWT_SECRET` was missing in production, allowing token forgery.
**Learning:** Default values intended for development must be strictly disabled in production environments. Relying on documentation or "hope" that env vars are set is insufficient.
**Prevention:** Implement startup checks that validate critical security configuration (like secrets) and fail fast (exit process) if they are missing or insecure in production.
