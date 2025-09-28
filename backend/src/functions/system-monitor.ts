import { app, InvocationContext, Timer } from '@azure/functions';
import { monitoringService } from '../services/monitoring.service';

export async function systemMonitor(myTimer: Timer, context: InvocationContext): Promise<void> {
  try {
    context.info('System monitoring started');

    // Check system health
    const health = await monitoringService.checkSystemHealth(context);
    
    // Log overall health status
    await monitoringService.logMetric('system.health.overall', 
      health.overall === 'healthy' ? 1 : health.overall === 'degraded' ? 0.5 : 0, 
      context
    );

    // Alert administrators if system is unhealthy
    if (health.overall === 'unhealthy') {
      const unhealthyServices = health.checks
        .filter(check => check.status === 'unhealthy')
        .map(check => `${check.service}: ${check.error}`)
        .join(', ');

      await monitoringService.alertAdministrators(
        'System Health Alert - Unhealthy Services Detected',
        `The following services are unhealthy: ${unhealthyServices}. Please investigate immediately.`,
        context
      );
    }

    // Check free tier limits
    await monitoringService.checkFreeTierLimits(context);

    // Collect and log performance metrics
    const performanceMetrics = await monitoringService.collectPerformanceMetrics(context);
    await monitoringService.logMetric('alerts.delivery_time.average', performanceMetrics.alertDeliveryTime.average, context);
    await monitoringService.logMetric('alerts.delivery_time.p95', performanceMetrics.alertDeliveryTime.p95, context);
    await monitoringService.logMetric('system.error_rate', performanceMetrics.errorRates.overall, context);

    // Collect usage metrics
    const usageMetrics = await monitoringService.collectUsageMetrics(context);
    await monitoringService.logMetric('users.total', usageMetrics.totalUsers, context);
    await monitoringService.logMetric('users.active', usageMetrics.activeUsers, context);
    await monitoringService.logMetric('alerts.sent', usageMetrics.alertsSent, context);
    await monitoringService.logMetric('incidents.reported', usageMetrics.incidentReports, context);

    context.info('System monitoring completed', {
      overallHealth: health.overall,
      totalUsers: usageMetrics.totalUsers,
      activeUsers: usageMetrics.activeUsers,
      alertsSent: usageMetrics.alertsSent
    });

  } catch (error) {
    context.error('System monitoring failed:', error);
    
    // Try to alert administrators about monitoring failure
    try {
      await monitoringService.alertAdministrators(
        'System Monitoring Failure',
        `System monitoring function failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context
      );
    } catch (alertError) {
      context.error('Failed to send monitoring failure alert:', alertError);
    }
  }
}

// Run every 15 minutes
app.timer('system-monitor', {
  schedule: '0 */15 * * * *',
  handler: systemMonitor
});