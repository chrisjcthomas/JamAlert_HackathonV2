import { SecurityMiddleware, RATE_LIMIT_CONFIGS } from '../security.middleware';
import { HttpRequest, InvocationContext } from '@azure/functions';

// Mock dependencies
jest.mock('../../services/security.service');

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

describe('SecurityMiddleware', () => {
  let securityMiddleware: SecurityMiddleware;

  beforeEach(() => {
    securityMiddleware = new SecurityMiddleware();
    jest.clearAllMocks();
  });

  describe('HTTPS Enforcement', () => {
    test('should allow HTTPS requests', async () => {
      const request = createMockRequest({
        url: 'https://example.com/api/test',
        headers: { 'x-forwarded-proto': 'https' }
      });

      const result = await securityMiddleware.apply(request, mockContext, {
        requireHttps: true
      });

      expect(result).toBeNull(); // Should continue processing
    });

    test('should block HTTP requests when HTTPS required', async () => {
      const request = createMockRequest({
        url: 'http://example.com/api/test',
        headers: { 'x-forwarded-proto': 'http' }
      });

      const result = await securityMiddleware.apply(request, mockContext, {
        requireHttps: true
      });

      expect(result).not.toBeNull();
      expect(result?.status).toBe(400);
      expect(result?.jsonBody).toEqual({ error: 'HTTPS required' });
    });

    test('should allow HTTP in development environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const request = createMockRequest({
        url: 'http://localhost:3000/api/test',
        headers: { 'x-forwarded-proto': 'http' }
      });

      const result = await securityMiddleware.apply(request, mockContext, {
        requireHttps: true
      });

      expect(result).toBeNull(); // Should continue processing

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Rate Limiting', () => {
    test('should allow requests within rate limit', async () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '127.0.0.1' }
      });

      const result = await securityMiddleware.apply(request, mockContext, {
        rateLimit: {
          windowMs: 60000,
          maxRequests: 10
        }
      });

      expect(result).toBeNull(); // Should continue processing
    });

    test('should add rate limit headers to context', async () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '127.0.0.1' }
      });

      await securityMiddleware.apply(request, mockContext, {
        rateLimit: {
          windowMs: 60000,
          maxRequests: 10
        }
      });

      expect(mockContext.extraOutputs.has('rateLimitHeaders')).toBe(true);
    });
  });

  describe('Input Validation', () => {
    test('should validate JSON input for POST requests', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'https://example.com/api/auth/register',
        body: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          parish: 'kingston'
        }
      });

      const result = await securityMiddleware.apply(request, mockContext, {
        validateInput: true
      });

      expect(result).toBeNull(); // Should continue processing
    });

    test('should reject invalid JSON', async () => {
      const request = {
        method: 'POST',
        url: 'https://example.com/api/test',
        headers: new Map(),
        text: async () => '{ invalid json',
        json: async () => { throw new Error('Invalid JSON'); }
      } as HttpRequest;

      const result = await securityMiddleware.apply(request, mockContext, {
        validateInput: true
      });

      expect(result).not.toBeNull();
      expect(result?.status).toBe(400);
      expect(result?.jsonBody?.error).toBe('Invalid input data');
    });

    test('should detect suspicious content', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          description: '<script>alert("xss")</script>Malicious content'
        }
      });

      const result = await securityMiddleware.apply(request, mockContext, {
        validateInput: true
      });

      expect(result).not.toBeNull();
      expect(result?.status).toBe(400);
      expect(result?.jsonBody?.details).toContain('Potentially malicious content detected');
    });

    test('should reject oversized payloads', async () => {
      const largePayload = { data: 'a'.repeat(60000) }; // > 50KB

      const request = createMockRequest({
        method: 'POST',
        body: largePayload
      });

      const result = await securityMiddleware.apply(request, mockContext, {
        validateInput: true
      });

      expect(result).not.toBeNull();
      expect(result?.status).toBe(400);
      expect(result?.jsonBody?.details).toContain('Request payload too large');
    });
  });

  describe('Client IP Detection', () => {
    test('should extract IP from X-Forwarded-For header', async () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' }
      });

      const result = await securityMiddleware.apply(request, mockContext, {
        auditLog: true
      });

      expect(result).toBeNull();
      // IP should be extracted as first IP in the chain
    });

    test('should extract IP from X-Real-IP header', async () => {
      const request = createMockRequest({
        headers: { 'x-real-ip': '192.168.1.1' }
      });

      const result = await securityMiddleware.apply(request, mockContext, {
        auditLog: true
      });

      expect(result).toBeNull();
    });

    test('should fallback to default IP when no headers present', async () => {
      const request = createMockRequest({});

      const result = await securityMiddleware.apply(request, mockContext, {
        auditLog: true
      });

      expect(result).toBeNull();
    });
  });

  describe('Security Headers', () => {
    test('should add security headers to responses', () => {
      const response = { status: 200, jsonBody: { success: true } };
      
      const secureResponse = SecurityMiddleware.addSecurityHeaders(response);
      
      expect(secureResponse.headers).toBeDefined();
      expect(secureResponse.headers?.['Strict-Transport-Security']).toBeDefined();
      expect(secureResponse.headers?.['X-Content-Type-Options']).toBe('nosniff');
      expect(secureResponse.headers?.['X-Frame-Options']).toBe('DENY');
    });
  });

  describe('Endpoint-Specific Validation', () => {
    test('should apply registration validation for auth/register endpoint', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'https://example.com/api/auth/register',
        body: {
          firstName: '', // Invalid - empty
          email: 'invalid-email', // Invalid format
          parish: 'invalid_parish' // Invalid parish
        }
      });

      const result = await securityMiddleware.apply(request, mockContext, {
        validateInput: true
      });

      expect(result).not.toBeNull();
      expect(result?.status).toBe(400);
      expect(result?.jsonBody?.details).toContain('First name is required');
    });

    test('should apply incident validation for incidents/report endpoint', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'https://example.com/api/incidents/report',
        body: {
          incidentType: '', // Invalid - empty
          severity: 'invalid', // Invalid severity
          description: 'short' // Too short
        }
      });

      const result = await securityMiddleware.apply(request, mockContext, {
        validateInput: true
      });

      expect(result).not.toBeNull();
      expect(result?.status).toBe(400);
      expect(result?.jsonBody?.details).toContain('Incident type is required');
    });
  });

  describe('Error Handling', () => {
    test('should handle middleware errors gracefully', async () => {
      // Mock a service that throws an error
      const request = createMockRequest({});
      
      // Force an error by providing invalid options
      const result = await securityMiddleware.apply(request, mockContext, {
        rateLimit: null as any // This should cause an error
      });

      expect(result).not.toBeNull();
      expect(result?.status).toBe(500);
      expect(result?.jsonBody?.error).toBe('Security check failed');
    });
  });

  describe('Rate Limit Configurations', () => {
    test('should have appropriate rate limits for different endpoints', () => {
      expect(RATE_LIMIT_CONFIGS.AUTH.maxRequests).toBeLessThan(RATE_LIMIT_CONFIGS.GENERAL.maxRequests);
      expect(RATE_LIMIT_CONFIGS.REGISTRATION.maxRequests).toBeLessThan(RATE_LIMIT_CONFIGS.GENERAL.maxRequests);
      expect(RATE_LIMIT_CONFIGS.ADMIN.maxRequests).toBeGreaterThan(RATE_LIMIT_CONFIGS.GENERAL.maxRequests);
    });

    test('should have reasonable time windows', () => {
      expect(RATE_LIMIT_CONFIGS.AUTH.windowMs).toBeGreaterThan(0);
      expect(RATE_LIMIT_CONFIGS.REGISTRATION.windowMs).toBeGreaterThan(RATE_LIMIT_CONFIGS.AUTH.windowMs);
    });
  });
});