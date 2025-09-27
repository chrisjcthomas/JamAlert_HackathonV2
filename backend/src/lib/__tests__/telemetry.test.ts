import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { InvocationContext } from '@azure/functions';
import { telemetryService, trackPerformance } from '../telemetry';

describe('TelemetryService', () => {
  let mockContext: InvocationContext;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    mockContext = {
      log: {
        info: jest.fn(),
        error: jest.fn(),
        metric: jest.fn()
      }
    } as any;

    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('logMetric', () => {
    it('should log metrics to Application Insights and console', () => {
      telemetryService.logMetric('test.metric', 42, { key: 'value' }, mockContext);

      expect(mockContext.log.metric).toHaveBeenCalledWith('test.metric', 42, { key: 'value' });
      expect(consoleSpy).toHaveBeenCalledWith('METRIC: test.metric = 42', { key: 'value' });
    });

    it('should work without context', () => {
      telemetryService.logMetric('test.metric', 42, { key: 'value' });

      expect(consoleSpy).toHaveBeenCalledWith('METRIC: test.metric = 42', { key: 'value' });
    });

    it('should handle errors gracefully', () => {
      mockContext.log.metric = jest.fn().mockImplementation(() => {
        throw new Error('Logging failed');
      });

      expect(() => {
        telemetryService.logMetric('test.metric', 42, undefined, mockContext);
      }).not.toThrow();

      expect(console.error).toHaveBeenCalledWith('Failed to log metric:', expect.any(Error));
    });
  });

  describe('logEvent', () => {
    it('should log events to Application Insights and console', () => {
      const properties = { key: 'value' };
      const measurements = { duration: 100 };

      telemetryService.logEvent('test.event', properties, measurements, mockContext);

      expect(mockContext.log.info).toHaveBeenCalledWith('EVENT: test.event', { properties, measurements });
      expect(consoleSpy).toHaveBeenCalledWith('EVENT: test.event', { properties, measurements });
    });

    it('should work without context', () => {
      telemetryService.logEvent('test.event');

      expect(consoleSpy).toHaveBeenCalledWith('EVENT: test.event', { properties: undefined, measurements: undefined });
    });
  });

  describe('logException', () => {
    it('should log exceptions to Application Insights and console', () => {
      const error = new Error('Test error');
      const properties = { context: 'test' };

      telemetryService.logException(error, properties, mockContext);

      expect(mockContext.log.error).toHaveBeenCalledWith('EXCEPTION:', error, properties);
      expect(console.error).toHaveBeenCalledWith('EXCEPTION:', error, properties);
    });
  });

  describe('createPerformanceTracker', () => {
    it('should track performance correctly', () => {
      const tracker = telemetryService.createPerformanceTracker('test-tracker');
      
      tracker.start();
      
      // Simulate some work
      const startTime = Date.now();
      while (Date.now() - startTime < 10) {
        // Wait a bit
      }
      
      const duration = tracker.end('test.performance', mockContext);

      expect(duration).toBeGreaterThan(0);
      expect(mockContext.log.metric).toHaveBeenCalledWith(
        'test.performance',
        duration,
        { trackerId: 'test-tracker' }
      );
    });

    it('should handle tracker that was not started', () => {
      const tracker = telemetryService.createPerformanceTracker('test-tracker');
      
      const duration = tracker.end('test.performance', mockContext);

      expect(duration).toBe(0);
      expect(console.warn).toHaveBeenCalledWith('Performance tracker test-tracker was not started');
    });
  });

  describe('trackAlertDelivery', () => {
    it('should track alert delivery metrics', () => {
      telemetryService.trackAlertDelivery('alert-123', 100, 5000, mockContext);

      expect(mockContext.log.metric).toHaveBeenCalledWith(
        'alert.delivery.time',
        5000,
        { alertId: 'alert-123' }
      );
      expect(mockContext.log.metric).toHaveBeenCalledWith(
        'alert.delivery.recipients',
        100,
        { alertId: 'alert-123' }
      );
      expect(mockContext.log.info).toHaveBeenCalledWith(
        'EVENT: alert.delivered',
        {
          properties: { alertId: 'alert-123', recipientCount: '100' },
          measurements: { deliveryTime: 5000 }
        }
      );
    });
  });

  describe('trackApiCall', () => {
    it('should track API call metrics', () => {
      telemetryService.trackApiCall('/api/alerts/send', 'POST', 200, 1500, mockContext);

      expect(mockContext.log.metric).toHaveBeenCalledWith(
        'api.response.time',
        1500,
        { endpoint: '/api/alerts/send', method: 'POST', statusCode: '200' }
      );
      expect(mockContext.log.info).toHaveBeenCalledWith(
        'EVENT: api.call',
        {
          properties: { endpoint: '/api/alerts/send', method: 'POST', statusCode: '200' },
          measurements: { duration: 1500 }
        }
      );
    });
  });

  describe('trackUserRegistration', () => {
    it('should track user registration events', () => {
      telemetryService.trackUserRegistration('kingston', ['email', 'sms'], mockContext);

      expect(mockContext.log.info).toHaveBeenCalledWith(
        'EVENT: user.registered',
        {
          properties: { parish: 'kingston', preferences: 'email,sms' },
          measurements: undefined
        }
      );
      expect(mockContext.log.metric).toHaveBeenCalledWith(
        'user.registration.count',
        1,
        { parish: 'kingston' }
      );
    });
  });

  describe('trackIncidentReport', () => {
    it('should track incident reporting events', () => {
      telemetryService.trackIncidentReport('flood', 'st_andrew', 'high', false, mockContext);

      expect(mockContext.log.info).toHaveBeenCalledWith(
        'EVENT: incident.reported',
        {
          properties: { type: 'flood', parish: 'st_andrew', severity: 'high', anonymous: 'false' },
          measurements: undefined
        }
      );
      expect(mockContext.log.metric).toHaveBeenCalledWith(
        'incident.report.count',
        1,
        { type: 'flood', parish: 'st_andrew' }
      );
    });
  });

  describe('trackWeatherCheck', () => {
    it('should track weather monitoring events', () => {
      telemetryService.trackWeatherCheck('kingston', true, true, mockContext);

      expect(mockContext.log.info).toHaveBeenCalledWith(
        'EVENT: weather.checked',
        {
          properties: { parish: 'kingston', alertTriggered: 'true', thresholdExceeded: 'true' },
          measurements: undefined
        }
      );
      expect(mockContext.log.metric).toHaveBeenCalledWith(
        'weather.alert.triggered',
        1,
        { parish: 'kingston' }
      );
    });

    it('should not log alert metric when no alert is triggered', () => {
      telemetryService.trackWeatherCheck('kingston', false, false, mockContext);

      expect(mockContext.log.info).toHaveBeenCalledWith(
        'EVENT: weather.checked',
        {
          properties: { parish: 'kingston', alertTriggered: 'false', thresholdExceeded: 'false' },
          measurements: undefined
        }
      );
      expect(mockContext.log.metric).not.toHaveBeenCalledWith(
        'weather.alert.triggered',
        expect.any(Number),
        expect.any(Object)
      );
    });
  });

  describe('trackDatabaseQuery', () => {
    it('should track database query performance', () => {
      telemetryService.trackDatabaseQuery('SELECT', 'users', 500, 100, mockContext);

      expect(mockContext.log.metric).toHaveBeenCalledWith(
        'database.query.time',
        500,
        { operation: 'SELECT', table: 'users' }
      );
      expect(mockContext.log.metric).toHaveBeenCalledWith(
        'database.query.records',
        100,
        { operation: 'SELECT', table: 'users' }
      );
    });

    it('should log slow query events', () => {
      telemetryService.trackDatabaseQuery('SELECT', 'users', 2000, 100, mockContext);

      expect(mockContext.log.info).toHaveBeenCalledWith(
        'EVENT: database.slow_query',
        {
          properties: { operation: 'SELECT', table: 'users' },
          measurements: { duration: 2000, recordCount: 100 }
        }
      );
    });

    it('should work without record count', () => {
      telemetryService.trackDatabaseQuery('UPDATE', 'users', 300, undefined, mockContext);

      expect(mockContext.log.metric).toHaveBeenCalledWith(
        'database.query.time',
        300,
        { operation: 'UPDATE', table: 'users' }
      );
      expect(mockContext.log.metric).not.toHaveBeenCalledWith(
        'database.query.records',
        expect.any(Number),
        expect.any(Object)
      );
    });
  });

  describe('trackResourceUsage', () => {
    it('should track resource usage metrics', () => {
      telemetryService.trackResourceUsage('functions', 800000, 1000000, mockContext);

      expect(mockContext.log.metric).toHaveBeenCalledWith('resource.usage.functions', 800000);
      expect(mockContext.log.metric).toHaveBeenCalledWith('resource.usage.functions.percent', 80);
    });

    it('should log high usage events', () => {
      telemetryService.trackResourceUsage('functions', 900000, 1000000, mockContext);

      expect(mockContext.log.info).toHaveBeenCalledWith(
        'EVENT: resource.high_usage',
        {
          properties: { resourceType: 'functions', usage: '900000', limit: '1000000' },
          measurements: { usagePercent: 90 }
        }
      );
    });

    it('should not log high usage events for normal usage', () => {
      telemetryService.trackResourceUsage('functions', 500000, 1000000, mockContext);

      expect(mockContext.log.info).not.toHaveBeenCalledWith(
        'EVENT: resource.high_usage',
        expect.any(Object)
      );
    });
  });

  describe('trackError', () => {
    it('should track error metrics', () => {
      telemetryService.trackError('validation', 'user-service', true, mockContext);

      expect(mockContext.log.metric).toHaveBeenCalledWith(
        'error.count',
        1,
        { type: 'validation', service: 'user-service', critical: 'true' }
      );
      expect(mockContext.log.info).toHaveBeenCalledWith(
        'EVENT: error.occurred',
        {
          properties: { type: 'validation', service: 'user-service', critical: 'true' },
          measurements: undefined
        }
      );
    });
  });

  describe('trackDependency', () => {
    it('should track successful dependency calls', () => {
      const startTime = new Date();
      telemetryService.trackDependency('weather-api', 'GET /weather', startTime, 1500, true, mockContext);

      expect(mockContext.log.metric).toHaveBeenCalledWith(
        'dependency.duration',
        1500,
        { name: 'weather-api', command: 'GET /weather', success: 'true' }
      );
      expect(mockContext.log.info).toHaveBeenCalledWith(
        'EVENT: dependency.call',
        {
          properties: { name: 'weather-api', command: 'GET /weather', success: 'true' },
          measurements: { duration: 1500 }
        }
      );
    });

    it('should track failed dependency calls', () => {
      const startTime = new Date();
      telemetryService.trackDependency('weather-api', 'GET /weather', startTime, 5000, false, mockContext);

      expect(mockContext.log.info).toHaveBeenCalledWith(
        'EVENT: dependency.failure',
        {
          properties: { name: 'weather-api', command: 'GET /weather' },
          measurements: { duration: 5000 }
        }
      );
    });
  });
});

