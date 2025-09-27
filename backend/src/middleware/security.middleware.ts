import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { SecurityService } from '../services/security.service';

export interface SecurityMiddlewareOptions {
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  requireHttps?: boolean;
  validateInput?: boolean;
  auditLog?: boolean;
}

export class SecurityMiddleware {
  private securityService: SecurityService;

  constructor() {
    this.securityService = new SecurityService();
  }

  async apply(
    request: HttpRequest,
    context: InvocationContext,
    options: SecurityMiddlewareOptions = {}
  ): Promise<HttpResponseInit | null> {
    const clientIp = this.getClientIp(request);
    const userAgent = request.headers.get('user-agent') || undefined;
    const endpoint = request.url;

    try {
      // HTTPS enforcement
      if (options.requireHttps && !this.isHttps(request)) {
        await this.securityService.logSecurityEvent(
          'HTTPS_REQUIRED',
          endpoint,
          clientIp,
          false,
          undefined,
          userAgent,
          { url: request.url },
          context
        );

        return {
          status: 400,
          headers: this.securityService.getSecurityHeaders(),
          jsonBody: { error: 'HTTPS required' }
        };
      }

      // Rate limiting
      if (options.rateLimit) {
        const rateLimitResult = await this.securityService.checkRateLimit(
          clientIp,
          endpoint,
          {
            windowMs: options.rateLimit.windowMs,
            maxRequests: options.rateLimit.maxRequests,
            keyGenerator: (ip, endpoint) => `${ip}:${this.getEndpointKey(endpoint)}`
          }
        );

        if (!rateLimitResult.allowed) {
          await this.securityService.logSecurityEvent(
            'RATE_LIMIT_EXCEEDED',
            endpoint,
            clientIp,
            false,
            undefined,
            userAgent,
            { 
              remaining: rateLimitResult.remaining,
              resetTime: rateLimitResult.resetTime 
            },
            context
          );

          return {
            status: 429,
            headers: {
              ...this.securityService.getSecurityHeaders(),
              'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
              'X-RateLimit-Limit': options.rateLimit.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
            },
            jsonBody: { 
              error: 'Rate limit exceeded',
              retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
            }
          };
        }

        // Add rate limit headers to successful requests
        context.extraOutputs.set('rateLimitHeaders', {
          'X-RateLimit-Limit': options.rateLimit.maxRequests.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
        });
      }

      // Input validation for POST/PUT requests
      if (options.validateInput && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const validationResult = await this.validateRequestBody(request, endpoint);
        if (!validationResult.valid) {
          await this.securityService.logSecurityEvent(
            'INPUT_VALIDATION_FAILED',
            endpoint,
            clientIp,
            false,
            undefined,
            userAgent,
            { errors: validationResult.errors },
            context
          );

          return {
            status: 400,
            headers: this.securityService.getSecurityHeaders(),
            jsonBody: { 
              error: 'Invalid input data',
              details: validationResult.errors
            }
          };
        }
      }

      // Audit logging for sensitive endpoints
      if (options.auditLog) {
        await this.securityService.logSecurityEvent(
          'API_ACCESS',
          endpoint,
          clientIp,
          true,
          undefined,
          userAgent,
          { method: request.method },
          context
        );
      }

      return null; // Continue processing
    } catch (error) {
      context.log.error('Security middleware error:', error);
      
      await this.securityService.logSecurityEvent(
        'SECURITY_MIDDLEWARE_ERROR',
        endpoint,
        clientIp,
        false,
        undefined,
        userAgent,
        { error: error.message },
        context
      );

      return {
        status: 500,
        headers: this.securityService.getSecurityHeaders(),
        jsonBody: { error: 'Security check failed' }
      };
    }
  }

  private getClientIp(request: HttpRequest): string {
    // Check various headers for the real client IP
    const xForwardedFor = request.headers.get('x-forwarded-for');
    const xRealIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    
    if (xForwardedFor) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      return xForwardedFor.split(',')[0].trim();
    }
    
    if (xRealIp) {
      return xRealIp;
    }
    
    if (cfConnectingIp) {
      return cfConnectingIp;
    }
    
    // Fallback to a default IP if none found
    return '127.0.0.1';
  }

  private isHttps(request: HttpRequest): boolean {
    // Check if the request is HTTPS
    const protocol = request.headers.get('x-forwarded-proto') || 
                    request.headers.get('x-forwarded-protocol') ||
                    'http';
    
    return protocol.toLowerCase() === 'https' || 
           request.url.startsWith('https://') ||
           process.env.NODE_ENV === 'development'; // Allow HTTP in development
  }

  private getEndpointKey(url: string): string {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      
      // Group similar endpoints for rate limiting
      if (path.includes('/auth/')) return 'auth';
      if (path.includes('/incidents/')) return 'incidents';
      if (path.includes('/alerts/')) return 'alerts';
      if (path.includes('/admin/')) return 'admin';
      
      return 'general';
    } catch {
      return 'general';
    }
  }

  private async validateRequestBody(request: HttpRequest, endpoint: string): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const body = await request.text();
      
      if (!body) {
        return { valid: true, errors: [] };
      }

      // Parse JSON safely
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        return { valid: false, errors: ['Invalid JSON format'] };
      }

      // Apply endpoint-specific validation
      if (endpoint.includes('/auth/register')) {
        return this.securityService.validateUserRegistration(data);
      } else if (endpoint.includes('/incidents/report')) {
        return this.securityService.validateIncidentReport(data);
      }

      // Basic validation for all endpoints
      const errors: string[] = [];
      
      // Check for potential XSS/injection attempts
      const jsonString = JSON.stringify(data);
      if (this.containsSuspiciousContent(jsonString)) {
        errors.push('Potentially malicious content detected');
      }

      // Check payload size
      if (jsonString.length > 50000) { // 50KB limit
        errors.push('Request payload too large');
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      return { valid: false, errors: ['Request validation failed'] };
    }
  }

  private containsSuspiciousContent(content: string): boolean {
    const suspiciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      /<iframe[^>]*>/gi,
      /<object[^>]*>/gi,
      /<embed[^>]*>/gi,
      /union\s+select/gi,
      /drop\s+table/gi,
      /delete\s+from/gi,
      /insert\s+into/gi,
      /update\s+set/gi
    ];

    return suspiciousPatterns.some(pattern => pattern.test(content));
  }

  // Helper method to apply security headers to any response
  static addSecurityHeaders(response: HttpResponseInit): HttpResponseInit {
    const securityService = new SecurityService();
    const securityHeaders = securityService.getSecurityHeaders();
    
    return {
      ...response,
      headers: {
        ...response.headers,
        ...securityHeaders
      }
    };
  }
}

// Rate limiting configurations for different endpoints
export const RATE_LIMIT_CONFIGS = {
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5 // 5 attempts per 15 minutes
  },
  REGISTRATION: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3 // 3 registrations per hour per IP
  },
  INCIDENT_REPORT: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10 // 10 reports per 5 minutes
  },
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100 // 100 requests per 15 minutes
  },
  ADMIN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 200 // Higher limit for admin operations
  }
};