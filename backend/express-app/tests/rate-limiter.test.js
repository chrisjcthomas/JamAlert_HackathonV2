const rateLimiter = require('../middleware/rate-limiter');

describe('Rate Limiter Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    // Mock Request
    req = {
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' }
    };

    // Mock Response
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Mock Next
    next = jest.fn();

    // Use fake timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('should allow requests within limit', () => {
    const limit = 2;
    const middleware = rateLimiter({ windowMs: 1000, max: limit });

    // 1st request
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();

    // 2nd request
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should block requests over limit', () => {
    const limit = 1;
    const middleware = rateLimiter({ windowMs: 1000, max: limit });

    // 1st request (allowed)
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    // 2nd request (blocked)
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1); // Should not have increased
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('Too many requests')
    }));
  });

  test('should reset limit after windowMs', () => {
    const limit = 1;
    const middleware = rateLimiter({ windowMs: 1000, max: limit });

    // 1st request
    middleware(req, res, next);

    // 2nd request (blocked)
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);

    // Advance time past window
    jest.advanceTimersByTime(1100);

    // 3rd request (should be allowed again)
    // We need to clear mocks to verify new calls cleanly, or just check call counts
    res.status.mockClear();
    next.mockClear();

    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should distinguish between different IPs', () => {
    const limit = 1;
    const middleware = rateLimiter({ windowMs: 1000, max: limit });

    // Request from IP 1
    req.ip = '1.1.1.1';
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    // Request from IP 2 (should be allowed despite IP 1 hitting limit)
    req.ip = '2.2.2.2';
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
  });
});
