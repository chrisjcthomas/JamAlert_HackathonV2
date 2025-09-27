import { SMSService } from '../sms.service';
import { SMSNotification } from '../../types';
import { Twilio } from 'twilio';

// Mock Twilio
jest.mock('twilio');
jest.mock('../../lib/config', () => ({
  getSMSConfig: jest.fn(() => ({
    enabled: true,
    accountSid: 'test-sid',
    authToken: 'test-token',
    fromNumber: '+18761234567',
    statusCallback: 'https://example.com/status'
  })),
  isProduction: jest.fn(() => false)
}));

describe('SMSService', () => {
  let smsService: SMSService;
  let mockTwilioClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockTwilioClient = {
      messages: {
        create: jest.fn().mockResolvedValue({
          sid: 'test-message-id',
          price: '0.05'
        }),
        list: jest.fn()
      },
      api: {
        accounts: jest.fn(() => ({
          fetch: jest.fn().mockResolvedValue({
            balance: '10.00',
            currency: 'USD'
          })
        }))
      },
      usage: {
        records: {
          list: jest.fn().mockResolvedValue([
            { category: 'sms', count: '25' }
          ])
        }
      }
    };

    (Twilio as jest.MockedClass<typeof Twilio>).mockImplementation(() => mockTwilioClient);
    
    smsService = new SMSService();
  });

  describe('SMS Sending', () => {
    const mockNotification: SMSNotification = {
      to: '8761234567',
      message: 'FLOOD ALERT: Heavy flooding in Kingston. Move to higher ground.',
      title: 'Flood Alert',
      type: 'FLOOD' as any,
      severity: 'HIGH' as any,
      alertId: 'alert-123',
      parishes: ['KINGSTON' as any]
    };

    test('should send SMS successfully', async () => {
      const result = await smsService.sendSMS(mockNotification);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(result.cost).toBe(0.05);
      
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: mockNotification.message,
        from: '+18761234567',
        to: '+18761234567',
        statusCallback: 'https://example.com/status',
        validityPeriod: 14400
      });
    });

    test('should handle SMS sending failures', async () => {
      mockTwilioClient.messages.create.mockRejectedValue(new Error('SMS service unavailable'));
      
      const result = await smsService.sendSMS(mockNotification);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('SMS service unavailable');
    });

    test('should use smsMessage field when available', async () => {
      const notificationWithSmsMessage = {
        ...mockNotification,
        smsMessage: 'URGENT: Flood in Kingston. Evacuate now!'
      };
      
      await smsService.sendSMS(notificationWithSmsMessage);
      
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'URGENT: Flood in Kingston. Evacuate now!'
        })
      );
    });
  });

  describe('Phone Number Formatting', () => {
    test('should format Jamaica phone numbers correctly', () => {
      const testCases = [
        { input: '8761234567', expected: '+18761234567' },
        { input: '1876-123-4567', expected: '+18761234567' },
        { input: '+1876 123 4567', expected: '+18761234567' },
        { input: '123-4567', expected: '+18761234567' },
        { input: '1234567', expected: '+18761234567' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = smsService.validatePhoneNumber(input);
        expect(result.isValid).toBe(true);
        expect(result.formatted).toBe(expected);
      });
    });

    test('should reject invalid phone numbers', () => {
      const invalidNumbers = ['123', '12345678901234', 'abc123', ''];

      invalidNumbers.forEach(number => {
        const result = smsService.validatePhoneNumber(number);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('Message Truncation', () => {
    test('should truncate long messages to SMS limit', async () => {
      const longMessage = 'A'.repeat(200); // Longer than 160 characters
      const notification = {
        ...{
          to: '8761234567',
          message: longMessage,
          title: 'Test',
          type: 'FLOOD' as any,
          severity: 'HIGH' as any,
          alertId: 'alert-123',
          parishes: ['KINGSTON' as any]
        }
      };
      
      await smsService.sendSMS(notification);
      
      const sentMessage = mockTwilioClient.messages.create.mock.calls[0][0].body;
      expect(sentMessage.length).toBeLessThanOrEqual(160);
      expect(sentMessage).toMatch(/\.\.\.$/); // Should end with ...
    });

    test('should preserve short messages unchanged', async () => {
      const shortMessage = 'Short alert message';
      const notification = {
        to: '8761234567',
        message: shortMessage,
        title: 'Test',
        type: 'FLOOD' as any,
        severity: 'HIGH' as any,
        alertId: 'alert-123',
        parishes: ['KINGSTON' as any]
      };
      
      await smsService.sendSMS(notification);
      
      const sentMessage = mockTwilioClient.messages.create.mock.calls[0][0].body;
      expect(sentMessage).toBe(shortMessage);
    });
  });

  describe('Bulk SMS', () => {
    test('should send bulk SMS with rate limiting', async () => {
      const notifications = Array.from({ length: 25 }, (_, i) => ({
        to: `876123456${i.toString().padStart(2, '0')}`,
        message: `Alert ${i}`,
        title: 'Test',
        type: 'FLOOD' as any,
        severity: 'HIGH' as any,
        alertId: 'alert-123',
        parishes: ['KINGSTON' as any]
      }));
      
      const startTime = Date.now();
      const results = await smsService.sendBulkSMS(notifications, 10, 100);
      const endTime = Date.now();
      
      expect(results).toHaveLength(25);
      expect(results.every(r => r.success)).toBe(true);
      
      // Should take at least some time due to rate limiting
      expect(endTime - startTime).toBeGreaterThan(200); // At least 2 batches with 100ms delay
    });

    test('should handle bulk SMS failures gracefully', async () => {
      mockTwilioClient.messages.create
        .mockResolvedValueOnce({ sid: 'success-1', price: '0.05' })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ sid: 'success-2', price: '0.05' });
      
      const notifications = Array.from({ length: 3 }, (_, i) => ({
        to: `876123456${i}`,
        message: `Alert ${i}`,
        title: 'Test',
        type: 'FLOOD' as any,
        severity: 'HIGH' as any,
        alertId: 'alert-123',
        parishes: ['KINGSTON' as any]
      }));
      
      const results = await smsService.sendBulkSMS(notifications);
      
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });

  describe('Service Health', () => {
    test('should test connection successfully', async () => {
      const isHealthy = await smsService.testConnection();
      
      expect(isHealthy).toBe(true);
      expect(mockTwilioClient.api.accounts).toHaveBeenCalled();
    });

    test('should handle connection test failures', async () => {
      mockTwilioClient.api.accounts.mockImplementation(() => ({
        fetch: jest.fn().mockRejectedValue(new Error('Connection failed'))
      }));
      
      const isHealthy = await smsService.testConnection();
      
      expect(isHealthy).toBe(false);
    });
  });

  describe('Account Information', () => {
    test('should get account balance and usage', async () => {
      const accountInfo = await smsService.getAccountInfo();
      
      expect(accountInfo).toEqual({
        balance: '10.00',
        currency: 'USD',
        messagesThisMonth: 25
      });
    });

    test('should handle account info failures', async () => {
      mockTwilioClient.api.accounts.mockImplementation(() => ({
        fetch: jest.fn().mockRejectedValue(new Error('API error'))
      }));
      
      const accountInfo = await smsService.getAccountInfo();
      
      expect(accountInfo).toBeNull();
    });
  });

  describe('Message Status', () => {
    test('should get message delivery status', async () => {
      mockTwilioClient.messages = jest.fn(() => ({
        fetch: jest.fn().mockResolvedValue({
          status: 'delivered',
          errorCode: null,
          errorMessage: null
        })
      }));
      
      const status = await smsService.getMessageStatus('test-message-id');
      
      expect(status).toEqual({
        status: 'delivered',
        errorCode: null,
        errorMessage: null
      });
    });

    test('should handle status check failures', async () => {
      mockTwilioClient.messages = jest.fn(() => ({
        fetch: jest.fn().mockRejectedValue(new Error('Message not found'))
      }));
      
      const status = await smsService.getMessageStatus('invalid-id');
      
      expect(status).toBeNull();
    });
  });

  describe('Service Disabled', () => {
    test('should handle disabled SMS service gracefully', async () => {
      // Mock disabled config
      const { getSMSConfig } = require('../../lib/config');
      getSMSConfig.mockReturnValue({
        enabled: false,
        accountSid: null,
        authToken: null,
        fromNumber: null
      });
      
      const disabledService = new SMSService();
      const result = await disabledService.sendSMS({
        to: '8761234567',
        message: 'Test message',
        title: 'Test',
        type: 'FLOOD' as any,
        severity: 'HIGH' as any,
        alertId: 'alert-123',
        parishes: ['KINGSTON' as any]
      });
      
      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^mock-sms-/);
      expect(result.cost).toBe(0);
    });
  });
});