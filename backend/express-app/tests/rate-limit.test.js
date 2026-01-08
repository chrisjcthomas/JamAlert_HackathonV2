// Mock uuid before requiring other modules
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234'
}));

const request = require('supertest');
const app = require('../server');

describe('Rate Limiting', () => {

  // This test expects to fail initially because rate limiting is not implemented
  // We want to verify that we can hit the endpoint rapidly without blocking
  // Then we will implement rate limiting and update the test

  it('should block repeated requests to login endpoint', async () => {
    const agent = request(app);
    const requests = [];

    // Simulate brute force attempt (e.g., 20 requests)
    // The rate limit we plan to implement is 5 per hour/window
    for (let i = 0; i < 20; i++) {
      requests.push(
        agent
          .post('/api/auth/login')
          .send({ email: 'test@example.com', password: 'wrongpassword' })
      );
    }

    const responses = await Promise.all(requests);

    // Check if any response is 429 Too Many Requests
    const hasRateLimit = responses.some(res => res.status === 429);

    // This assertion should FAIL currently, verifying the vulnerability
    if (!hasRateLimit) {
      console.log('VULNERABILITY VERIFIED: No rate limiting detected.');
    } else {
      console.log('Rate limiting detected.');
    }

    // We expect this to be FALSE for now (vulnerable)
    // After fixing, we will expect this to be TRUE
    expect(hasRateLimit).toBe(true);
  });
});
