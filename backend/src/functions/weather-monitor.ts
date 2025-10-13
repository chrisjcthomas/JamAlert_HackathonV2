// @ts-nocheck
import { app, InvocationContext, Timer } from '@azure/functions';
import { WeatherService } from '../services/weather.service';
import { getWeatherConfig } from '../lib/config';
import { telemetryService } from '../lib/telemetry';
import { monitoringService } from '../services/monitoring.service';

/**
 * Scheduled function that monitors weather conditions every 15 minutes
 * and triggers alerts when thresholds are exceeded
 */
export async function weatherMonitor(myTimer: Timer, context: InvocationContext): Promise<void> {
  const startTime = Date.now();
  context.log('Weather monitoring function started', { timestamp: new Date().toISOString() });

  // Track function execution start
  telemetryService.logEvent('weather.monitoring.started', undefined, undefined, context);

  try {
    const weatherService = new WeatherService();
    const config = getWeatherConfig();

    // Step 1: Fetch current weather data for all parishes
    context.log('Fetching weather data for all parishes...');
    const fetchStartTime = Date.now();
    const weatherData = await weatherService.fetchAllWeatherData();
    const fetchDuration = Date.now() - fetchStartTime;
    
    // Track weather API performance
    telemetryService.logMetric('weather.api.fetch_duration', fetchDuration, undefined, context);
    telemetryService.logMetric('weather.api.parishes_fetched', weatherData.length, undefined, context);
    
    if (weatherData.length === 0) {
      context.warn('No weather data retrieved - all API calls failed');
      telemetryService.trackError('weather_fetch_failed', 'weather-monitor', true, context);
      await monitoringService.alertAdministrators(
        'Weather Data Fetch Failed',
        'All weather API calls failed. Weather monitoring is not functioning.',
        context
      );
      return;
    }

    context.log(`Successfully fetched weather data for ${weatherData.length} parishes`);

    // Step 2: Store weather data in database with TTL
    context.log('Storing weather data in database...');
    await weatherService.storeWeatherData(weatherData);

    // Step 3: Check thresholds for all parishes
    context.log('Checking weather thresholds...');
    const thresholdChecks = await weatherService.checkThresholds(weatherData);
    
    const exceededCount = thresholdChecks.filter(check => check.exceeded).length;
    context.log(`Threshold checks completed: ${exceededCount} parishes exceeded thresholds`);

    // Track threshold monitoring
    telemetryService.logMetric('weather.thresholds.checked', thresholdChecks.length, undefined, context);
    telemetryService.logMetric('weather.thresholds.exceeded', exceededCount, undefined, context);
    
    // Track individual parish threshold checks
    for (const check of thresholdChecks) {
      telemetryService.trackWeatherCheck(check.parish, check.exceeded, check.exceeded, context);
    }

    // Step 4: Create weather alert records for threshold violations
    if (exceededCount > 0) {
      context.log('Creating weather alerts for threshold violations...');
      const alertIds = await weatherService.createWeatherAlerts(thresholdChecks);
      
      if (alertIds.length > 0) {
        context.log(`Created ${alertIds.length} weather alerts`, { alertIds });
        
        // Track weather alerts created
        telemetryService.logMetric('weather.alerts.created', alertIds.length, undefined, context);
        telemetryService.logEvent('weather.alerts.triggered', {
          alertCount: alertIds.length.toString(),
          parishes: thresholdChecks.filter(c => c.exceeded).map(c => c.parish).join(',')
        }, undefined, context);
        
        // Step 5: Trigger alert dispatch (this would call the alert dispatch function)
        // Note: In a real implementation, this would trigger the alert dispatch function
        // For now, we'll log the alerts that should be dispatched
        const exceededChecks = thresholdChecks.filter(check => check.exceeded);
        for (const check of exceededChecks) {
          context.log('Weather alert should be dispatched', {
            parish: check.parish,
            alertType: check.alertType,
            severity: check.severity,
            conditions: check.actual
          });
          
          // Track individual alert triggers
          telemetryService.logEvent('weather.alert.individual', {
            parish: check.parish,
            alertType: check.alertType,
            severity: check.severity
          }, check.actual, context);
        }
      }
    }

    // Step 6: Clean up expired weather data
    context.log('Cleaning up expired weather data...');
    const cleanedCount = await weatherService.cleanupExpiredData();
    if (cleanedCount > 0) {
      context.log(`Cleaned up ${cleanedCount} expired weather records`);
    }

    const executionTime = Date.now() - startTime;
    
    // Log performance metrics
    await monitoringService.logMetric('weather.monitoring.execution_time', executionTime, context);
    await monitoringService.logMetric('weather.monitoring.parishes_processed', weatherData.length, context);
    await monitoringService.logMetric('weather.monitoring.threshold_violations', exceededCount, context);
    
    // Track successful completion
    telemetryService.logEvent('weather.monitoring.completed', {
      parishesProcessed: weatherData.length.toString(),
      thresholdViolations: exceededCount.toString(),
      alertsCreated: (exceededCount > 0 ? thresholdChecks.filter(check => check.exceeded).length : 0).toString()
    }, {
      executionTime,
      recordsCleaned: cleanedCount
    }, context);
    
    context.log('Weather monitoring completed successfully', {
      executionTimeMs: executionTime,
      parishesProcessed: weatherData.length,
      thresholdViolations: exceededCount,
      alertsCreated: exceededCount > 0 ? thresholdChecks.filter(check => check.exceeded).length : 0,
      recordsCleaned: cleanedCount
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // Track error metrics
    telemetryService.trackError('weather_monitoring', 'weather-monitor', true, context);
    telemetryService.logException(error as Error, { executionTime }, context);
    
    // Alert administrators
    await monitoringService.alertAdministrators(
      'Weather Monitoring Function Failed',
      `Weather monitoring function failed after ${executionTime}ms with error: ${error instanceof Error ? error.message : String(error)}`,
      context
    );
    
    context.error('Weather monitoring failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      executionTimeMs: executionTime
    });
    
    throw error;
  }
}

// Register the timer function to run every 15 minutes
app.timer('weatherMonitor', {
  schedule: '0 */15 * * * *', // Every 15 minutes
  handler: weatherMonitor,
  runOnStartup: false // Set to true for testing
});