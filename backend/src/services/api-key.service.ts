import crypto from 'crypto';
import { InvocationContext } from '@azure/functions';
import { SecurityService } from './security.service';

export interface ApiKeyConfig {
  name: string;
  service: string;
  permissions: string[];
  expiresAt?: Date;
  isActive: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  service: string;
  keyHash: string;
  permissions: string[];
  createdAt: Date;
  expiresAt?: Date;
  lastUsed?: Date;
  isActive: boolean;
}

export interface ApiKeyUsage {
  keyId: string;
  endpoint: string;
  method: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  timestamp: Date;
}

export class ApiKeyService {
  private securityService: SecurityService;
  private apiKeys: Map<string, ApiKey> = new Map();
  private keyUsage: Map<string, ApiKeyUsage[]> = new Map();

  constructor() {
    this.securityService = new SecurityService();
    this.loadApiKeys();
  }

  /**
   * Generate a new API key
   */
  generateApiKey(config: ApiKeyConfig, context?: InvocationContext): { key: string; keyId: string } {
    const keyId = crypto.randomUUID();
    const rawKey = crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    
    const apiKey: ApiKey = {
      id: keyId,
      name: config.name,
      service: config.service,
      keyHash,
      permissions: config.permissions,
      createdAt: new Date(),
      expiresAt: config.expiresAt,
      isActive: config.isActive
    };

    this.apiKeys.set(keyId, apiKey);
    this.keyUsage.set(keyId, []);

    // Log API key creation
    this.securityService.logSecurityEvent(
      'API_KEY_CREATED',
      'api_keys',
      'system',
      true,
      undefined,
      undefined,
      { 
        keyId,
        name: config.name,
        service: config.service,
        permissions: config.permissions
      },
      context
    );

    // Return the raw key (this is the only time it's available in plain text)
    return {
      key: `jak_${keyId}_${rawKey}`, // JamAlert Key prefix
      keyId
    };
  }

  /**
   * Validate an API key
   */
  async validateApiKey(
    apiKey: string,
    requiredPermission?: string,
    context?: InvocationContext
  ): Promise<{ valid: boolean; keyId?: string; permissions?: string[] }> {
    try {
      // Parse the API key format: jak_{keyId}_{rawKey}
      if (!apiKey.startsWith('jak_')) {
        return { valid: false };
      }

      const parts = apiKey.split('_');
      if (parts.length !== 3) {
        return { valid: false };
      }

      const [, keyId, rawKey] = parts;
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

      const storedKey = this.apiKeys.get(keyId);
      if (!storedKey) {
        await this.securityService.logSecurityEvent(
          'API_KEY_NOT_FOUND',
          'api_keys',
          'system',
          false,
          undefined,
          undefined,
          { keyId },
          context
        );
        return { valid: false };
      }

      // Check if key is active
      if (!storedKey.isActive) {
        await this.securityService.logSecurityEvent(
          'API_KEY_INACTIVE',
          'api_keys',
          'system',
          false,
          undefined,
          undefined,
          { keyId, service: storedKey.service },
          context
        );
        return { valid: false };
      }

      // Check if key is expired
      if (storedKey.expiresAt && storedKey.expiresAt < new Date()) {
        await this.securityService.logSecurityEvent(
          'API_KEY_EXPIRED',
          'api_keys',
          'system',
          false,
          undefined,
          undefined,
          { keyId, service: storedKey.service, expiresAt: storedKey.expiresAt },
          context
        );
        return { valid: false };
      }

      // Verify key hash
      if (storedKey.keyHash !== keyHash) {
        await this.securityService.logSecurityEvent(
          'API_KEY_INVALID_HASH',
          'api_keys',
          'system',
          false,
          undefined,
          undefined,
          { keyId, service: storedKey.service },
          context
        );
        return { valid: false };
      }

      // Check required permission
      if (requiredPermission && !storedKey.permissions.includes(requiredPermission)) {
        await this.securityService.logSecurityEvent(
          'API_KEY_INSUFFICIENT_PERMISSIONS',
          'api_keys',
          'system',
          false,
          undefined,
          undefined,
          { 
            keyId, 
            service: storedKey.service,
            requiredPermission,
            availablePermissions: storedKey.permissions
          },
          context
        );
        return { valid: false };
      }

      // Update last used timestamp
      storedKey.lastUsed = new Date();

      return {
        valid: true,
        keyId,
        permissions: storedKey.permissions
      };
    } catch (error) {
      await this.securityService.logSecurityEvent(
        'API_KEY_VALIDATION_ERROR',
        'api_keys',
        'system',
        false,
        undefined,
        undefined,
        { error: error.message },
        context
      );
      return { valid: false };
    }
  }

