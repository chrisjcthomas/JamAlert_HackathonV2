const request = require('supertest');
const express = require('express');
const { authLimiter, apiLimiter } = require('../middleware/rate-limiter');

describe('Rate Limiter Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Apply limiters
    app.use('/api/general', apiLimiter);
    app.use('/api/auth', authLimiter);

    // Test endpoints
    app.get('/api/general', (req, res) => res.json({ message: 'success' }));
    app.post('/api/auth/login', (req, res) => res.json({ message: 'login success' }));
  });

  test('should allow requests within limit for general API', async () => {
    const response = await request(app).get('/api/general');
    expect(response.status).toBe(200);
  });

  test('should allow requests within limit for auth API', async () => {
    const response = await request(app).post('/api/auth/login');
    expect(response.status).toBe(200);
  });

  test('should block requests exceeding limit for auth API', async () => {
    // Determine the limit from the middleware (it's 10)
    const limit = 10;

    // Consume all allowed requests
    for (let i = 0; i < limit; i++) {
      await request(app).post('/api/auth/login');
    }

    // Next request should be blocked
    const response = await request(app).post('/api/auth/login');
    expect(response.status).toBe(429);
    expect(response.body.error).toContain('Too many login attempts');
  });
});
