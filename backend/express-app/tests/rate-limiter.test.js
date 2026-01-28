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
    jest.useRealTimers();
  });

  test('should allow requests within limit', () => {
    const limiter = rateLimit({ windowMs: 1000, max: 2 });

    limiter(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();

    limiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  test('should block requests over limit', () => {
    const limiter = rateLimit({ windowMs: 1000, max: 1 });

    limiter(req, res, next); // 1st request - ok

    limiter(req, res, next); // 2nd request - blocked

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Too many requests'
    }));
  });

  test('should reset after window', () => {
    const limiter = rateLimit({ windowMs: 1000, max: 1 });

    limiter(req, res, next); // 1st request - ok

    // Advance time
    jest.advanceTimersByTime(1100);

    limiter(req, res, next); // 2nd request (after window) - ok

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should track different IPs separately', () => {
    const limiter = rateLimit({ windowMs: 1000, max: 1 });

    limiter(req, res, next); // IP 1 - ok

    const req2 = { ...req, ip: '192.168.1.1' };
    limiter(req2, res, next); // IP 2 - ok

    expect(next).toHaveBeenCalledTimes(2);
  });
});
