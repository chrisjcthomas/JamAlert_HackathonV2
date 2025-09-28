import { InvocationContext } from '@azure/functions';

interface CustomTelemetry {
  name: string;
  value?: number;
  properties?: Record<string, string>;
  measurements?: Record<string, number>;
}

interface PerformanceTracker {
  start(): void;
  end(name: string, context?: InvocationContext): number;
}

class TelemetryService {
  private performanceTrackers = new Map<string, number>();

  /**
   * Log a custom metric to Application Insights
   */
  logMetric(name: string, value: number, properties?: Record<string, string>, context?: InvocationContext): void {
    try {
      if (context) {
        // Use Azure Functions built-in telemetry
        context.logMetric(name, value, properties);
      }

      // Also log to console for local development
      console.log(`METRIC: ${name} = ${value}`, properties);
    } catch (error) {
      console.error('Failed to log metric:', error);
    }
  }

  /**
   * Log a custom event to Application Insights
   */
  logEvent(name: string, properties?: Record<string, string>, measurements?: Record<string, number>, context?: InvocationContext): void {
    try {
      if (context) {
        // Use Azure Functions built-in telemetry
        context.info(`EVENT: ${name}`, { properties, measurements });
      }

      // Also log to console for local development
      console.log(`EVENT: ${name}`, { properties, measurements });
    } catch (error) {
      console.error('Failed to log event:', error);
    }
  }

  /**
   * Log an exception to Application Insights
   */
  logException(error: Error, properties?: Record<string, string>, context?: InvocationContext): void {
    try {
      if (context) {
        context.error('EXCEPTION:', error, properties);
      }

      // Also log to console for local development
      console.error('EXCEPTION:', error, properties);
    } catch (logError) {
      console.error('Failed to log exception:', logError);
    }
  }

  /**
   * Create a performance tracker for measuring execution time
   */
  createPerformanceTracker(id: string): PerformanceTracker {
    return {
      start: () => {
        this.performanceTrackers.set(id, Date.now());
      },
      end: (name: string, context?: InvocationContext) => {
        const startTime = this.performanceTrackers.get(id);
        if (!startTime) {
          console.warn(`Performance tracker ${id} was not started`);
          return 0;
        }

        const duration = Date.now() - startTime;
        this.performanceTrackers.delete(id);
        
        this.logMetric(name, duration, { trackerId: id }, context);
        return duration;
      }
    };
  }

  /**
   * Track alert delivery performance
   */
  trackAlertDelivery(alertId: string, recipientCount: number, deliveryTime: number, context?: InvocationContext): void {
    this.logMetric('alert.delivery.time', deliveryTime, { alertId }, context);
    this.logMetric('alert.delivery.recipients', recipientCount, { alertId }, context);
    this.logEvent('alert.delivered', { alertId, recipientCount: recipientCount.toString() }, { deliveryTime }, context);
  }

  /**
   * Track API endpoint performance
   */
  trackApiCall(endpoint: string, method: string, statusCode: number, duration: number, context?: InvocationContext): void {
    this.logMetric('api.response.time', duration, { endpoint, method, statusCode: statusCode.toString() }, context);
    this.logEvent('api.call', { endpoint, method, statusCode: statusCode.toString() }, { duration }, context);
  }

  /**
   * Track user registration
   */
  trackUserRegistration(parish: string, notificationPreferences: string[], context?: InvocationContext): void {
    this.logEvent('user.registered', { 
      parish, 
      preferences: notificationPreferences.join(',') 
    }, undefined, context);
    this.logMetric('user.registration.count', 1, { parish }, context);
  }

  /**
   * Track incident reporting
   */
  trackIncidentReport(incidentType: string, parish: string, severity: string, isAnonymous: boolean, context?: InvocationContext): void {
    this.logEvent('incident.reported', { 
      type: incidentType, 
      parish, 
      severity, 
      anonymous: isAnonymous.toString() 
    }, undefined, context);
    this.logMetric('incident.report.count', 1, { type: incidentType, parish }, context);
  }

  /**
   * Track weather monitoring
   */
  trackWeatherCheck(parish: string, alertTriggered: boolean, thresholdExceeded: boolean, context?: InvocationContext): void {
    this.logEvent('weather.checked', { 
      parish, 
      alertTriggered: alertTriggered.toString(),
      thresholdExceeded: thresholdExceeded.toString()
    }, undefined, context);
    
    if (alertTriggered) {
      this.logMetric('weather.alert.triggered', 1, { parish }, context);
    }
  }

  /**
   * Track database performance
   */
  trackDatabaseQuery(operation: string, table: string, duration: number, recordCount?: number, context?: InvocationContext): void {
    this.logMetric('database.query.time', duration, { operation, table }, context);
    
    if (recordCount !== undefined) {
      this.logMetric('database.query.records', recordCount, { operation, table }, context);
    }

    // Log slow queries
    if (duration > 1000) {
      this.logEvent('database.slow_query', { operation, table }, { duration, recordCount }, context);
    }
  }

  /**
   * Track system resource usage
   */
  trackResourceUsage(resourceType: string, usage: number, limit: number, context?: InvocationContext): void {
    const usagePercent = (usage / limit) * 100;
    
    this.logMetric(`resource.usage.${resourceType}`, usage, undefined, context);
    this.logMetric(`resource.usage.${resourceType}.percent`, usagePercent, undefined, context);

    // Alert if usage is high
    if (usagePercent > 80) {
      this.logEvent('resource.high_usage', { 
        resourceType, 
        usage: usage.toString(), 
        limit: limit.toString() 
      }, { usagePercent }, context);
    }
  }

  /**
   * Track error rates
   */
  trackError(errorType: string, service: string, isCritical: boolean = false, context?: InvocationContext): void {
    this.logMetric('error.count', 1, { type: errorType, service, critical: isCritical.toString() }, context);
    this.logEvent('error.occurred', { type: errorType, service, critical: isCritical.toString() }, undefined, context);
  }

  /**
   * Create a dependency tracker for external service calls
   */
  trackDependency(name: string, command: string, startTime: Date, duration: number, success: boolean, context?: InvocationContext): void {
    this.logMetric('dependency.duration', duration, { name, command, success: success.toString() }, context);
    this.logEvent('dependency.call', { name, command, success: success.toString() }, { duration }, context);

    if (!success) {
      this.logEvent('dependency.failure', { name, command }, { duration }, context);
    }
  }
}

export const telemetryService = new TelemetryService();

/**
 * Decorator for tracking function execution time
 */
export function trackPerformance(metricName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context = args.find(arg => arg && typeof arg.log === 'object') as InvocationContext | undefined;
      const tracker = telemetryService.createPerformanceTracker(`${target.constructor.name}.${propertyName}`);
      
      tracker.start();
      
      try {
        const result = await method.apply(this, args);
        tracker.end(metricName, context);
        return result;
      } catch (error) {
        tracker.end(`${metricName}.error`, context);
        telemetryService.logException(error as Error, { method: `${target.constructor.name}.${propertyName}` }, context);
        throw error;
      }
    };
  };
}