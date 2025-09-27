import { NotificationService } from '../notification.service';

// Mock all dependencies
jest.mock('../email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendAlertNotification: jest.fn().mockResolvedValue(undefined),
    testConnection: jest.fn().mockResolvedValue(true),
    close: jest.fn().mockResolvedValue(undefined),
  }))
}));

jest.mock('../sms.service', () => ({
  SMSService: jest.fn().mockImplementation(() => ({
    sendSMS: jest.fn().mockResolvedValue({ success: true, messageId: 'sms-123' }),
    testConnection: jest.fn().mockResolvedValue(true),
    close: jest.fn().mockResolvedValue(undefined),
  }))
}));

jest.mock('../../lib/database', () => ({
  getPrismaClient: jest.fn(() => ({
    alertDeliveryLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  })),
  withRetry: jest.fn((fn) => fn()),
}));

describe('Multi-Channel Notification System - Simple Tests', () => {
  let notificationService: NotificationService;

  const mockUser = {
    id: 'user-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '8761234567',
    parish: 'KINGSTON' as any,
    address: null,
    smsAlerts: true,
    emailAlerts: true,
    emergencyOnly: false,
    accessibilitySettings: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  };

  const mockAlert = {
    id: 'alert-1',
    type: 'FLOOD' as any,
    severity: 'HIGH' as any,
    title: 'Flood Warning',
    message: 'Heavy flooding detected in Kingston area',
    parishes: ['KINGSTON'],
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
    notificationService = new NotificationService();
  });

  test('should create notification service successfully', () => {
    expect(notificationService).toBeDefined();
  });

  test('should have message templates initialized', () => {
    // Test that the service can create notification payloads
    expect(() => {
      // This should not throw an error
      const payload = (notificationService as any).createNotificationPayload(mockAlert);
      expect(payload).toBeDefined();
      expect(payload.title).toBeDefined();
      expect(payload.message).toBeDefined();
    }).not.toThrow();
  });

  test('should determine notification tone correctly', () => {
    const urgentAlert = { ...mockAlert, severity: 'HIGH' as any };
    const calmAlert = { ...mockAlert, severity: 'LOW' as any };
    
    const urgentTone = (notificationService as any).determineNotificationTone(urgentAlert);
    const calmTone = (notificationService as any).determineNotificationTone(calmAlert);
    
    expect(urgentTone).toBe('urgent');
    expect(calmTone).toBe('calm');
  });

  test('should format parish names correctly', () => {
    const formatted = (notificationService as any).formatParishName('ST_ANDREW');
    expect(formatted).toBe('St Andrew');
  });

  test('should get emergency contacts', () => {
    const contacts = (notificationService as any).getEmergencyContacts();
    expect(contacts).toEqual({
      police: '119',
      fire: '110',
      emergency: '911',
      odpem: '116',
      formatted: 'Emergency Contacts: Police 119 | Fire 110 | Emergency 911 | ODPEM 116'
    });
  });

  test('should process template variables', () => {
    const template = 'Alert for {parishes}: {message}';
    const variables = {
      parishes: 'Kingston',
      message: 'Test message'
    };
    
    const processed = (notificationService as any).processTemplate(template, variables);
    expect(processed).toBe('Alert for Kingston: Test message');
  });

  test('should test health of all services', async () => {
    const health = await notificationService.testHealth();
    
    expect(health).toEqual({
      email: true,
      sms: true,
      push: true
    });
  });

  test('should close services properly', async () => {
    await expect(notificationService.close()).resolves.not.toThrow();
  });
});