const rateLimiter = require('../middleware/rate-limiter');

describe('Rate Limiter Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.useFakeTimers();
    req = {
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      headers: {}
    };
    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('should allow requests under the limit', () => {
    const limit = 2;
    const middleware = rateLimiter({ windowMs: 1000, max: limit });

    // Request 1
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', limit - 1);

    // Request 2
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', limit - 2);
  });

  test('should block requests over the limit', () => {
    const limit = 1;
    const middleware = rateLimiter({ windowMs: 1000, max: limit });

    // Request 1 (Allowed)
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    // Request 2 (Blocked)
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1); // Should not increase
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Too Many Requests'
    }));
  });

  test('should reset limit after window expires', () => {
    const limit = 1;
    const windowMs = 1000;
    const middleware = rateLimiter({ windowMs, max: limit });

    // Request 1 (Allowed)
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    // Request 2 (Blocked)
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);

    // Fast forward time
    jest.setSystemTime(Date.now() + windowMs + 100);

    // Request 3 (Allowed again)
    req.ip = '127.0.0.1'; // Ensure same IP
    res.status.mockClear();
    next.mockClear();

    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalledWith(429);
  });

  test('should track different IPs independently', () => {
    const limit = 1;
    const middleware = rateLimiter({ windowMs: 1000, max: limit });

    // Request 1 from IP A (Allowed)
    req.ip = '127.0.0.1';
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    // Request 1 from IP B (Allowed)
    req.ip = '192.168.1.1';
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
  });
});