  /**
   * Log API key usage
   */
  async logKeyUsage(
    keyId: string,
    endpoint: string,
    method: string,
    ipAddress: string,
    success: boolean,
    userAgent?: string,
    context?: InvocationContext
  ): Promise<void> {
    const usage: ApiKeyUsage = {
      keyId,
      endpoint,
      method,
      ipAddress,
      userAgent,
      success,
      timestamp: new Date()
    };

    // Store usage in memory (in production, this would go to a database)
    const keyUsageList = this.keyUsage.get(keyId) || [];
    keyUsageList.push(usage);
    
    // Keep only last 1000 usage records per key
    if (keyUsageList.length > 1000) {
      keyUsageList.splice(0, keyUsageList.length - 1000);
    }
    
    this.keyUsage.set(keyId, keyUsageList);

    // Log to security audit
    const apiKey = this.apiKeys.get(keyId);
    await this.securityService.logSecurityEvent(
      'API_KEY_USED',
      'api_keys',
      ipAddress,
      success,
      undefined,
      userAgent,
      {
        keyId,
        service: apiKey?.service,
        endpoint,
        method
      },
      context
    );
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(keyId: string, reason: string, context?: InvocationContext): Promise<void> {
    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey) {
      throw new Error('API key not found');
    }

    apiKey.isActive = false;

    await this.securityService.logSecurityEvent(
      'API_KEY_REVOKED',
      'api_keys',
      'system',
      true,
      undefined,
      undefined,
      {
        keyId,
        service: apiKey.service,
        reason
      },
      context
    );
  }

  /**
   * List all API keys (without sensitive data)
   */
  listApiKeys(): Omit<ApiKey, 'keyHash'>[] {
    return Array.from(this.apiKeys.values()).map(key => ({
      id: key.id,
      name: key.name,
      service: key.service,
      permissions: key.permissions,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
      lastUsed: key.lastUsed,
      isActive: key.isActive
    }));
  }

  /**
   * Get API key usage statistics
   */
  getKeyUsageStats(keyId: string, days: number = 30): any {
    const usage = this.keyUsage.get(keyId) || [];
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const recentUsage = usage.filter(u => u.timestamp >= cutoffDate);
    
    const stats = {
      totalRequests: recentUsage.length,
      successfulRequests: recentUsage.filter(u => u.success).length,
      failedRequests: recentUsage.filter(u => !u.success).length,
      uniqueIPs: new Set(recentUsage.map(u => u.ipAddress)).size,
      endpointUsage: {} as Record<string, number>,
      dailyUsage: {} as Record<string, number>
    };

    // Calculate endpoint usage
    recentUsage.forEach(u => {
      stats.endpointUsage[u.endpoint] = (stats.endpointUsage[u.endpoint] || 0) + 1;
    });

    // Calculate daily usage
    recentUsage.forEach(u => {
      const day = u.timestamp.toISOString().split('T')[0];
      stats.dailyUsage[day] = (stats.dailyUsage[day] || 0) + 1;
    });

    return stats;
  }

  /**
   * Load API keys from environment or secure storage
   */
  private loadApiKeys(): void {
    // In production, this would load from a secure database or key vault
    // For now, we'll create some default keys from environment variables
    
    // Weather service API key
    if (process.env.WEATHER_API_KEY) {
      const weatherKeyId = 'weather-service-key';
      this.apiKeys.set(weatherKeyId, {
        id: weatherKeyId,
        name: 'Weather Service',
        service: 'jamaica-met-service',
        keyHash: crypto.createHash('sha256').update(process.env.WEATHER_API_KEY).digest('hex'),
        permissions: ['weather:read', 'weather:alerts'],
        createdAt: new Date(),
        isActive: true
      });
      this.keyUsage.set(weatherKeyId, []);
    }

    // SMS service API key
    if (process.env.SMS_API_KEY) {
      const smsKeyId = 'sms-service-key';
      this.apiKeys.set(smsKeyId, {
        id: smsKeyId,
        name: 'SMS Service',
        service: 'twilio',
        keyHash: crypto.createHash('sha256').update(process.env.SMS_API_KEY).digest('hex'),
        permissions: ['sms:send', 'sms:status'],
        createdAt: new Date(),
        isActive: true
      });
      this.keyUsage.set(smsKeyId, []);
    }

    // Email service API key
    if (process.env.EMAIL_API_KEY) {
      const emailKeyId = 'email-service-key';
      this.apiKeys.set(emailKeyId, {
        id: emailKeyId,
        name: 'Email Service',
        service: 'smtp',
        keyHash: crypto.createHash('sha256').update(process.env.EMAIL_API_KEY).digest('hex'),
        permissions: ['email:send', 'email:status'],
        createdAt: new Date(),
        isActive: true
      });
      this.keyUsage.set(emailKeyId, []);
    }
  }

  /**
   * Rotate an API key (generate new key, keep old one active for grace period)
   */
  async rotateApiKey(
    keyId: string,
    gracePeriodHours: number = 24,
    context?: InvocationContext
  ): Promise<{ newKey: string; newKeyId: string }> {
    const oldKey = this.apiKeys.get(keyId);
    if (!oldKey) {
      throw new Error('API key not found');
    }

    // Generate new key with same configuration
    const newKeyResult = this.generateApiKey({
      name: `${oldKey.name} (Rotated)`,
      service: oldKey.service,
      permissions: oldKey.permissions,
      isActive: true
    }, context);

    // Set old key to expire after grace period
    oldKey.expiresAt = new Date(Date.now() + gracePeriodHours * 60 * 60 * 1000);

    await this.securityService.logSecurityEvent(
      'API_KEY_ROTATED',
      'api_keys',
      'system',
      true,
      undefined,
      undefined,
      {
        oldKeyId: keyId,
        newKeyId: newKeyResult.keyId,
        service: oldKey.service,
        gracePeriodHours
      },
      context
    );

    return newKeyResult;
  }
}