/**
 * Security Configuration for JamAlert System
 * 
 * This file contains all security-related configuration settings
 * including rate limits, validation rules, encryption settings, etc.
 */

export const SECURITY_CONFIG = {
  // Rate Limiting Configuration
  RATE_LIMITS: {
    // Authentication endpoints
    AUTH_LOGIN: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 login attempts per 15 minutes
      blockDuration: 30 * 60 * 1000, // 30 minutes block after limit exceeded
      skipSuccessfulRequests: true
    },
    
    // User registration
    REGISTRATION: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // 3 registrations per hour per IP
      blockDuration: 2 * 60 * 60 * 1000, // 2 hours block
      skipSuccessfulRequests: false
    },
    
    // Incident reporting
    INCIDENT_REPORT: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 10, // 10 reports per 5 minutes
      blockDuration: 15 * 60 * 1000, // 15 minutes block
      skipSuccessfulRequests: true
    },
    
    // General API access
    GENERAL_API: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100, // 100 requests per 15 minutes
      blockDuration: 5 * 60 * 1000, // 5 minutes block
      skipSuccessfulRequests: true
    },
    
    // Admin operations
    ADMIN_API: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 200, // Higher limit for admin operations
      blockDuration: 10 * 60 * 1000, // 10 minutes block
      skipSuccessfulRequests: true
    },
    
    // Data export/deletion (privacy operations)
    PRIVACY_OPERATIONS: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 2, // Very limited privacy operations
      blockDuration: 24 * 60 * 60 * 1000, // 24 hours block
      skipSuccessfulRequests: false
    }
  },

  // Input Validation Rules
  VALIDATION: {
    // Maximum lengths for various fields
    MAX_LENGTHS: {
      firstName: 100,
      lastName: 100,
      email: 255,
      phone: 20,
      address: 1000,
      description: 2000,
      community: 255,
      incidentTime: 8,
      reporterName: 255,
      reporterPhone: 20,
      alertTitle: 255,
      alertMessage: 5000,
      adminName: 255,
      auditDetails: 10000
    },
    
    // Minimum lengths
    MIN_LENGTHS: {
      firstName: 1,
      lastName: 1,
      description: 10,
      password: 8,
      alertMessage: 10
    },
    
    // Regular expressions for validation
    PATTERNS: {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^\+?[\d\s\-\(\)]{7,20}$/,
      time24h: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      alphanumeric: /^[a-zA-Z0-9\s\-_]+$/,
      coordinates: {
        latitude: /^-?([1-8]?\d(\.\d+)?|90(\.0+)?)$/,
        longitude: /^-?((1[0-7]\d)|([1-9]?\d))(\.\d+)?$|^-?180(\.0+)?$/
      }
    },
    
    // Coordinate bounds for Jamaica
    JAMAICA_BOUNDS: {
      latitude: { min: 17.7, max: 18.6 },
      longitude: { min: -78.4, max: -76.2 }
    },
    
    // Date validation
    DATE_LIMITS: {
      incidentMaxPastDays: 30,
      incidentMaxFutureDays: 0,
      alertMaxFutureDays: 7,
      sessionMaxDays: 30
    }
  },

  // Security Headers Configuration
  SECURITY_HEADERS: {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https:",
      "font-src 'self' https://fonts.gstatic.com",
      "object-src 'none'",
      "media-src 'self'",
      "frame-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '),
    'Permissions-Policy': [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'speaker=()',
      'vibrate=()',
      'fullscreen=(self)',
      'sync-xhr=()'
    ].join(', '),
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin'
  },

  // Encryption Configuration
  ENCRYPTION: {
    algorithm: 'aes-256-gcm',
    keyLength: 32, // 256 bits
    ivLength: 16, // 128 bits
    tagLength: 16, // 128 bits
    saltLength: 32, // 256 bits
    iterations: 100000, // PBKDF2 iterations
    hashAlgorithm: 'sha256'
  },

  // Password Security
  PASSWORD: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    bcryptRounds: 12,
    maxLoginAttempts: 5,
    lockoutDuration: 30 * 60 * 1000, // 30 minutes
    passwordHistoryCount: 5, // Remember last 5 passwords
    maxAge: 90 * 24 * 60 * 60 * 1000 // 90 days
  },

  // Session Management
  SESSION: {
    maxAge: 30 * 60 * 1000, // 30 minutes
    renewThreshold: 10 * 60 * 1000, // Renew if less than 10 minutes left
    maxConcurrentSessions: 3, // Max 3 concurrent sessions per user
    cleanupInterval: 60 * 60 * 1000, // Clean up expired sessions every hour
    cookieSettings: {
      httpOnly: true,
      secure: true,
      sameSite: 'strict' as const,
      path: '/',
      maxAge: 30 * 60 * 1000
    }
  },

  // JWT Configuration
  JWT: {
    algorithm: 'HS256' as const,
    expiresIn: '30m',
    issuer: 'jamalert-system',
    audience: 'jamalert-users',
    clockTolerance: 30, // 30 seconds
    maxAge: '30m',
    refreshThreshold: 5 * 60 * 1000 // Refresh if less than 5 minutes left
  },

  // API Key Management
  API_KEYS: {
    keyLength: 32, // 256 bits
    defaultExpiration: 365 * 24 * 60 * 60 * 1000, // 1 year
    rotationInterval: 90 * 24 * 60 * 60 * 1000, // 90 days
    gracePeriod: 24 * 60 * 60 * 1000, // 24 hours
    maxKeysPerService: 5,
    permissions: {
      'weather:read': 'Read weather data',
      'weather:alerts': 'Trigger weather alerts',
      'sms:send': 'Send SMS messages',
      'sms:status': 'Check SMS delivery status',
      'email:send': 'Send email messages',
      'email:status': 'Check email delivery status',
      'admin:read': 'Read admin data',
      'admin:write': 'Modify admin data',
      'alerts:send': 'Send emergency alerts',
      'incidents:read': 'Read incident reports',
      'incidents:write': 'Create/modify incident reports'
    }
  },

  // Audit Logging
  AUDIT: {
    retentionPeriod: 365 * 24 * 60 * 60 * 1000, // 1 year
    criticalEvents: [
      'ADMIN_LOGIN_FAILED',
      'RATE_LIMIT_EXCEEDED',
      'INVALID_TOKEN_ACCESS',
      'DATA_DELETION_REQUEST',
      'BULK_USER_EXPORT',
      'SYSTEM_CONFIG_CHANGE',
      'SECURITY_BREACH_DETECTED',
      'UNAUTHORIZED_ACCESS_ATTEMPT',
      'SUSPICIOUS_ACTIVITY_DETECTED'
    ],
    logLevels: {
      INFO: 'info',
      WARN: 'warn',
      ERROR: 'error',
      CRITICAL: 'critical'
    },
    maxLogSize: 10 * 1024 * 1024, // 10MB per log entry
    batchSize: 100, // Process logs in batches of 100
    flushInterval: 5 * 60 * 1000 // Flush logs every 5 minutes
  },

  // Data Protection
  DATA_PROTECTION: {
    // Data retention periods
    retention: {
      personalData: null, // Retained until account deletion
      alertHistory: 6 * 30 * 24 * 60 * 60 * 1000, // 6 months
      auditLogs: 365 * 24 * 60 * 60 * 1000, // 1 year
      sessions: 30 * 24 * 60 * 60 * 1000, // 30 days
      incidentReports: null, // Retained indefinitely for safety
      weatherData: 90 * 24 * 60 * 60 * 1000, // 90 days
      deliveryLogs: 6 * 30 * 24 * 60 * 60 * 1000 // 6 months
    },
    
    // Anonymization settings
    anonymization: {
      userIdReplacement: 'anon_user',
      emailReplacement: 'anonymized@local',
      phoneReplacement: null,
      nameReplacement: 'Anonymous User',
      addressReplacement: null
    },
    
    // Export limits
    export: {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxRecords: 10000,
      allowedFormats: ['json', 'csv'],
      compressionEnabled: true
    }
  },

  // Threat Detection
  THREAT_DETECTION: {
    // Suspicious patterns
    suspiciousPatterns: [
      // XSS patterns
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
      
      // SQL injection patterns
      /union\s+select/gi,
      /drop\s+table/gi,
      /delete\s+from/gi,
      /insert\s+into/gi,
      /update\s+set/gi,
      /exec\s*\(/gi,
      /sp_\w+/gi,
      /xp_\w+/gi,
      
      // Command injection patterns
      /;\s*ls\s/gi,
      /;\s*cat\s/gi,
      /;\s*rm\s/gi,
      /;\s*wget\s/gi,
      /;\s*curl\s/gi,
      /;\s*nc\s/gi,
      /\|\s*nc\s/gi,
      /&&\s*rm\s/gi,
      /`.*`/g,
      /\$\(.*\)/g,
      
      // Path traversal patterns
      /\.\.\//g,
      /\.\.\\/g,
      /%2e%2e%2f/gi,
      /%2e%2e%5c/gi
    ],
    
    // Anomaly detection thresholds
    anomalyThresholds: {
      requestSizeLimit: 50 * 1024, // 50KB
      requestDepthLimit: 10, // Max object nesting depth
      requestFieldLimit: 100, // Max number of fields
      unusualUserAgent: true,
      suspiciousHeaders: true,
      rapidRequests: {
        threshold: 10, // requests
        window: 1000 // 1 second
      }
    },
    
    // Response actions
    responseActions: {
      block: true,
      log: true,
      alert: true,
      quarantine: false // For future implementation
    }
  },

  // Monitoring and Alerting
  MONITORING: {
    healthCheck: {
      interval: 5 * 60 * 1000, // 5 minutes
      timeout: 30 * 1000, // 30 seconds
      retries: 3,
      endpoints: [
        '/api/health',
        '/api/admin/health'
      ]
    },
    
    metrics: {
      collection: {
        interval: 60 * 1000, // 1 minute
        retention: 7 * 24 * 60 * 60 * 1000, // 7 days
        aggregation: 'average'
      },
      
      alerts: {
        errorRate: {
          threshold: 0.05, // 5% error rate
          window: 5 * 60 * 1000 // 5 minutes
        },
        responseTime: {
          threshold: 5000, // 5 seconds
          window: 5 * 60 * 1000 // 5 minutes
        },
        memoryUsage: {
          threshold: 0.8, // 80% memory usage
          window: 5 * 60 * 1000 // 5 minutes
        }
      }
    }
  }
};

// Environment-specific overrides
export const getSecurityConfig = (environment: string = process.env.NODE_ENV || 'production') => {
  const config = { ...SECURITY_CONFIG };
  
  if (environment === 'development') {
    // Relax some restrictions for development
    config.RATE_LIMITS.GENERAL_API.maxRequests = 1000;
    config.SECURITY_HEADERS['Content-Security-Policy'] = config.SECURITY_HEADERS['Content-Security-Policy']
      .replace("'self'", "'self' 'unsafe-eval'"); // Allow eval for dev tools
    config.SESSION.cookieSettings.secure = false; // Allow HTTP in development
  } else if (environment === 'test') {
    // Minimal restrictions for testing
    config.RATE_LIMITS.GENERAL_API.maxRequests = 10000;
    config.RATE_LIMITS.AUTH_LOGIN.maxRequests = 100;
    config.SESSION.maxAge = 60 * 60 * 1000; // 1 hour for tests
  }
  
  return config;
};

export default SECURITY_CONFIG;