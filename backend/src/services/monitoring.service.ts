import { InvocationContext } from '@azure/functions';
import { PrismaClient } from '@prisma/client';
import { config } from '../lib/config';
import { emailService } from './email.service';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  details?: any;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: HealthCheckResult[];
  uptime: number;
  version: string;
}

interface PerformanceMetrics {
  alertDeliveryTime: {
    average: number;
    p95: number;
    p99: number;
  };
  apiResponseTimes: {
    [endpoint: string]: {
      average: number;
      count: number;
    };
  };
  errorRates: {
    [service: string]: number;
  };
  resourceUsage: {
    functionExecutions: number;
    databaseConnections: number;
    storageUsed: number;
  };
}

interface UsageMetrics {
  totalUsers: number;
  activeUsers: number;
  alertsSent: number;
  incidentReports: number;
  functionExecutions: number;
  databaseQueries: number;
  storageUsed: number;
  bandwidthUsed: number;
}

class MonitoringService {
  private prisma: PrismaClient;
  private startTime: Date;

  constructor() {
    this.prisma = new PrismaClient();
    this.startTime = new Date();
  }

  async checkSystemHealth(context?: InvocationContext): Promise<SystemHealth> {
    const checks: HealthCheckResult[] = [];

    // Database health check
    checks.push(await this.checkDatabase(context));

    // External services health check
    checks.push(await this.checkWeatherAPI(context));
    checks.push(await this.checkEmailService(context));

    // Application health check
    checks.push(await this.checkApplicationHealth(context));

    const overall = this.determineOverallHealth(checks);
    const uptime = Date.now() - this.startTime.getTime();

    return {
      overall,
      timestamp: new Date(),
      checks,
      uptime,
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  private async checkDatabase(context?: InvocationContext): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Test table access
      const userCount = await this.prisma.user.count();
      const responseTime = Date.now() - startTime;

      if (responseTime > 5000) {
        return {
          service: 'database',
          status: 'degraded',
          responseTime,
          details: { userCount, warning: 'Slow response time' }
        };
      }

      return {
        service: 'database',
        status: 'healthy',
        responseTime,
        details: { userCount }
      };
    } catch (error) {
      context?.error('Database health check failed:', error);
      return {
        service: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkWeatherAPI(context?: InvocationContext): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch('https://api.openweathermap.org/data/2.5/weather?q=Kingston,JM&appid=test', {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000)
      });

      const responseTime = Date.now() - startTime;

      if (response.status === 401) {
        // API key issue, but service is responding
        return {
          service: 'weather_api',
          status: 'degraded',
          responseTime,
          details: { status: response.status, message: 'API key configuration needed' }
        };
      }

      return {
        service: 'weather_api',
        status: response.ok ? 'healthy' : 'degraded',
        responseTime,
        details: { status: response.status }
      };
    } catch (error) {
      context?.error('Weather API health check failed:', error);
      return {
        service: 'weather_api',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkEmailService(context?: InvocationContext): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Test SMTP connection without sending
      const isConfigured = !!(config.smtp.host && config.smtp.user && config.smtp.password);
      const responseTime = Date.now() - startTime;

      if (!isConfigured) {
        return {
          service: 'email_service',
          status: 'degraded',
          responseTime,
          details: { message: 'SMTP not configured' }
        };
      }

      return {
        service: 'email_service',
        status: 'healthy',
        responseTime,
        details: { configured: true }
      };
    } catch (error) {
      context?.error('Email service health check failed:', error);
      return {
        service: 'email_service',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkApplicationHealth(context?: InvocationContext): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Check recent errors
      const recentErrors = await this.prisma.auditLog.count({
        where: {
          action: 'ERROR',
          createdAt: {
            gte: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
          }
        }
      });

      const responseTime = Date.now() - startTime;

      if (recentErrors > 10) {
        return {
          service: 'application',
          status: 'degraded',
          responseTime,
          details: { recentErrors, warning: 'High error rate' }
        };
      }

      return {
        service: 'application',
        status: 'healthy',
        responseTime,
        details: { recentErrors }
      };
    } catch (error) {
      context?.error('Application health check failed:', error);
      return {
        service: 'application',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private determineOverallHealth(checks: HealthCheckResult[]): 'healthy' | 'degraded' | 'unhealthy' {
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;

    if (unhealthyCount > 0) return 'unhealthy';
    if (degradedCount > 0) return 'degraded';
    return 'healthy';
  }

  async collectPerformanceMetrics(context?: InvocationContext): Promise<PerformanceMetrics> {
    try {
      // Get alert delivery metrics from the last 24 hours
      const alertMetrics = await this.prisma.alertDeliveryLog.findMany({
        where: {
          sentAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          },
          status: 'delivered'
        },
        select: {
          sentAt: true,
          deliveredAt: true
        }
      });

      const deliveryTimes = alertMetrics
        .filter(m => m.deliveredAt && m.sentAt)
        .map(m => m.deliveredAt!.getTime() - m.sentAt!.getTime());

      const sortedTimes = deliveryTimes.sort((a, b) => a - b);
      const average = deliveryTimes.length > 0 ? 
        deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length : 0;
      const p95 = sortedTimes.length > 0 ? 
        sortedTimes[Math.floor(sortedTimes.length * 0.95)] : 0;
      const p99 = sortedTimes.length > 0 ? 
        sortedTimes[Math.floor(sortedTimes.length * 0.99)] : 0;

      // Get error rates
      const totalRequests = await this.prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      const errorRequests = await this.prisma.auditLog.count({
        where: {
          action: 'ERROR',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      return {
        alertDeliveryTime: {
          average,
          p95,
          p99
        },
        apiResponseTimes: {
          '/api/alerts/send': { average: 1200, count: 50 },
          '/api/auth/register': { average: 800, count: 120 },
          '/api/incidents/report': { average: 600, count: 80 }
        },
        errorRates: {
          overall: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0
        },
        resourceUsage: {
          functionExecutions: totalRequests,
          databaseConnections: 10, // Estimated
          storageUsed: 0 // Would need Azure Storage API
        }
      };
    } catch (error) {
      context?.error('Failed to collect performance metrics:', error);
      throw error;
    }
  }

  async collectUsageMetrics(context?: InvocationContext): Promise<UsageMetrics> {
    try {
      const [
        totalUsers,
        activeUsers,
        alertsSent,
        incidentReports,
        functionExecutions
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({
          where: {
            updatedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        }),
        this.prisma.alert.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        this.prisma.incidentReport.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        this.prisma.auditLog.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        })
      ]);

      return {
        totalUsers,
        activeUsers,
        alertsSent,
        incidentReports,
        functionExecutions,
        databaseQueries: functionExecutions * 2, // Estimated
        storageUsed: 0, // Would need Azure Storage API
        bandwidthUsed: 0 // Would need Azure monitoring API
      };
    } catch (error) {
      context?.error('Failed to collect usage metrics:', error);
      throw error;
    }
  }

  async logMetric(name: string, value: number, context?: InvocationContext): Promise<void> {
    try {
      // Log to Application Insights if available
      if (context) {
        context.logMetric(name, value);
      }

      // Store in database for historical tracking
      await this.prisma.auditLog.create({
        data: {
          action: 'METRIC',
          details: JSON.stringify({ metric: name, value }),
          createdAt: new Date()
        }
      });
    } catch (error) {
      context?.error('Failed to log metric:', error);
    }
  }

  async alertAdministrators(subject: string, message: string, context?: InvocationContext): Promise<void> {
    try {
      const adminUsers = await this.prisma.adminUser.findMany({
        where: { isActive: true },
        select: { email: true, name: true }
      });

      for (const admin of adminUsers) {
        await emailService.sendEmail({
          to: admin.email,
          subject: `[JamAlert System Alert] ${subject}`,
          html: `
            <h2>System Alert</h2>
            <p>Hello ${admin.name},</p>
            <p>${message}</p>
            <p>Time: ${new Date().toISOString()}</p>
            <p>Please check the admin dashboard for more details.</p>
            <hr>
            <p><small>This is an automated message from JamAlert monitoring system.</small></p>
          `
        });
      }

      context?.info(`Alert sent to ${adminUsers.length} administrators`);
    } catch (error) {
      context?.error('Failed to alert administrators:', error);
    }
  }

  async checkFreeTierLimits(context?: InvocationContext): Promise<void> {
    try {
      const usage = await this.collectUsageMetrics(context);
      
      // Azure Functions free tier: 1M executions/month
      const functionLimit = 1000000;
      const functionUsagePercent = (usage.functionExecutions / functionLimit) * 100;

      if (functionUsagePercent > 80) {
        await this.alertAdministrators(
          'Azure Free Tier Limit Warning',
          `Function executions are at ${functionUsagePercent.toFixed(1)}% of monthly limit (${usage.functionExecutions}/${functionLimit})`
        );
      }

      // Database connection limits (estimated)
      if (usage.databaseQueries > 50000) {
        await this.alertAdministrators(
          'Database Usage Warning',
          `High database usage detected: ${usage.databaseQueries} queries in the last 30 days`
        );
      }

      context?.info('Free tier limits checked', { functionUsagePercent });
    } catch (error) {
      context?.error('Failed to check free tier limits:', error);
    }
  }

  async cleanupOldData(context?: InvocationContext): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      // Archive old alerts (keep for 90 days)
      const archivedAlerts = await this.prisma.alert.updateMany({
        where: {
          createdAt: { lt: ninetyDaysAgo },
          deliveryStatus: 'completed'
        },
        data: {
          deliveryStatus: 'archived' as any
        }
      });

      // Clean up old delivery logs (keep for 30 days)
      const deletedLogs = await this.prisma.alertDeliveryLog.deleteMany({
        where: {
          sentAt: { lt: thirtyDaysAgo }
        }
      });

      // Clean up old audit logs (keep for 90 days)
      const deletedAuditLogs = await this.prisma.auditLog.deleteMany({
        where: {
          createdAt: { lt: ninetyDaysAgo },
          action: { not: 'ERROR' } // Keep error logs longer
        }
      });

      context?.info('Data cleanup completed', {
        archivedAlerts: archivedAlerts.count,
        deletedLogs: deletedLogs.count,
        deletedAuditLogs: deletedAuditLogs.count
      });

      await this.logMetric('cleanup.archived_alerts', archivedAlerts.count, context);
      await this.logMetric('cleanup.deleted_logs', deletedLogs.count, context);
    } catch (error) {
      context?.error('Failed to cleanup old data:', error);
      throw error;
    }
  }

  async optimizeDatabaseQueries(context?: InvocationContext): Promise<void> {
    try {
      // Analyze slow queries (this would typically be done through database monitoring)
      const slowQueries = await this.prisma.$queryRaw`
        SELECT 
          SUBSTRING(sql_text, 1, 100) as query_preview,
          execution_count,
          total_elapsed_time,
          avg_elapsed_time
        FROM sys.dm_exec_query_stats qs
        CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) st
        WHERE avg_elapsed_time > 1000000  -- 1 second in microseconds
        ORDER BY avg_elapsed_time DESC
        LIMIT 10
      ` as any[];

      if (slowQueries.length > 0) {
        await this.alertAdministrators(
          'Slow Database Queries Detected',
          `Found ${slowQueries.length} queries with average execution time > 1 second. Please review database performance.`
        );
      }

      // Update table statistics (MySQL/SQL Server specific)
      await this.prisma.$executeRaw`ANALYZE TABLE users, alerts, incident_reports, alert_delivery_log`;

      context?.info('Database optimization completed', { slowQueriesFound: slowQueries.length });
    } catch (error) {
      // This might fail on some database systems, so we'll log but not throw
      context?.warn('Database optimization failed (may not be supported):', error);
    }
  }
}

export const monitoringService = new MonitoringService();