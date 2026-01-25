const rateLimit = require('../middleware/rate-limiter');

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
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('should allow requests under the limit', () => {
    const limiter = rateLimit({ windowMs: 1000, max: 2 });

    limiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    limiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  test('should block requests over the limit', () => {
    const limiter = rateLimit({ windowMs: 1000, max: 2 });

    limiter(req, res, next); // 1
    limiter(req, res, next); // 2
    limiter(req, res, next); // 3 (should fail)

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('Too many requests')
    }));
  });

  test('should reset limit after window expires', () => {
    const limiter = rateLimit({ windowMs: 1000, max: 1 });

    limiter(req, res, next); // 1
    expect(next).toHaveBeenCalledTimes(1);

    limiter(req, res, next); // 2 (blocked)
    expect(res.status).toHaveBeenCalledWith(429);

    // Fast forward time
    jest.advanceTimersByTime(1001);

    limiter(req, res, next); // 3 (should be allowed now)
    expect(next).toHaveBeenCalledTimes(2); // +1 from before
  });

  test('should handle multiple IPs independently', () => {
    const limiter = rateLimit({ windowMs: 1000, max: 1 });

    limiter(req, res, next); // IP 1 allowed
    expect(next).toHaveBeenCalledTimes(1);

    // Change IP
    req.ip = '192.168.1.1';

    limiter(req, res, next); // IP 2 allowed
    expect(next).toHaveBeenCalledTimes(2);
  });

  test('should cleanup old entries', () => {
    // Create limiter with very short window
    const limiter = rateLimit({ windowMs: 1000, max: 5 });

    limiter(req, res, next);
    expect(limiter._hits.size).toBe(1);

    // Advance time past the cleanup interval (60s)
    // The entry expires after 1s.
    // Cleanup runs at 60s.
    jest.advanceTimersByTime(60001);

    expect(limiter._hits.size).toBe(0);

    // Stop the interval to prevent jest open handle warnings (though fake timers usually handle this)
    if (limiter._cleanup) limiter._cleanup();
  });
});
