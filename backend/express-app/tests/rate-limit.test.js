
const request = require('supertest');

// Mock uuid to avoid ESM issues in Jest
jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-v4',
}));

// We need to require server AFTER mocking
const { app } = require('../server');

describe('Rate Limiting', () => {
  it('should allow requests within the limit', async () => {
    for (let i = 0; i < 3; i++) {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
    }
  });

  it('should block requests over the limit on auth endpoints', async () => {
    // We expect a strict limit of 5 per 15 mins for auth
    const limit = 5;
    for (let i = 0; i < limit; i++) {
       await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });
    }

    // The next one should fail
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' });

    // It will be 429 when implemented
    expect(response.status).toBe(429);
  }, 30000);
});
