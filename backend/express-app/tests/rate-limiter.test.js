const rateLimiter = require('../middleware/rate-limiter');

describe('Rate Limiter Middleware', () => {
  let req, res, next;

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
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('should allow requests under the limit', () => {
    const limiter = rateLimiter({ max: 2, windowMs: 1000 });

    limiter(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();

    limiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  test('should block requests over the limit', () => {
    const limiter = rateLimiter({ max: 2, windowMs: 1000 });

    limiter(req, res, next);
    limiter(req, res, next);

    // Third request should be blocked
    limiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Too many requests'
    }));
    expect(next).toHaveBeenCalledTimes(2); // Only called for valid requests
  });

  test('should reset after window expires', () => {
    const limiter = rateLimiter({ max: 1, windowMs: 1000 });

    limiter(req, res, next);
    expect(next).toHaveBeenCalled();

    // Blocked
    limiter(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);

    // Fast forward time
    jest.setSystemTime(Date.now() + 1100);

    // Should be allowed again
    next.mockClear();
    res.status.mockClear();

    limiter(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should handle multiple IPs independently', () => {
    const limiter = rateLimiter({ max: 1, windowMs: 1000 });

    limiter(req, res, next); // IP 127.0.0.1
    expect(next).toHaveBeenCalled();

    // Change IP
    const req2 = { ...req, ip: '192.168.1.1' };
    const next2 = jest.fn();
    const res2 = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    limiter(req2, res2, next2); // IP 192.168.1.1
    expect(next2).toHaveBeenCalled();
  });
});
