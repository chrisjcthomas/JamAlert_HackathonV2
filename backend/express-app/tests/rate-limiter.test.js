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
      json: jest.fn(),
      setHeader: jest.fn()
    };
    next = jest.fn();

    // We need to use a unique IP for each test or mocking Date.now()
    // because the rateLimiter module uses a global Map (singleton-ish module state)
    // Actually, checking the code: const rateLimit = new Map(); is at module level.
    // So state persists across tests!
    // We should probably randomize IP per test case or modify the middleware to accept a store/map.
    // Or just use random IPs.
    req.ip = `192.168.1.${Math.floor(Math.random() * 255)}`;
  });

  test('should allow requests within limit', () => {
    const limit = 2;
    const limiter = rateLimiter({ max: limit, windowMs: 1000 });

    limiter(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();

    limiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  test('should block requests over limit', () => {
    const limit = 1;
    const limiter = rateLimiter({ max: limit, windowMs: 1000 });

    limiter(req, res, next); // 1st request - allowed
    expect(next).toHaveBeenCalled();

    limiter(req, res, next); // 2nd request - blocked
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Too many requests'
    }));
  });

  test('should reset after windowMs', async () => {
    const limit = 1;
    const windowMs = 100;
    const limiter = rateLimiter({ max: limit, windowMs: windowMs });

    limiter(req, res, next); // 1st - allowed
    limiter(req, res, next); // 2nd - blocked

    // Wait for window to pass
    await new Promise(resolve => setTimeout(resolve, windowMs + 50));

    // Should be allowed again
    next.mockClear();
    res.status.mockClear();

    limiter(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should track different IPs separately', () => {
    const limit = 1;
    const limiter = rateLimiter({ max: limit, windowMs: 1000 });

    req.ip = '10.0.0.1';
    limiter(req, res, next); // Allowed

    // Mock new request object for second IP
    const req2 = { ...req, ip: '10.0.0.2' };
    const next2 = jest.fn();

    limiter(req2, res, next2); // Allowed (different IP)

    expect(next).toHaveBeenCalled();
    expect(next2).toHaveBeenCalled();
  });
});
