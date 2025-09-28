
import { HttpRequest, InvocationContext } from '@azure/functions';
import { z } from 'zod';
import * as crypto from 'crypto';

// In-memory store for rate limiting. In production, use a distributed cache like Redis.
const rateLimitStore: { [key: string]: { count: number; expiry: number } } = {};

// Encryption configuration
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_encryption_key_32_chars'; // 32 characters for AES-256
const IV_LENGTH = 16; // For AES, this is always 16

export class SecurityService {
  // ... (existing methods if any)

  getSecurityHeaders(): { [key: string]: string } {
    return {
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';",
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
    };
  }

  async checkRateLimit(
    key: string,
    endpoint: string,
    options: { windowMs: number; maxRequests: number; keyGenerator: (ip: string, endpoint: string) => string }
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const generatedKey = options.keyGenerator(key, endpoint);
    const record = rateLimitStore[generatedKey];

    if (!record || record.expiry < now) {
      rateLimitStore[generatedKey] = {
        count: 1,
        expiry: now + options.windowMs,
      };
      return { allowed: true, remaining: options.maxRequests - 1, resetTime: rateLimitStore[generatedKey].expiry };
    }

    if (record.count < options.maxRequests) {
      record.count++;
      return { allowed: true, remaining: options.maxRequests - record.count, resetTime: record.expiry };
    }

    return { allowed: false, remaining: 0, resetTime: record.expiry };
  }

  async logSecurityEvent(
    eventType: string,
    endpoint: string,
    clientIp: string,
    success: boolean,
    userId: string | undefined,
    userAgent: string | undefined,
    details: object,
    context: InvocationContext
  ): Promise<void> {
    const logMessage = `SECURITY_EVENT: ${eventType} - Endpoint: ${endpoint}, IP: ${clientIp}, Success: ${success}, UserId: ${userId || 'N/A'}, UserAgent: ${userAgent || 'N/A'}, Details: ${JSON.stringify(details)}`;
    if (success) {
      context.info(logMessage);
    } else {
      context.warn(logMessage);
    }
  }

  validateUserRegistration(data: any): { valid: boolean; errors: string[] } {
    const schema = z.object({
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        email: z.string().email(),
        phone: z.string().optional(),
        parish: z.string(),
    });

    const result = schema.safeParse(data);
    if (result.success) {
      return { valid: true, errors: [] };
    } else {
      return { valid: false, errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
    }
  }

  validateIncidentReport(data: any): { valid: boolean; errors: string[] } {
    const schema = z.object({
        incidentType: z.string(),
        severity: z.string(),
        parish: z.string(),
        description: z.string().min(10).max(1000),
    });

    const result = schema.safeParse(data);
    if (result.success) {
      return { valid: true, errors: [] };
    } else {
      return { valid: false, errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`) };
    }
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  decrypt(text: string): string {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
}
