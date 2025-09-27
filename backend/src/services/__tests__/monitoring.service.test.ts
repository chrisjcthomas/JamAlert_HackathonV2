import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { InvocationContext } from '@azure/functions';
import { monitoringService } from '../monitoring.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client');
const mockPrisma = {
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
  user: {
    count: jest.fn()
  },
  alert: {
    count: jest.fn(),
    updateMany: jest.fn()
  },
  incidentReport: {
    count: jest.fn()
  },
  auditLog: {
    count: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn()
  },
  alertDeliveryLog: {
    findMany: jest.fn(),
    deleteMany: jest.fn()
  },
  adminUser: {
    findMany: jest.fn()
  }
};

// Mock email service
jest.mock('../email.service', () => ({
  emailService: {
    sendEmail: jest.fn()
  }
}));

// Mock fetch
global.fetch = jest.fn();

describe('MonitoringService', () => {
  let mockContext: InvocationContext;

  beforeEach(() => {
    mockContext = {
      log: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        metric: jest.fn()
      }
    } as any;

    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock Prisma instance
    (monitoringService as any).prisma = mockPrisma;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('checkSystemHealth', () => {
    it('should return healthy status when all services are working', async () => {
      // Mock successful database check
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.auditLog.count.mockResolvedValue(5);

      // Mock successful weather API check
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200
      });

      const health = await monitoringService.checkSystemHealth(mockContext);

      expect(health.overall).toBe('healthy');
      expect(health.checks).toHaveLength(4);
      expect(health.checks.find(c => c.service === 'database')?.status).toBe('healthy');
      expect(health.checks.find(c => c.service === 'weather_api')?.status).toBe('healthy');
      expect(health.checks.find(c => c.service === 'email_service')?.status).toBe('healthy');
      expect(health.checks.find(c => c.service === 'application')?.status).toBe('healthy');
    });

    it('should return degraded status when some services have issues', async () => {
      // Mock slow database response
      mockPrisma.$queryRaw.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([{ '1': 1 }]), 6000))
      );
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.auditLog.count.mockResolvedValue(5);

      // Mock weather API with auth error
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401
      });

      const health = await monitoringService.checkSystemHealth(mockContext);

      expect(health.overall).toBe('degraded');
      expect(health.checks.find(c => c.service === 'database')?.status).toBe('degraded');
      expect(health.checks.find(c => c.service === 'weather_api')?.status).toBe('degraded');
    });

    it('should return unhealthy status when critical services fail', async () => {
      // Mock database failure
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection failed'));

      // Mock weather API failure
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const health = await monitoringService.checkSystemHealth(mockContext);

      expect(health.overall).toBe('unhealthy');
      expect(health.checks.find(c => c.service === 'database')?.status).toBe('unhealthy');
      expect(health.checks.find(c => c.service === 'weather_api')?.status).toBe('unhealthy');
    });

    it('should detect high error rates in application health', async () => {
      // Mock database success
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);
      mockPrisma.user.count.mockResolvedValue(100);
      
      // Mock high error count
      mockPrisma.auditLog.count.mockResolvedValue(15);

      // Mock other services as healthy
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200
      });

      const health = await monitoringService.checkSystemHealth(mockContext);

      expect(health.overall).toBe('degraded');
      expect(health.checks.find(c => c.service === 'application')?.status).toBe('degraded');
      expect(health.checks.find(c => c.service === 'application')?.details?.warning).toBe('High error rate');
    });
  });

  describe('collectPerformanceMetrics', () => {
    it('should collect alert delivery metrics', async () => {
      const mockDeliveryLogs = [
        {
          sentAt: new Date('2024-01-01T10:00:00Z'),
          deliveredAt: new Date('2024-01-01T10:00:05Z') // 5 second delivery
        },
        {
          sentAt: new Date('2024-01-01T10:01:00Z'),
          deliveredAt: new Date('2024-01-01T10:01:03Z') // 3 second delivery
        },
        {
          sentAt: new Date('2024-01-01T10:02:00Z'),
          deliveredAt: new Date('2024-01-01T10:02:10Z') // 10 second delivery
        }
      ];

      mockPrisma.alertDeliveryLog.findMany.mockResolvedValue(mockDeliveryLogs);
      mockPrisma.auditLog.count
        .mockResolvedValueOnce(1000) // total requests
        .mockResolvedValueOnce(50);  // error requests

      const metrics = await monitoringService.collectPerformanceMetrics(mockContext);

      expect(metrics.alertDeliveryTime.average).toBe(6000); // (5000 + 3000 + 10000) / 3
      expect(metrics.alertDeliveryTime.p95).toBe(10000);
      expect(metrics.alertDeliveryTime.p99).toBe(10000);
      expect(metrics.errorRates.overall).toBe(5); // 50/1000 * 100
    });

    it('should handle empty delivery logs', async () => {
      mockPrisma.alertDeliveryLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count
        .mockResolvedValueOnce(0) // total requests
        .mockResolvedValueOnce(0); // error requests

      const metrics = await monitoringService.collectPerformanceMetrics(mockContext);

      expect(metrics.alertDeliveryTime.average).toBe(0);
      expect(metrics.alertDeliveryTime.p95).toBe(0);
      expect(metrics.alertDeliveryTime.p99).toBe(0);
      expect(metrics.errorRates.overall).toBe(0);
    });
  });

  describe('collectUsageMetrics', () => {
    it('should collect comprehensive usage statistics', async () => {
      mockPrisma.user.count
        .mockResolvedValueOnce(1000) // total users
        .mockResolvedValueOnce(750);  // active users

      mockPrisma.alert.count.mockResolvedValue(50);
      mockPrisma.incidentReport.count.mockResolvedValue(25);
      mockPrisma.auditLog.count.mockResolvedValue(5000);

      const usage = await monitoringService.collectUsageMetrics(mockContext);

      expect(usage.totalUsers).toBe(1000);
      expect(usage.activeUsers).toBe(750);
      expect(usage.alertsSent).toBe(50);
      expect(usage.incidentReports).toBe(25);
      expect(usage.functionExecutions).toBe(5000);
      expect(usage.databaseQueries).toBe(10000); // functionExecutions * 2
    });
  });

  describe('logMetric', () => {
    it('should log metrics to Application Insights and database', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({});

      await monitoringService.logMetric('test.metric', 42, mockContext);

      expect(mockContext.log.metric).toHaveBeenCalledWith('test.metric', 42);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'METRIC',
          details: JSON.stringify({ metric: 'test.metric', value: 42 }),
          createdAt: expect.any(Date)
        }
      });
    });

    it('should handle logging errors gracefully', async () => {
      mockPrisma.auditLog.create.mockRejectedValue(new Error('Database error'));

      await expect(monitoringService.logMetric('test.metric', 42, mockContext))
        .resolves.not.toThrow();

      expect(mockContext.log.error).toHaveBeenCalledWith(
        'Failed to log metric:',
        expect.any(Error)
      );
    });
  });

  describe('alertAdministrators', () => {
    it('should send alerts to all active administrators', async () => {
      const mockAdmins = [
        { email: 'admin1@test.com', name: 'Admin One' },
        { email: 'admin2@test.com', name: 'Admin Two' }
      ];

      mockPrisma.adminUser.findMany.mockResolvedValue(mockAdmins);

      const { emailService } = require('../email.service');
      emailService.sendEmail.mockResolvedValue(true);

      await monitoringService.alertAdministrators(
        'Test Alert',
        'This is a test message',
        mockContext
      );

      expect(emailService.sendEmail).toHaveBeenCalledTimes(2);
      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: 'admin1@test.com',
        subject: '[JamAlert System Alert] Test Alert',
        html: expect.stringContaining('Hello Admin One')
      });
      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: 'admin2@test.com',
        subject: '[JamAlert System Alert] Test Alert',
        html: expect.stringContaining('Hello Admin Two')
      });
    });
  });

  describe('checkFreeTierLimits', () => {
    it('should alert when function execution limit is exceeded', async () => {
      // Mock high usage
      mockPrisma.user.count.mockResolvedValue(1000);
      mockPrisma.user.count.mockResolvedValue(800);
      mockPrisma.alert.count.mockResolvedValue(100);
      mockPrisma.incidentReport.count.mockResolvedValue(50);
      mockPrisma.auditLog.count.mockResolvedValue(900000); // 90% of 1M limit

      mockPrisma.adminUser.findMany.mockResolvedValue([
        { email: 'admin@test.com', name: 'Admin' }
      ]);

      const { emailService } = require('../email.service');
      emailService.sendEmail.mockResolvedValue(true);

      await monitoringService.checkFreeTierLimits(mockContext);

      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: 'admin@test.com',
        subject: '[JamAlert System Alert] Azure Free Tier Limit Warning',
        html: expect.stringContaining('90.0% of monthly limit')
      });
    });

    it('should not alert when usage is within limits', async () => {
      // Mock normal usage
      mockPrisma.user.count.mockResolvedValue(1000);
      mockPrisma.user.count.mockResolvedValue(800);
      mockPrisma.alert.count.mockResolvedValue(100);
      mockPrisma.incidentReport.count.mockResolvedValue(50);
      mockPrisma.auditLog.count.mockResolvedValue(100000); // 10% of 1M limit

      const { emailService } = require('../email.service');
      emailService.sendEmail.mockResolvedValue(true);

      await monitoringService.checkFreeTierLimits(mockContext);

      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('cleanupOldData', () => {
    it('should archive old alerts and clean up logs', async () => {
      mockPrisma.alert.updateMany.mockResolvedValue({ count: 5 });
      mockPrisma.alertDeliveryLog.deleteMany.mockResolvedValue({ count: 100 });
      mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 200 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await monitoringService.cleanupOldData(mockContext);

      expect(mockPrisma.alert.updateMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: expect.any(Date) },
          deliveryStatus: 'completed'
        },
        data: {
          deliveryStatus: 'archived'
        }
      });

      expect(mockPrisma.alertDeliveryLog.deleteMany).toHaveBeenCalledWith({
        where: {
          sentAt: { lt: expect.any(Date) }
        }
      });

      expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: expect.any(Date) },
          action: { not: 'ERROR' }
        }
      });

      expect(mockContext.log.info).toHaveBeenCalledWith(
        'Data cleanup completed',
        {
          archivedAlerts: 5,
          deletedLogs: 100,
          deletedAuditLogs: 200
        }
      );
    });
  });

  describe('optimizeDatabaseQueries', () => {
    it('should analyze slow queries and update statistics', async () => {
      const mockSlowQueries = [
        {
          query_preview: 'SELECT * FROM users WHERE...',
          execution_count: 100,
          total_elapsed_time: 500000000,
          avg_elapsed_time: 5000000
        }
      ];

      mockPrisma.$queryRaw.mockResolvedValue(mockSlowQueries);
      mockPrisma.$executeRaw.mockResolvedValue(undefined);
      mockPrisma.adminUser.findMany.mockResolvedValue([
        { email: 'admin@test.com', name: 'Admin' }
      ]);

      const { emailService } = require('../email.service');
      emailService.sendEmail.mockResolvedValue(true);

      await monitoringService.optimizeDatabaseQueries(mockContext);

      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: 'admin@test.com',
        subject: '[JamAlert System Alert] Slow Database Queries Detected',
        html: expect.stringContaining('Found 1 queries with average execution time > 1 second')
      });

      expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('ANALYZE TABLE')])
      );
    });

    it('should handle database optimization errors gracefully', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Not supported'));

      await expect(monitoringService.optimizeDatabaseQueries(mockContext))
        .resolves.not.toThrow();

      expect(mockContext.log.warn).toHaveBeenCalledWith(
        'Database optimization failed (may not be supported):',
        expect.any(Error)
      );
    });
  });
});