const { RateLimiter } = require('../middleware/rate-limiter');

describe('RateLimiter', () => {
  let limiter;
  let req;
  let res;
  let next;

  beforeEach(() => {
    // Use short window for testing
    limiter = new RateLimiter({
      windowMs: 1000, // 1 second
      max: 2 // 2 requests
    });

    req = {
      ip: '127.0.0.1',
      headers: {},
      connection: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    next = jest.fn();
  });

  afterEach(() => {
    limiter.stop();
  });

  test('should allow requests within limit', () => {
    const middleware = limiter.middleware();

    // First request
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();

    // Second request
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should block requests exceeding limit', () => {
    const middleware = limiter.middleware();

    // 2 allowed requests
    middleware(req, res, next);
    middleware(req, res, next);

    // 3rd request should be blocked
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: 'Too many requests'
    }));
    expect(next).toHaveBeenCalledTimes(2); // Should not increase
  });

  test('should track different IPs independently', () => {
    const middleware = limiter.middleware();

    // IP 1 uses all quota
    req.ip = '1.1.1.1';
    middleware(req, res, next);
    middleware(req, res, next);

    // IP 1 blocked
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);

    // IP 2 should still be allowed
    req.ip = '2.2.2.2';
    // Reset mocks for clarity
    res.status.mockClear();

    middleware(req, res, next);
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  test('should reset after window expires', (done) => {
     const middleware = limiter.middleware();

     // Use limit
     middleware(req, res, next);
     middleware(req, res, next);

     // Blocked
     middleware(req, res, next);
     expect(res.status).toHaveBeenCalledWith(429);
     res.status.mockClear();

     // Wait for window to expire (1100ms > 1000ms)
     setTimeout(() => {
       middleware(req, res, next);
       expect(res.status).not.toHaveBeenCalled();
       done();
     }, 1100);
  });
});
