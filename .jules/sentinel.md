## 2024-05-23 - Hardcoded Credentials in Auth Service
**Vulnerability:** Hardcoded admin credentials ('admin123') were found in `backend/express-app/auth-service.js` which were initialized on every server start.
**Learning:** Even "in-memory" or "development" databases can pose a critical risk if the code path to create default users exists in production builds. Code comments claiming "for development" are not security controls.
**Prevention:** Use environment variables for all credentials. Implement logic to check `NODE_ENV` and strictly disable default credential creation in production environments.

## 2024-05-24 - Missing Rate Limiting on API Endpoints
**Vulnerability:** The Express backend lacked rate limiting on authentication and API endpoints, exposing the application to brute-force attacks and Denial of Service (DoS) risks.
**Learning:** `express-rate-limit` requires `app.set('trust proxy', 1)` when running behind a reverse proxy (like Vercel or Railway). Without this, all requests appear to come from the same proxy IP, causing legitimate users to be blocked after a few requests.
**Prevention:** Always configure rate limiting with proxy awareness (`trust proxy`) when deploying to cloud platforms. Use strict limits for auth endpoints (e.g., 10/15min) and broader limits for general API endpoints.
