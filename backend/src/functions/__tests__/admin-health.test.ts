import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { HttpRequest, InvocationContext } from '@azure/functions';
import { adminHealth } from '../admin-health';

// Mock dependencies
jest.mock('../middleware/auth.middleware');
jest.mock('../services/monitoring.service');

const mockAuthenticateAdmin = require('../middleware/auth.middleware').authenticateAdmin;
const mockMonitoringService = require('../services/monitoring.service').monitoringService;

describe('adminHealth', () => {
  let mockRequest: HttpRequest;
  let mockContext: InvocationContext;

  beforeEach(() => {
    mockContext = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    } as any;

    jest.clearAllMocks();
  });

  describe('GET /admin/health', () => {
    beforeEach(() => {
      mockRequest = {
        method: 'GET',
        url: 'https://test.com/api/admin/health',
        headers: new Map([['authorization', 'Bearer valid-token']])
      } as any;
    });

    it('should return system health when authenticated', async () => {
      const mockAdmin = { id: '1', email: 'admin@test.com', name: 'Admin' };
      const mockHealth = {
        overall: 'healthy',
        timestamp: new Date(),
        checks: [
          { service: 'database', status: 'healthy', responseTime: 100 },
          { service: 'weather_api', status: 'healthy', responseTime: 200 }
        ],
        uptime: 3600000,
        version: '1.0.0'
      };

      mockAuthenticateAdmin.mockResolvedValue(mockAdmin);
      mockMonitoringService.checkSystemHealth.mockResolvedValue(mockHealth);

      const response = await adminHealth(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual(mockHealth);
      expect(mockMonitoringService.checkSystemHealth).toHaveBeenCalledWith(mockContext);
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthenticateAdmin.mockResolvedValue(null);

      const response = await adminHealth(mockRequest, mockContext);

      expect(response.status).toBe(401);
      expect(response.jsonBody).toEqual({ error: 'Unauthorized' });
      expect(mockMonitoringService.checkSystemHealth).not.toHaveBeenCalled();
    });

    it('should handle monitoring service errors', async () => {
      const mockAdmin = { id: '1', email: 'admin@test.com', name: 'Admin' };
      mockAuthenticateAdmin.mockResolvedValue(mockAdmin);
      mockMonitoringService.checkSystemHealth.mockRejectedValue(new Error('Service unavailable'));

      const response = await adminHealth(mockRequest, mockContext);

      expect(response.status).toBe(500);
      expect(response.jsonBody).toEqual({
        error: 'Internal server error',
        message: 'Service unavailable'
      });
      expect(mockContext.error).toHaveBeenCalledWith(
        'Admin health check failed:',
        expect.any(Error)
      );
    });
  });

  describe('POST /admin/health', () => {
    beforeEach(() => {
      mockRequest = {
        method: 'POST',
        url: 'https://test.com/api/admin/health',
        headers: new Map([['authorization', 'Bearer valid-token']]),
        json: jest.fn()
      } as any;
    });

    it('should return performance metrics when type is performance', async () => {
      const mockAdmin = { id: '1', email: 'admin@test.com', name: 'Admin' };
      const mockMetrics = {
        alertDeliveryTime: { average: 1500, p95: 3000, p99: 5000 },
        apiResponseTimes: { '/api/alerts/send': { average: 1200, count: 50 } },
        errorRates: { overall: 2.5 },
        resourceUsage: { functionExecutions: 1000, databaseConnections: 10, storageUsed: 0 }
      };

      mockAuthenticateAdmin.mockResolvedValue(mockAdmin);
      mockRequest.json.mockResolvedValue({ type: 'performance' });
      mockMonitoringService.collectPerformanceMetrics.mockResolvedValue(mockMetrics);

      const response = await adminHealth(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual(mockMetrics);
      expect(mockMonitoringService.collectPerformanceMetrics).toHaveBeenCalledWith(mockContext);
    });

    it('should return usage metrics when type is usage', async () => {
      const mockAdmin = { id: '1', email: 'admin@test.com', name: 'Admin' };
      const mockUsage = {
        totalUsers: 1000,
        activeUsers: 750,
        alertsSent: 50,
        incidentReports: 25,
        functionExecutions: 5000,
        databaseQueries: 10000,
        storageUsed: 0,
        bandwidthUsed: 0
      };

      mockAuthenticateAdmin.mockResolvedValue(mockAdmin);
      mockRequest.json.mockResolvedValue({ type: 'usage' });
      mockMonitoringService.collectUsageMetrics.mockResolvedValue(mockUsage);

      const response = await adminHealth(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual(mockUsage);
      expect(mockMonitoringService.collectUsageMetrics).toHaveBeenCalledWith(mockContext);
    });

    it('should perform cleanup when type is cleanup', async () => {
      const mockAdmin = { id: '1', email: 'admin@test.com', name: 'Admin' };

      mockAuthenticateAdmin.mockResolvedValue(mockAdmin);
      mockRequest.json.mockResolvedValue({ type: 'cleanup' });
      mockMonitoringService.cleanupOldData.mockResolvedValue(undefined);

      const response = await adminHealth(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({ message: 'Cleanup completed successfully' });
      expect(mockMonitoringService.cleanupOldData).toHaveBeenCalledWith(mockContext);
    });

    it('should perform database optimization when type is optimize', async () => {
      const mockAdmin = { id: '1', email: 'admin@test.com', name: 'Admin' };

      mockAuthenticateAdmin.mockResolvedValue(mockAdmin);
      mockRequest.json.mockResolvedValue({ type: 'optimize' });
      mockMonitoringService.optimizeDatabaseQueries.mockResolvedValue(undefined);

      const response = await adminHealth(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({ message: 'Database optimization completed' });
      expect(mockMonitoringService.optimizeDatabaseQueries).toHaveBeenCalledWith(mockContext);
    });

    it('should return 400 for invalid request type', async () => {
      const mockAdmin = { id: '1', email: 'admin@test.com', name: 'Admin' };

      mockAuthenticateAdmin.mockResolvedValue(mockAdmin);
      mockRequest.json.mockResolvedValue({ type: 'invalid' });

      const response = await adminHealth(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody).toEqual({
        error: 'Invalid request type. Use: performance, usage, cleanup, or optimize'
      });
    });

    it('should return 401 when not authenticated', async () => {
      mockAuthenticateAdmin.mockResolvedValue(null);
      mockRequest.json.mockResolvedValue({ type: 'performance' });

      const response = await adminHealth(mockRequest, mockContext);

      expect(response.status).toBe(401);
      expect(response.jsonBody).toEqual({ error: 'Unauthorized' });
    });
  });

  describe('unsupported methods', () => {
    it('should return 405 for unsupported HTTP methods', async () => {
      mockRequest = {
        method: 'DELETE',
        url: 'https://test.com/api/admin/health',
        headers: new Map([['authorization', 'Bearer valid-token']])
      } as any;

      const mockAdmin = { id: '1', email: 'admin@test.com', name: 'Admin' };
      mockAuthenticateAdmin.mockResolvedValue(mockAdmin);

      const response = await adminHealth(mockRequest, mockContext);

      expect(response.status).toBe(405);
      expect(response.jsonBody).toEqual({ error: 'Method not allowed' });
    });
  });
});