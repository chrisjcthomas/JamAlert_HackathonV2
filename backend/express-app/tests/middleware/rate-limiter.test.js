const rateLimiter = require('../../middleware/rate-limiter');

describe('Rate Limiter Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn()
    };
    next = jest.fn();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should allow requests within the limit', () => {
    const limiter = rateLimiter({ windowMs: 1000, max: 2 });

    limiter(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();

    limiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('should block requests exceeding the limit', () => {
    const limiter = rateLimiter({ windowMs: 1000, max: 2 });

    // 2 allowed requests
    limiter(req, res, next);
    limiter(req, res, next);

    // 3rd request blocked
    limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: 'Too many requests'
    }));
  });

  it('should reset limit after window expires', () => {
    const limiter = rateLimiter({ windowMs: 1000, max: 1 });

    // 1st request ok
    limiter(req, res, next);

    // 2nd request blocked
    limiter(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);

    // Advance time past window
    jest.advanceTimersByTime(1100);

    // 3rd request (new window) should be ok
    res.status.mockClear();
    limiter(req, res, next);
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(2); // +1 from before
  });

  it('should use custom key generator if provided', () => {
    const keyGenerator = jest.fn().mockReturnValue('user-123');
    const limiter = rateLimiter({ windowMs: 1000, max: 1, keyGenerator });

    limiter(req, res, next);
    expect(keyGenerator).toHaveBeenCalledWith(req);
  });
});