describe('trackPerformance decorator', () => {
  let mockContext: InvocationContext;

  beforeEach(() => {
    mockContext = {
      log: {
        info: jest.fn(),
        error: jest.fn(),
        metric: jest.fn()
      }
    } as any;

    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should track method execution time', async () => {
    class TestService {
      @trackPerformance('test.method.duration')
      async testMethod(context: InvocationContext): Promise<string> {
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'success';
      }
    }

    const service = new TestService();
    const result = await service.testMethod(mockContext);

    expect(result).toBe('success');
    expect(mockContext.log.metric).toHaveBeenCalledWith(
      'test.method.duration',
      expect.any(Number),
      expect.any(Object)
    );
  });

  it('should track method execution time on error', async () => {
    class TestService {
      @trackPerformance('test.method.duration')
      async testMethod(context: InvocationContext): Promise<string> {
        throw new Error('Test error');
      }
    }

    const service = new TestService();
    
    await expect(service.testMethod(mockContext)).rejects.toThrow('Test error');

    expect(mockContext.log.metric).toHaveBeenCalledWith(
      'test.method.duration.error',
      expect.any(Number),
      expect.any(Object)
    );
    expect(mockContext.log.error).toHaveBeenCalledWith(
      'EXCEPTION:',
      expect.any(Error),
      { method: 'TestService.testMethod' }
    );
  });

  it('should work without context parameter', async () => {
    class TestService {
      @trackPerformance('test.method.duration')
      async testMethod(): Promise<string> {
        return 'success';
      }
    }

    const service = new TestService();
    const result = await service.testMethod();

    expect(result).toBe('success');
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('METRIC: test.method.duration'),
      expect.any(Number),
      expect.any(Object)
    );
  });
});