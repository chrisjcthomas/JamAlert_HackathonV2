const createRateLimiter = require('../middleware/rate-limiter');

describe('Rate Limiter Middleware', () => {
  let req, res, next;
  let limiter;

  beforeEach(() => {
    req = {
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();

    // Create a new limiter for each test with small window for testing
    limiter = createRateLimiter({
      windowMs: 1000, // 1 second
      max: 2,
      message: { error: 'Too many requests' }
    });
  });

  afterEach(() => {
    // Clean up interval
    if (limiter.cleanupInterval) {
      clearInterval(limiter.cleanupInterval);
    }
  });

  test('should allow requests under the limit', () => {
    limiter(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();

    limiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  test('should block requests over the limit', () => {
    limiter(req, res, next); // 1
    limiter(req, res, next); // 2
    limiter(req, res, next); // 3 - blocked

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({ error: 'Too many requests' });
  });

  test('should reset after window expires', async () => {
    limiter(req, res, next); // 1
    limiter(req, res, next); // 2

    // Wait for window to expire (> 1000ms)
    await new Promise(resolve => setTimeout(resolve, 1100));

    limiter(req, res, next); // 1 (reset)

    expect(next).toHaveBeenCalledTimes(3);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should handle multiple IPs independently', () => {
    const req1 = { ip: '1.1.1.1', connection: {} };
    const req2 = { ip: '2.2.2.2', connection: {} };

    limiter(req1, res, next); // 1.1.1.1 count: 1
    limiter(req1, res, next); // 1.1.1.1 count: 2
    limiter(req1, res, next); // 1.1.1.1 count: 3 (blocked)

    expect(res.status).toHaveBeenCalledWith(429);

    // Reset mocks for second IP
    res.status.mockClear();
    res.json.mockClear();
    next.mockClear();

    limiter(req2, res, next); // 2.2.2.2 count: 1 (should allow)
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
