const request = require('supertest');
const rateLimit = require('express-rate-limit');
const express = require('express');

// Mock auth-service to avoid ESM issues and focus on rate limiting logic
jest.mock('../auth-service', () => ({
  userLogin: jest.fn().mockResolvedValue({ success: true, data: { token: 'mock-token' } }),
  adminLogin: jest.fn().mockResolvedValue({ success: false }),
  registerUser: jest.fn().mockResolvedValue({ success: true }),
  verifyToken: jest.fn().mockReturnValue({ success: true, data: { id: '1', role: 'user' } }),
}));

// We need to load the server, but server.js starts the listener.
// A common pattern is to separate app definition from listening, but we can't easily change that without refactoring.
// Instead, we'll try to use a test implementation that mimics the server setup OR just trust that rate-limit works if we test the middleware in isolation.
// Testing the middleware in isolation is safer and doesn't require spinning up the full app.

const { globalLimiter, authLimiter } = require('../middleware/rate-limiter');

describe('Rate Limiter Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.set('trust proxy', 1); // Important for rate limit
  });

  test('Global limiter should allow requests under limit', async () => {
    app.use(globalLimiter);
    app.get('/', (req, res) => res.status(200).send('OK'));

    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    // Rate limit headers should be present
    expect(res.headers['ratelimit-limit']).toBeDefined();
  });

  test('Auth limiter should be stricter', async () => {
    app.post('/login', authLimiter, (req, res) => res.status(200).send('OK'));

    // Make 5 requests (allowed)
    for (let i = 0; i < 5; i++) {
        await request(app).post('/login').expect(200);
    }

    // 6th request should fail
    const res = await request(app).post('/login');
    expect(res.status).toBe(429);
    expect(res.body.error).toBe('Too many login attempts');
  });
});
