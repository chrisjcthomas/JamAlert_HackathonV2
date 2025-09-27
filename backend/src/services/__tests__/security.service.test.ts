import { SecurityService } from '../security.service';

describe('SecurityService', () => {
  let securityService: SecurityService;

  beforeEach(() => {
    securityService = new SecurityService();
  });

  it('should return a set of security headers', () => {
    const headers = securityService.getSecurityHeaders();
    expect(headers['Content-Security-Policy']).toBeDefined();
    expect(headers['Strict-Transport-Security']).toBeDefined();
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['X-XSS-Protection']).toBe('1; mode=block');
  });

  it('should correctly encrypt and decrypt a string', () => {
    const originalText = 'This is a secret message';
    const encryptedText = securityService.encrypt(originalText);
    const decryptedText = securityService.decrypt(encryptedText);

    expect(encryptedText).not.toBe(originalText);
    expect(decryptedText).toBe(originalText);
  });

  it('should handle rate limiting correctly', async () => {
    const key = '127.0.0.1';
    const endpoint = '/api/test';
    const options = { windowMs: 1000, maxRequests: 5, keyGenerator: (ip: string, endpoint: string) => `${ip}:${endpoint}` };

    for (let i = 0; i < 5; i++) {
      const result = await securityService.checkRateLimit(key, endpoint, options);
      expect(result.allowed).toBe(true);
    }

    const result = await securityService.checkRateLimit(key, endpoint, options);
    expect(result.allowed).toBe(false);
  });
});
