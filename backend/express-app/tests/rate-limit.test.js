const request = require('supertest');
const express = require('express');
const { authLimiter, apiLimiter } = require('../middleware/rate-limiter');

describe('Rate Limiter Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.set('trust proxy', 1);

    // Mock endpoints
    app.post('/api/auth/login', authLimiter, (req, res) => {
      res.status(200).json({ success: true });
    });

    app.get('/api/data', apiLimiter, (req, res) => {
      res.status(200).json({ success: true });
    });
  });

  test('Auth limiter should allow requests under limit', async () => {
    // Limit is 10
    for (let i = 0; i < 5; i++) {
      const response = await request(app).post('/api/auth/login');
      expect(response.status).toBe(200);
    }
  });

  test('Auth limiter should block requests over limit', async () => {
    // Limit is 10
    // Make 11 requests
    const agent = request(app);
    for (let i = 0; i < 10; i++) {
      await agent.post('/api/auth/login');
    }

    const response = await agent.post('/api/auth/login');
    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Too many login attempts');
  });

  test('API limiter should allow requests under limit', async () => {
    // Limit is 100
    for (let i = 0; i < 10; i++) {
      const response = await request(app).get('/api/data');
      expect(response.status).toBe(200);
    }
  });
});
