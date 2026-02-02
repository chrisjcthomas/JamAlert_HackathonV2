const RateLimiter = require('../middleware/rate-limiter');

describe('RateLimiter Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { ip: '127.0.0.1' };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should allow requests under the limit', () => {
    const limiter = new RateLimiter({ max: 2, windowMs: 1000 });
    const middleware = limiter.middleware();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();

    next.mockClear();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();

    clearInterval(limiter.interval);
  });

  test('should block requests over the limit', () => {
    const limiter = new RateLimiter({ max: 1, windowMs: 1000 });
    const middleware = limiter.middleware();

    middleware(req, res, next); // 1st request - ok
    expect(next).toHaveBeenCalled();

    next.mockClear();
    middleware(req, res, next); // 2nd request - blocked
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Too many requests'
    }));

    clearInterval(limiter.interval);
  });

  test('should reset after window expires', () => {
    const limiter = new RateLimiter({ max: 1, windowMs: 1000 });
    const middleware = limiter.middleware();

    middleware(req, res, next); // 1st - ok
    expect(next).toHaveBeenCalled();

    next.mockClear();
    middleware(req, res, next); // 2nd - blocked
    expect(res.status).toHaveBeenCalledWith(429);

    // Fast forward time
    jest.advanceTimersByTime(1001);

    res.status.mockClear();
    next.mockClear();

    middleware(req, res, next); // 3rd (after window) - ok
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();

    clearInterval(limiter.interval);
  });

  test('should handle different IPs independently', () => {
    const limiter = new RateLimiter({ max: 1, windowMs: 1000 });
    const middleware = limiter.middleware();

    req.ip = '1.1.1.1';
    middleware(req, res, next); // User 1 - ok
    expect(next).toHaveBeenCalled();

    req.ip = '2.2.2.2';
    next.mockClear();
    middleware(req, res, next); // User 2 - ok
    expect(next).toHaveBeenCalled();

    req.ip = '1.1.1.1';
    next.mockClear();
    middleware(req, res, next); // User 1 again - blocked
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);

    clearInterval(limiter.interval);
  });
});
