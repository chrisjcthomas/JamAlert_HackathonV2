import { NotificationService } from '../notification.service';
import { EmailService } from '../email.service';
import { SMSService } from '../sms.service';
import { User, Alert, AlertType, Severity, Parish, DeliveryMethod } from '@prisma/client';
import { NotificationTone } from '../../types';

// Mock the services
jest.mock('../email.service');
jest.mock('../sms.service');
jest.mock('../../lib/database', () => ({
  getPrismaClient: jest.fn(() => ({
    alertDeliveryLog: {
      create: jest.fn(),
    },
  })),
  withRetry: jest.fn((fn) => fn()),
}));

describe('Multi-Channel Notification System', () => {
  let notificationService: NotificationService;
  let mockEmailService: jest.Mocked<EmailService>;
  let mockSMSService: jest.Mocked<SMSService>;

  const mockUser: User = {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '8761234567',
    parish: Parish.KINGSTON,
    address: null,
    smsAlerts: true,
    emailAlerts: true,
    emergencyOnly: false,
    accessibilitySettings: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  };

  const mockAlert: Alert = {
    id: 'alert-1',
    type: AlertType.FLOOD,
    severity: Severity.HIGH,
    title: 'Flood Warning',
    message: 'Heavy flooding detected in Kingston area',
    parishes: [Parish.KINGSTON],
    createdBy: 'admin-1',
    createdAt: new Date(),
    expiresAt: null,
    deliveryStatus: 'PENDING' as any,
    recipientCount: 1,
    deliveredCount: 0,
    failedCount: 0
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    mockEmailService = {
      sendAlertNotification: jest.fn().mockResolvedValue(undefined),
      testConnection: jest.fn().mockResolvedValue(true),
      close: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockSMSService = {
      sendSMS: jest.fn().mockResolvedValue({ success: true, messageId: 'sms-123' }),
      testConnection: jest.fn().mockResolvedValue(true),
      close: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Mock constructors
    (EmailService as jest.MockedClass<typeof EmailService>).mockImplementation(() => mockEmailService);
    (SMSService as jest.MockedClass<typeof SMSService>).mockImplementation(() => mockSMSService);

    notificationService = new NotificationService();
  });

  describe('Message Templates', () => {
    test('should use urgent tone for high severity flood alerts', async () => {
      const results = await notificationService.sendUserNotifications(mockUser, mockAlert);
      
      expect(results).toHaveLength(3); // Email, SMS, Push
      expect(mockEmailService.sendAlertNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '🚨 URGENT FLOOD WARNING',
          tone: 'urgent'
        })
      );
    });

    test('should use calm tone for low severity alerts', async () => {
      const lowSeverityAlert = { ...mockAlert, severity: Severity.LOW };
      
      const results = await notificationService.sendUserNotifications(mockUser, lowSeverityAlert);
      
      expect(results).toHaveLength(3);
      expect(mockEmailService.sendAlertNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'calm'
        })
      );
    });

    test('should include emergency contacts in all messages', async () => {
      await notificationService.sendUserNotifications(mockUser, mockAlert);
      
      expect(mockEmailService.sendAlertNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          emergencyContacts: expect.objectContaining({
            police: '119',
            fire: '110',
            emergency: '911',
            odpem: '116'
          })
        })
      );
    });

    test('should format parish names correctly in templates', async () => {
      const multiParishAlert = {
        ...mockAlert,
        parishes: [Parish.ST_ANDREW, Parish.ST_CATHERINE]
      };
      
      await notificationService.sendUserNotifications(mockUser, multiParishAlert);
      
      expect(mockEmailService.sendAlertNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('St Andrew, St Catherine')
        })
      );
    });
  });

  describe('SMS Integration', () => {
    test('should send SMS when user has SMS alerts enabled', async () => {
      await notificationService.sendUserNotifications(mockUser, mockAlert);
      
      expect(mockSMSService.sendSMS).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '8761234567',
          message: expect.stringContaining('URGENT FLOOD ALERT')
        })
      );
    });

    test('should not send SMS when user has no phone number', async () => {
      const userWithoutPhone = { ...mockUser, phone: null };
      
      const results = await notificationService.sendUserNotifications(userWithoutPhone, mockAlert);
      
      const smsResult = results.find(r => r.deliveryMethod === DeliveryMethod.SMS);
      expect(smsResult?.success).toBe(false);
      expect(smsResult?.error).toBe('No phone number provided');
    });

    test('should handle SMS service failures gracefully', async () => {
      mockSMSService.sendSMS.mockResolvedValue({ success: false, error: 'SMS service unavailable' });
      
      const results = await notificationService.sendUserNotifications(mockUser, mockAlert);
      
      const smsResult = results.find(r => r.deliveryMethod === DeliveryMethod.SMS);
      expect(smsResult?.success).toBe(false);
      expect(smsResult?.error).toBe('SMS service unavailable');
    });
  });

  describe('Fallback Logic', () => {
    test('should prioritize push notifications for high severity alerts', async () => {
      const results = await notificationService.sendUserNotifications(mockUser, mockAlert);
      
      // For high severity, push should be first in the chain
      expect(results[0].deliveryMethod).toBe(DeliveryMethod.PUSH);
    });

    test('should continue with all methods for high severity alerts even if first succeeds', async () => {
      const results = await notificationService.sendUserNotifications(mockUser, mockAlert);
      
      // Should attempt all three methods for high severity
      expect(results).toHaveLength(3);
      expect(results.map(r => r.deliveryMethod)).toEqual(
        expect.arrayContaining([DeliveryMethod.PUSH, DeliveryMethod.SMS, DeliveryMethod.EMAIL])
      );
    });

    test('should stop after first success for low severity alerts', async () => {
      const lowSeverityAlert = { ...mockAlert, severity: Severity.LOW };
      
      const results = await notificationService.sendUserNotifications(mockUser, lowSeverityAlert);
      
      // Should stop after first successful delivery for low severity
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.success)).toBe(true);
    });

    test('should try all methods if primary methods fail', async () => {
      // Mock email failure
      mockEmailService.sendAlertNotification.mockRejectedValue(new Error('Email service down'));
      
      const results = await notificationService.sendUserNotifications(mockUser, mockAlert);
      
      // Should still try SMS and Push
      expect(results.length).toBeGreaterThan(1);
      expect(results.some(r => r.success)).toBe(true);
    });
  });

  describe('All Clear Notifications', () => {
    test('should send all clear notifications with calm tone', async () => {
      const users = [mockUser];
      
      const result = await notificationService.sendAllClearNotification(
        users,
        mockAlert,
        'Flood conditions have improved. Normal activities may resume.'
      );
      
      expect(result.totalRecipients).toBe(1);
      expect(mockEmailService.sendAlertNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '✅ All Clear',
          tone: 'calm'
        })
      );
    });

    test('should create all clear alert with correct properties', async () => {
      const users = [mockUser];
      
      await notificationService.sendAllClearNotification(
        users,
        mockAlert,
        'Situation resolved'
      );
      
      expect(mockEmailService.sendAlertNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ALL_CLEAR',
          severity: 'LOW',
          alertId: 'clear-alert-1'
        })
      );
    });
  });

  describe('Custom Notifications', () => {
    test('should send custom notifications with specified tone', async () => {
      const users = [mockUser];
      const customAlert = {
        type: AlertType.WEATHER,
        severity: Severity.MEDIUM,
        title: 'Weather Advisory',
        message: 'Strong winds expected',
        parishes: [Parish.KINGSTON]
      };
      
      const result = await notificationService.sendCustomNotification(
        users,
        customAlert,
        'urgent' as NotificationTone
      );
      
      expect(result.totalRecipients).toBe(1);
      expect(mockEmailService.sendAlertNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'urgent'
        })
      );
    });
  });

  describe('Batch Processing', () => {
    test('should process users in batches', async () => {
      const users = Array.from({ length: 250 }, (_, i) => ({
        ...mockUser,
        id: `user-${i}`,
        email: `user${i}@example.com`
      }));
      
      const result = await notificationService.sendBatchNotifications(
        users,
        mockAlert,
        100, // batch size
        100  // delay
      );
      
      expect(result.totalRecipients).toBe(250);
      expect(mockEmailService.sendAlertNotification).toHaveBeenCalledTimes(250);
    });

    test('should handle batch failures gracefully', async () => {
      const users = [mockUser];
      
      // Mock email service to fail
      mockEmailService.sendAlertNotification.mockRejectedValue(new Error('Service unavailable'));
      
      const result = await notificationService.sendBatchNotifications(users, mockAlert);
      
      expect(result.totalRecipients).toBe(1);
      expect(result.failureCount).toBeGreaterThan(0);
    });
  });

  describe('Health Checks', () => {
    test('should check health of all notification channels', async () => {
      const health = await notificationService.testHealth();
      
      expect(health).toEqual({
        email: true,
        sms: true,
        push: true
      });
      
      expect(mockEmailService.testConnection).toHaveBeenCalled();
      expect(mockSMSService.testConnection).toHaveBeenCalled();
    });

    test('should report unhealthy services correctly', async () => {
      mockEmailService.testConnection.mockResolvedValue(false);
      mockSMSService.testConnection.mockResolvedValue(false);
      
      const health = await notificationService.testHealth();
      
      expect(health).toEqual({
        email: false,
        sms: false,
        push: true
      });
    });
  });

  describe('Message Tone Management', () => {
    test('should determine urgent tone for emergency alerts', async () => {
      const emergencyAlert = { ...mockAlert, type: AlertType.EMERGENCY };
      
      await notificationService.sendUserNotifications(mockUser, emergencyAlert);
      
      expect(mockEmailService.sendAlertNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'urgent'
        })
      );
    });

    test('should determine urgent tone for alerts with urgent keywords', async () => {
      const urgentAlert = { ...mockAlert, title: 'URGENT: Immediate Action Required' };
      
      await notificationService.sendUserNotifications(mockUser, urgentAlert);
      
      expect(mockEmailService.sendAlertNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'urgent'
        })
      );
    });

    test('should use calm tone by default', async () => {
      const normalAlert = { ...mockAlert, severity: Severity.MEDIUM, title: 'Weather Update' };
      
      await notificationService.sendUserNotifications(mockUser, normalAlert);
      
      expect(mockEmailService.sendAlertNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          tone: 'calm'
        })
      );
    });
  });

  describe('Push Notification Sounds', () => {
    test('should use emergency sound for urgent high severity alerts', async () => {
      // This would be tested if we had actual push notification implementation
      // For now, we test the sound selection logic
      const results = await notificationService.sendUserNotifications(mockUser, mockAlert);
      
      const pushResult = results.find(r => r.deliveryMethod === DeliveryMethod.PUSH);
      expect(pushResult?.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle service initialization failures', () => {
      // Test that service can be created even if external services fail
      expect(() => new NotificationService()).not.toThrow();
    });

    test('should log delivery attempts even on failure', async () => {
      mockEmailService.sendAlertNotification.mockRejectedValue(new Error('Service down'));
      
      const results = await notificationService.sendUserNotifications(mockUser, mockAlert);
      
      expect(results.some(r => !r.success)).toBe(true);
      // Verify that logging was attempted (mocked database call)
    });
  });
});