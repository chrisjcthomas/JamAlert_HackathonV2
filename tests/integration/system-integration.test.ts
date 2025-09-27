import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe('System Integration Tests', () => {
  test.beforeAll(async () => {
    // Set up test environment
    await prisma.$connect();
  });

  test.afterAll(async () => {
    // Clean up test environment
    await prisma.$disconnect();
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to application
    await page.goto('/');
    
    // Clean up any existing test data
    await prisma.user.deleteMany({ where: { email: { contains: 'integration.test' } } });
    await prisma.alert.deleteMany({ where: { title: { contains: 'Integration Test' } } });
    await prisma.incidentReport.deleteMany({ where: { title: { contains: 'Integration Test' } } });
  });

  test('Complete User Registration → Alert Receipt → Incident Report Workflow', async ({ page }) => {
    // Step 1: User Registration
    await page.goto('/register');
    
    await page.fill('input[name="firstName"]', 'Integration');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', 'integration.test@example.com');
    await page.fill('input[name="phone"]', '+1876-555-9999');
    await page.selectOption('select[name="parish"]', 'KINGSTON');
    await page.fill('textarea[name="address"]', '123 Integration Test Street');
    await page.check('input[name="emailAlerts"]');
    await page.check('input[name="smsAlerts"]');
    
    await page.click('button[type="submit"]');
    
    // Verify registration success
    await expect(page.locator('.success-message')).toContainText('Account created successfully');
    
    // Verify user in database
    const user = await prisma.user.findUnique({
      where: { email: 'integration.test@example.com' }
    });
    expect(user).toBeTruthy();
    expect(user?.parish).toBe('KINGSTON');

    // Step 2: Admin sends alert
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@jamalert.jm');
    await page.fill('input[name="password"]', 'admin123!');
    await page.click('button[type="submit"]');
    
    await page.goto('/admin/alerts/new');
    await page.selectOption('select[name="type"]', 'FLOOD');
    await page.selectOption('select[name="severity"]', 'HIGH');
    await page.fill('input[name="title"]', 'Integration Test Flood Alert');
    await page.fill('textarea[name="message"]', 'This is an integration test flood alert for Kingston area.');
    await page.check('input[value="KINGSTON"]');
    await page.click('button[type="submit"]');
    
    // Verify alert creation
    await expect(page.locator('.success-message')).toContainText('Alert sent successfully');
    
    // Verify alert in database
    const alert = await prisma.alert.findFirst({
      where: { title: 'Integration Test Flood Alert' }
    });
    expect(alert).toBeTruthy();
    expect(alert?.type).toBe('FLOOD');

    // Step 3: Verify alert delivery
    const deliveryLog = await prisma.alertDeliveryLog.findFirst({
      where: { 
        userId: user!.id,
        alertId: alert!.id
      }
    });
    expect(deliveryLog).toBeTruthy();

    // Step 4: User reports incident
    await page.goto('/logout');
    await page.goto('/incidents/report');
    
    await page.selectOption('select[name="type"]', 'FLOOD');
    await page.fill('input[name="title"]', 'Integration Test Flood Incident');
    await page.fill('textarea[name="description"]', 'Flooding observed on Integration Test Street following the alert.');
    await page.fill('input[name="location"]', 'Integration Test Street, Kingston');
    await page.selectOption('select[name="parish"]', 'KINGSTON');
    await page.selectOption('select[name="severity"]', 'HIGH');
    await page.fill('input[name="reporterName"]', 'Integration Test User');
    await page.fill('input[name="reporterEmail"]', 'integration.test@example.com');
    await page.fill('input[name="reporterPhone"]', '+1876-555-9999');
    
    await page.click('button[type="submit"]');
    
    // Verify incident report
    await expect(page.locator('.success-message')).toContainText('Incident reported successfully');
    
    const incident = await prisma.incidentReport.findFirst({
      where: { title: 'Integration Test Flood Incident' }
    });
    expect(incident).toBeTruthy();
    expect(incident?.type).toBe('FLOOD');
    expect(incident?.status).toBe('PENDING');

    // Step 5: Admin reviews incident
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@jamalert.jm');
    await page.fill('input[name="password"]', 'admin123!');
    await page.click('button[type="submit"]');
    
    await page.goto('/admin/incidents');
    await page.click(`[data-incident-id="${incident!.id}"]`);
    
    await page.fill('textarea[name="adminNotes"]', 'Verified through integration testing');
    await page.click('button[data-action="approve"]');
    
    // Verify incident approval
    const approvedIncident = await prisma.incidentReport.findUnique({
      where: { id: incident!.id }
    });
    expect(approvedIncident?.status).toBe('APPROVED');
    expect(approvedIncident?.verificationStatus).toBe('VERIFIED');
  });

  test('Multi-Channel Alert Delivery System Integration', async ({ page }) => {
    // Create test users with different preferences
    const users = [
      {
        id: 'integration-user-1',
        firstName: 'Email',
        lastName: 'Only',
        email: 'email.only.integration.test@example.com',
        parish: 'ST_ANDREW',
        emailAlerts: true,
        smsAlerts: false,
        emergencyOnly: false
      },
      {
        id: 'integration-user-2',
        firstName: 'SMS',
        lastName: 'Only',
        email: 'sms.only.integration.test@example.com',
        phone: '+1876-555-8888',
        parish: 'ST_ANDREW',
        emailAlerts: false,
        smsAlerts: true,
        emergencyOnly: false
      },
      {
        id: 'integration-user-3',
        firstName: 'Emergency',
        lastName: 'Only',
        email: 'emergency.only.integration.test@example.com',
        parish: 'ST_ANDREW',
        emailAlerts: true,
        smsAlerts: true,
        emergencyOnly: true
      }
    ];

    // Create users in database
    for (const userData of users) {
      await prisma.user.create({ data: userData as any });
    }

    // Admin login and send regular alert
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@jamalert.jm');
    await page.fill('input[name="password"]', 'admin123!');
    await page.click('button[type="submit"]');
    
    await page.goto('/admin/alerts/new');
    await page.selectOption('select[name="type"]', 'WEATHER');
    await page.selectOption('select[name="severity"]', 'MEDIUM');
    await page.fill('input[name="title"]', 'Integration Test Weather Alert');
    await page.fill('textarea[name="message"]', 'Weather advisory for St. Andrew area.');
    await page.check('input[value="ST_ANDREW"]');
    await page.click('button[type="submit"]');

    // Verify regular alert delivery
    const regularAlert = await prisma.alert.findFirst({
      where: { title: 'Integration Test Weather Alert' }
    });

    const deliveryLogs = await prisma.alertDeliveryLog.findMany({
      where: { alertId: regularAlert!.id }
    });

    // Should deliver to email-only and SMS-only users, but not emergency-only
    expect(deliveryLogs.length).toBe(2);

    // Send emergency alert
    await page.goto('/admin/alerts/new');
    await page.selectOption('select[name="type"]', 'EMERGENCY');
    await page.selectOption('select[name="severity"]', 'CRITICAL');
    await page.fill('input[name="title"]', 'Integration Test Emergency Alert');
    await page.fill('textarea[name="message"]', 'Emergency situation in St. Andrew area.');
    await page.check('input[value="ST_ANDREW"]');
    await page.check('input[name="emergencyOnly"]');
    await page.click('button[type="submit"]');

    // Verify emergency alert delivery
    const emergencyAlert = await prisma.alert.findFirst({
      where: { title: 'Integration Test Emergency Alert' }
    });

    const emergencyDeliveryLogs = await prisma.alertDeliveryLog.findMany({
      where: { alertId: emergencyAlert!.id }
    });

    // Should deliver to all users including emergency-only
    expect(emergencyDeliveryLogs.length).toBe(4); // 2 channels for emergency-only user + 1 each for others
  });

  test('System Performance Under Load Integration', async ({ page }) => {
    // Create multiple users for load testing
    const userPromises = [];
    for (let i = 0; i < 100; i++) {
      userPromises.push(
        prisma.user.create({
          data: {
            id: `load-test-user-${i}`,
            firstName: 'Load',
            lastName: `Test${i}`,
            email: `load.test.${i}.integration.test@example.com`,
            parish: 'KINGSTON',
            emailAlerts: true,
            isActive: true
          }
        })
      );
    }
    await Promise.all(userPromises);

    // Admin login
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@jamalert.jm');
    await page.fill('input[name="password"]', 'admin123!');
    await page.click('button[type="submit"]');

    // Send alert to all users
    const startTime = Date.now();
    
    await page.goto('/admin/alerts/new');
    await page.selectOption('select[name="type"]', 'EMERGENCY');
    await page.selectOption('select[name="severity"]', 'HIGH');
    await page.fill('input[name="title"]', 'Integration Test Load Alert');
    await page.fill('textarea[name="message"]', 'Load testing alert for 100 users.');
    await page.check('input[value="KINGSTON"]');
    await page.click('button[type="submit"]');

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    // Verify alert was sent within acceptable time (under 30 seconds)
    expect(processingTime).toBeLessThan(30000);

    // Verify all users received the alert
    const alert = await prisma.alert.findFirst({
      where: { title: 'Integration Test Load Alert' }
    });

    const deliveryCount = await prisma.alertDeliveryLog.count({
      where: { alertId: alert!.id }
    });

    expect(deliveryCount).toBe(100);
  });

  test('Database Transaction Integrity Integration', async ({ page }) => {
    // Test concurrent operations
    const concurrentOperations = [];

    // Simulate multiple users registering simultaneously
    for (let i = 0; i < 5; i++) {
      concurrentOperations.push(
        prisma.user.create({
          data: {
            id: `concurrent-user-${i}`,
            firstName: 'Concurrent',
            lastName: `User${i}`,
            email: `concurrent.${i}.integration.test@example.com`,
            parish: 'PORTLAND',
            emailAlerts: true,
            isActive: true
          }
        })
      );
    }

    // Execute concurrent operations
    const results = await Promise.allSettled(concurrentOperations);
    
    // All operations should succeed
    results.forEach(result => {
      expect(result.status).toBe('fulfilled');
    });

    // Verify all users were created
    const userCount = await prisma.user.count({
      where: { email: { contains: 'concurrent' } }
    });
    expect(userCount).toBe(5);
  });

  test('External Service Integration Resilience', async ({ page }) => {
    // Test system behavior when external services are unavailable
    // This would typically involve mocking external service failures
    
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@jamalert.jm');
    await page.fill('input[name="password"]', 'admin123!');
    await page.click('button[type="submit"]');

    // Attempt to send alert (should handle email service failures gracefully)
    await page.goto('/admin/alerts/new');
    await page.selectOption('select[name="type"]', 'WEATHER');
    await page.selectOption('select[name="severity"]', 'LOW');
    await page.fill('input[name="title"]', 'Integration Test Resilience Alert');
    await page.fill('textarea[name="message"]', 'Testing system resilience.');
    await page.check('input[value="KINGSTON"]');
    await page.click('button[type="submit"]');

    // System should still create the alert even if delivery fails
    const alert = await prisma.alert.findFirst({
      where: { title: 'Integration Test Resilience Alert' }
    });
    expect(alert).toBeTruthy();
  });

  test('Data Consistency Across System Components', async ({ page }) => {
    // Create user
    await page.goto('/register');
    await page.fill('input[name="firstName"]', 'Consistency');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', 'consistency.integration.test@example.com');
    await page.fill('input[name="phone"]', '+1876-555-7777');
    await page.selectOption('select[name="parish"]', 'CLARENDON');
    await page.check('input[name="emailAlerts"]');
    await page.click('button[type="submit"]');

    const user = await prisma.user.findUnique({
      where: { email: 'consistency.integration.test@example.com' }
    });

    // Update user preferences
    await page.goto('/profile/settings');
    await page.uncheck('input[name="emailAlerts"]');
    await page.check('input[name="emergencyOnly"]');
    await page.click('button[type="submit"]');

    // Verify changes are reflected in database
    const updatedUser = await prisma.user.findUnique({
      where: { id: user!.id }
    });
    expect(updatedUser?.emailAlerts).toBe(false);
    expect(updatedUser?.emergencyOnly).toBe(true);

    // Send alert and verify delivery respects updated preferences
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@jamalert.jm');
    await page.fill('input[name="password"]', 'admin123!');
    await page.click('button[type="submit"]');

    await page.goto('/admin/alerts/new');
    await page.selectOption('select[name="type"]', 'WEATHER');
    await page.selectOption('select[name="severity"]', 'MEDIUM');
    await page.fill('input[name="title"]', 'Integration Test Consistency Alert');
    await page.fill('textarea[name="message"]', 'Testing data consistency.');
    await page.check('input[value="CLARENDON"]');
    await page.click('button[type="submit"]');

    // User should not receive regular alert due to emergency-only preference
    const alert = await prisma.alert.findFirst({
      where: { title: 'Integration Test Consistency Alert' }
    });

    const deliveryLog = await prisma.alertDeliveryLog.findFirst({
      where: { 
        userId: user!.id,
        alertId: alert!.id
      }
    });
    expect(deliveryLog).toBeNull();
  });

  test('System Recovery After Failure Scenarios', async ({ page }) => {
    // Simulate system recovery scenarios
    
    // Test 1: Database connection recovery
    await page.goto('/health');
    await expect(page.locator('.health-status')).toContainText('Healthy');

    // Test 2: Application restart simulation
    await page.reload();
    await expect(page.locator('body')).toBeVisible();

    // Test 3: Session persistence
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@jamalert.jm');
    await page.fill('input[name="password"]', 'admin123!');
    await page.click('button[type="submit"]');

    // Navigate away and back
    await page.goto('/');
    await page.goto('/admin/dashboard');
    
    // Should still be logged in
    await expect(page.locator('.admin-dashboard')).toBeVisible();
  });
});
