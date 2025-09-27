import { HttpRequest, InvocationContext } from '@azure/functions';
import { alertsAllClear } from '../alerts-all-clear';
import { authenticateAdmin } from '../../middleware/auth.middleware';
import { NotificationService } from '../../services/notification.service';
import { UserService } from '../../services/user.service';
import { AlertService } from '../../services/alert.service';
import { Parish, AlertType, Severity } from '@prisma/client';

// Mock dependencies
jest.mock('../../middleware/auth.middleware');
jest.mock('../../services/notification.service');
jest.mock('../../services/user.service');
jest.mock('../../services/alert.service');

describe('alerts-all-clear Function', () => {
  let mockContext: InvocationContext;
  let mockRequest: HttpRequest;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockUserService: jest.Mocked<UserService>;
  let mockAlertService: jest.Mocked<AlertService>;

  const mockAdmin = {
    id: 'admin-1',
    email: 'admin@jamalert.com',
    name: 'Admin User',
    role: 'admin' as any,
    isActive: true,
    createdAt: new Date(),
    lastLogin: new Date()
  };

  const mockAlert = {
    id: 'alert-123',
    type: AlertType.FLOOD,
    severity: Severity.HIGH,
    title: 'Flood Warning',
    message: 'Heavy flooding in Kingston',
    parishes: [Parish.KINGSTON],
    createdBy: 'admin-1',
    createdAt: new Date(),
    expiresAt: null,
    deliveryStatus: 'COMPLETED' as any,
    recipientCount: 100,
    deliveredCount: 95,
    failedCount: 5
  };

  const mockUsers = [
    {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '8761234567',
      parish: Parish.KINGSTON,
      emailAlerts: true,
      smsAlerts: true,
      isActive: true
    },
    {
      id: 'user-2',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      phone: '8767654321',
      parish: Parish.KINGSTON,
      emailAlerts: true,
      smsAlerts: false,
      isActive: true
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      log: jest.fn(),
      executionContext: {
        invocationId: 'test-invocation',
        functionName: 'alerts-all-clear',
        functionDirectory: '/test'
      }
    } as any;

    mockRequest = {
      json: jest.fn(),
      headers: new Map([['authorization', 'Bearer test-token']])
    } as any;

    // Setup service mocks
    mockNotificationService = {
      sendAllClearNotification: jest.fn().mockResolvedValue({
        totalRecipients: 2,
        successCount: 2,
        failureCount: 0,
        results: [],
        deliveryStats: {
          email: { sent: 2, failed: 0 },
          sms: { sent: 1, failed: 0 },
          push: { sent: 2, failed: 0 }
        }
      }),
      close: jest.fn().mockResolvedValue(undefined)
    } as any;

    mockUserService = {
      getUsersByParishes: jest.fn().mockResolvedValue(mockUsers),
      getUsersWhoReceivedAlert: jest.fn().mockResolvedValue(mockUsers)
    } as any;

    mockAlertService = {
      getAlertById: jest.fn().mockResolvedValue(mockAlert),
      logAdminAction: jest.fn().mockResolvedValue(undefined)
    } as any;

    // Setup constructor mocks
    (NotificationService as jest.MockedClass<typeof NotificationService>).mockImplementation(() => mockNotificationService);
    (UserService as jest.MockedClass<typeof UserService>).mockImplementation(() => mockUserService);
    (AlertService as jest.MockedClass<typeof AlertService>).mockImplementation(() => mockAlertService);

    (authenticateAdmin as jest.MockedFunction<typeof authenticateAdmin>).mockResolvedValue(mockAdmin);
  });

  describe('Authentication', () => {
    test('should require admin authentication', async () => {
      (authenticateAdmin as jest.MockedFunction<typeof authenticateAdmin>).mockResolvedValue(null);

      const response = await alertsAllClear(mockRequest, mockContext);

      expect(response.status).toBe(401);
      expect(response.jsonBody).toEqual({
        success: false,
        error: 'Authentication required'
      });
    });
  });

  describe('Request Validation', () => {
    test('should validate required fields', async () => {
      mockRequest.json = jest.fn().mockResolvedValue({
        // Missing required fields
      });

      const response = await alertsAllClear(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody).toMatchObject({
        success: false,
        error: 'Invalid request data'
      });
    });

    test('should validate parish array', async () => {
      mockRequest.json = jest.fn().mockResolvedValue({
        originalAlertId: 'alert-123',
        parishes: [], // Empty array
        message: 'All clear message'
      });

      const response = await alertsAllClear(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody).toMatchObject({
        success: false,
        error: 'Invalid request data'
      });
    });

    test('should validate message length', async () => {
      mockRequest.json = jest.fn().mockResolvedValue({
        originalAlertId: 'alert-123',
        parishes: [Parish.KINGSTON],
        message: 'Short' // Too short
      });

      const response = await alertsAllClear(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody).toMatchObject({
        success: false,
        error: 'Invalid request data'
      });
    });
  });

  describe('Alert Processing', () => {
    test('should send all clear notification successfully', async () => {
      mockRequest.json = jest.fn().mockResolvedValue({
        originalAlertId: 'alert-123',
        parishes: [Parish.KINGSTON],
        message: 'Flood conditions have improved. Normal activities may resume with caution.',
        sendToAllUsers: false
      });

      const response = await alertsAllClear(mockRequest, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        success: true,
        data: {
          alertId: 'clear-alert-123',
          recipientCount: 2,
          successCount: 2,
          failureCount: 0,
          deliveryStats: {
            email: { sent: 2, failed: 0 },
            sms: { sent: 1, failed: 0 },
            push: { sent: 2, failed: 0 }
          }
        }
      });

      expect(mockAlertService.getAlertById).toHaveBeenCalledWith('alert-123');
      expect(mockUserService.getUsersWhoReceivedAlert).toHaveBeenCalledWith('alert-123');
      expect(mockNotificationService.sendAllClearNotification).toHaveBeenCalledWith(
        mockUsers,
        mockAlert,
        'Flood conditions have improved. Normal activities may resume with caution.'
      );
    });

    test('should handle original alert not found', async () => {
      mockRequest.json = jest.fn().mockResolvedValue({
        originalAlertId: 'nonexistent-alert',
        parishes: [Parish.KINGSTON],
        message: 'All clear message'
      });

      mockAlertService.getAlertById.mockResolvedValue(null);

      const response = await alertsAllClear(mockRequest, mockContext);

      expect(response.status).toBe(404);
      expect(response.jsonBody).toEqual({
        success: false,
        error: 'Original alert not found'
      });
    });

    test('should handle no users found', async () => {
      mockRequest.json = jest.fn().mockResolvedValue({
        originalAlertId: 'alert-123',
        parishes: [Parish.KINGSTON],
        message: 'All clear message'
      });

      mockUserService.getUsersWhoReceivedAlert.mockResolvedValue([]);

      const response = await alertsAllClear(mockRequest, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody).toEqual({
        success: false,
        error: 'No users found to notify'
      });
    });
  });

  describe('User Selection', () => {
    test('should send to users who received original alert by default', async () => {
      mockRequest.json = jest.fn().mockResolvedValue({
        originalAlertId: 'alert-123',
        parishes: [Parish.KINGSTON],
        message: 'All clear message',
        sendToAllUsers: false
      });

      await alertsAllClear(mockRequest, mockContext);

      expect(mockUserService.getUsersWhoReceivedAlert).toHaveBeenCalledWith('alert-123');
      expect(mockUserService.getUsersByParishes).not.toHaveBeenCalled();
    });

    test('should send to all users in parishes when requested', async () => {
      mockRequest.json = jest.fn().mockResolvedValue({
        originalAlertId: 'alert-123',
        parishes: [Parish.KINGSTON, Parish.ST_ANDREW],
        message: 'All clear message',
        sendToAllUsers: true
      });

      await alertsAllClear(mockRequest, mockContext);

      expect(mockUserService.getUsersByParishes).toHaveBeenCalledWith([Parish.KINGSTON, Parish.ST_ANDREW]);
      expect(mockUserService.getUsersWhoReceivedAlert).not.toHaveBeenCalled();
    });
  });

  describe('Audit Logging', () => {
    test('should log admin action', async () => {
      mockRequest.json = jest.fn().mockResolvedValue({
        originalAlertId: 'alert-123',
        parishes: [Parish.KINGSTON],
        message: 'All clear message'
      });

      await alertsAllClear(mockRequest, mockContext);

      expect(mockAlertService.logAdminAction).toHaveBeenCalledWith(
        'admin-1',
        'SEND_ALL_CLEAR',
        'alert',
        'alert-123',
        {
          parishes: [Parish.KINGSTON],
          recipientCount: 2,
          message: 'All clear message'
        }
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle notification service failures', async () => {
      mockRequest.json = jest.fn().mockResolvedValue({
        originalAlertId: 'alert-123',
        parishes: [Parish.KINGSTON],
        message: 'All clear message'
      });

      mockNotificationService.sendAllClearNotification.mockRejectedValue(new Error('Service unavailable'));

      const response = await alertsAllClear(mockRequest, mockContext);

      expect(response.status).toBe(500);
      expect(response.jsonBody).toEqual({
        success: false,
        error: 'Failed to send all clear notification'
      });
    });

    test('should handle user service failures', async () => {
      mockRequest.json = jest.fn().mockResolvedValue({
        originalAlertId: 'alert-123',
        parishes: [Parish.KINGSTON],
        message: 'All clear message'
      });

      mockUserService.getUsersWhoReceivedAlert.mockRejectedValue(new Error('Database error'));

      const response = await alertsAllClear(mockRequest, mockContext);

      expect(response.status).toBe(500);
      expect(response.jsonBody).toEqual({
        success: false,
        error: 'Failed to send all clear notification'
      });
    });

    test('should ensure services are closed on error', async () => {
      mockRequest.json = jest.fn().mockResolvedValue({
        originalAlertId: 'alert-123',
        parishes: [Parish.KINGSTON],
        message: 'All clear message'
      });

      mockNotificationService.sendAllClearNotification.mockRejectedValue(new Error('Service error'));

      await alertsAllClear(mockRequest, mockContext);

      expect(mockNotificationService.close).toHaveBeenCalled();
    });
  });

  describe('Context Logging', () => {
    test('should log processing steps', async () => {
      mockRequest.json = jest.fn().mockResolvedValue({
        originalAlertId: 'alert-123',
        parishes: [Parish.KINGSTON],
        message: 'All clear message'
      });

      await alertsAllClear(mockRequest, mockContext);

      expect(mockContext.log).toHaveBeenCalledWith('Processing all clear notification request');
      expect(mockContext.log).toHaveBeenCalledWith('Admin admin@jamalert.com sending all clear for alert alert-123');
      expect(mockContext.log).toHaveBeenCalledWith('Sending all clear notification to 2 users');
      expect(mockContext.log).toHaveBeenCalledWith('All clear notification completed: 2/2 successful');
    });
  });
});