import { app, InvocationContext, Timer } from '@azure/functions';
import { monitoringService } from '../services/monitoring.service';

export async function dailyCleanup(myTimer: Timer, context: InvocationContext): Promise<void> {
  try {
    context.log.info('Daily cleanup started');

    // Perform data cleanup
    await monitoringService.cleanupOldData(context);

    // Optimize database queries
    await monitoringService.optimizeDatabaseQueries(context);

    // Generate daily health report
    const health = await monitoringService.checkSystemHealth(context);
    const performanceMetrics = await monitoringService.collectPerformanceMetrics(context);
    const usageMetrics = await monitoringService.collectUsageMetrics(context);

    // Send daily report to administrators
    const reportHtml = `
      <h2>JamAlert Daily System Report</h2>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      
      <h3>System Health</h3>
      <p><strong>Overall Status:</strong> ${health.overall.toUpperCase()}</p>
      <p><strong>Uptime:</strong> ${Math.round(health.uptime / (1000 * 60 * 60))} hours</p>
      
      <h4>Service Status:</h4>
      <ul>
        ${health.checks.map(check => 
          `<li><strong>${check.service}:</strong> ${check.status} ${check.responseTime ? `(${check.responseTime}ms)` : ''}</li>`
        ).join('')}
      </ul>

      <h3>Performance Metrics</h3>
      <ul>
        <li><strong>Average Alert Delivery Time:</strong> ${Math.round(performanceMetrics.alertDeliveryTime.average)}ms</li>
        <li><strong>95th Percentile Delivery Time:</strong> ${Math.round(performanceMetrics.alertDeliveryTime.p95)}ms</li>
        <li><strong>Error Rate:</strong> ${performanceMetrics.errorRates.overall.toFixed(2)}%</li>
      </ul>

      <h3>Usage Statistics</h3>
      <ul>
        <li><strong>Total Users:</strong> ${usageMetrics.totalUsers}</li>
        <li><strong>Active Users (30 days):</strong> ${usageMetrics.activeUsers}</li>
        <li><strong>Alerts Sent (30 days):</strong> ${usageMetrics.alertsSent}</li>
        <li><strong>Incident Reports (30 days):</strong> ${usageMetrics.incidentReports}</li>
        <li><strong>Function Executions (30 days):</strong> ${usageMetrics.functionExecutions}</li>
      </ul>

      <hr>
      <p><small>This is an automated daily report from JamAlert monitoring system.</small></p>
    `;

    await monitoringService.alertAdministrators(
      'Daily System Report',
      reportHtml,
      context
    );

    context.log.info('Daily cleanup completed successfully');

  } catch (error) {
    context.log.error('Daily cleanup failed:', error);
    
    // Alert administrators about cleanup failure
    try {
      await monitoringService.alertAdministrators(
        'Daily Cleanup Failure',
        `Daily cleanup function failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context
      );
    } catch (alertError) {
      context.log.error('Failed to send cleanup failure alert:', alertError);
    }
  }
}

// Run daily at 2 AM UTC
app.timer('daily-cleanup', {
  schedule: '0 0 2 * * *',
  handler: dailyCleanup
});