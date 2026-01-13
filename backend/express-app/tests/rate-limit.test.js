
const express = require('express');
const request = require('supertest');
const rateLimit = require('express-rate-limit');

// Mock setup if we were integrating with the real app, but for unit testing the rate limiter logic
// we can create a small app instance or import the real one.
// Since the real app starts listening on import (based on previous file read), we might need to be careful.
// Let's check if the server.js exports the app.

// Reading the server.js file again showed:
// app.listen(PORT, ...) is at the end.
// It doesn't seem to export 'app'.
// This makes testing difficult without modifying server.js to export app.

// So, for this test, I will first demonstrate that I can add the rate limiter logic to a test app
// to verify the configuration I INTEND to use, and then I will integration test the real app
// after modifying server.js to export 'app' (which is a good practice anyway).

describe('Rate Limiting Middleware', () => {
  let app;
  let server;

  beforeAll(() => {
    app = express();
    // Trust proxy is needed for rate limiter behind proxies
    app.set('trust proxy', 1);

    // Define the limiters we plan to use
    const globalLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Low limit for testing
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests, please try again later.' }
    });

    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 2, // Very low limit for testing
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many login attempts, please try again later.' }
    });

    // Apply limiters
    app.use('/api/', globalLimiter);
    app.use('/api/auth/', authLimiter);

    app.get('/api/test', (req, res) => res.json({ success: true }));
    app.post('/api/auth/login', (req, res) => res.json({ success: true }));
  });

  it('should allow requests under the limit', async () => {
    const res = await request(app).get('/api/test');
    expect(res.statusCode).toBe(200);
  });

  it('should block requests over the limit for auth', async () => {
    // Make 2 allowed requests
    await request(app).post('/api/auth/login');
    await request(app).post('/api/auth/login');

    // 3rd request should fail
    const res = await request(app).post('/api/auth/login');
    expect(res.statusCode).toBe(429);
    expect(res.body.error).toContain('Too many login attempts');
  });
});
