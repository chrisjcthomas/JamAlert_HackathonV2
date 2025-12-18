## 2024-05-23 - Critical JWT Configuration Vulnerability
**Vulnerability:** The application was configured to fallback to a hardcoded 'weak' JWT secret in production if the environment variable `JWT_SECRET` was missing. This would allow an attacker to forge tokens if they knew the default secret (which was committed to the repo).
**Learning:** Default values for critical secrets (like JWT keys) should NEVER be used in production code paths. "Fail open" (working with insecure defaults) is dangerous.
**Prevention:** Implemented a "Fail Secure" check. The application now throws a FATAL error and crashes on startup if `NODE_ENV=production` and `JWT_SECRET` is missing. This forces the operator to configure the environment correctly.
