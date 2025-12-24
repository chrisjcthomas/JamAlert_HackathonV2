const rateLimit = require('../middleware/rate-limiter');

describe('Rate Limiter Middleware', () => {
  let req;
  let res;
  let next;
  let now;

  beforeEach(() => {
    req = {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' }
    };
    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    now = Date.now();
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('should allow requests under the limit', () => {
    const limiter = rateLimit({ windowMs: 1000, max: 2 });

    // First request
    limiter(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 1);

    // Second request
    next.mockClear();
    limiter(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
  });

  test('should block requests over the limit', () => {
    const limiter = rateLimit({ windowMs: 1000, max: 1 });

    // First request (allowed)
    limiter(req, res, next);
    expect(next).toHaveBeenCalled();

    // Second request (blocked)
    next.mockClear();
    limiter(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Too many requests'
    }));
  });

  test('should reset after window expires', () => {
    const limiter = rateLimit({ windowMs: 1000, max: 1 });

    // First request
    limiter(req, res, next);
    expect(next).toHaveBeenCalled();

    // Advance time past window
    jest.advanceTimersByTime(1100);

    // Second request (should be allowed now)
    next.mockClear();
    limiter(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('should track different IPs separately', () => {
    const limiter = rateLimit({ windowMs: 1000, max: 1 });

    // Request from IP 1
    req.ip = '127.0.0.1';
    limiter(req, res, next);
    expect(next).toHaveBeenCalled();

    // Request from IP 2 (should be allowed despite IP 1 being maxed)
    next.mockClear();
    const req2 = { ...req, ip: '192.168.1.1' };
    limiter(req2, res, next);
    expect(next).toHaveBeenCalled();

    // Second request from IP 1 (blocked)
    next.mockClear();
    limiter(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
  });
});
