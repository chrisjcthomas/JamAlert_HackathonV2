## 2026-01-11 - Express Rate Limiting Implementation
**Vulnerability:** Missing rate limiting on API endpoints allowed for potential Brute Force and Denial of Service (DoS) attacks.
**Learning:** Modern hosting environments (like Vercel) often use proxies, requiring explicit `app.set('trust proxy', 1)` configuration for rate limiting to correctly identify client IP addresses instead of the load balancer's IP.
**Prevention:** Always implement rate limiting middleware (like `express-rate-limit`) on all public API routes, with stricter limits on sensitive endpoints (authentication). Ensure middleware order is correct (Rate Limiter -> Body Parser) to prevent resource exhaustion from large payloads on blocked requests.
