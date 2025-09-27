import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe('Performance Testing Under Load', () => {
  test.beforeAll(async () => {
    await prisma.$connect();
    
    // Create test data for load testing
    console.log('Setting up load test data...');
    
    // Create 1000 test users
    const users = [];
    for (let i = 0; i < 1000; i++) {
      users.push({
        id: `load-user-${i}`,
        firstName: 'Load',
        lastName: `User${i}`,
        email: `load.user.${i}@example.com`,
        parish: ['KINGSTON', 'ST_ANDREW', 'ST_CATHERINE', 'CLARENDON', 'MANCHESTER'][i % 5],
        emailAlerts: true,
        smsAlerts: i % 2 === 0,
        emergencyOnly: i % 10 === 0,
        isActive: true
      });
    }
    
    // Batch insert users
    const batchSize = 100;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      await prisma.user.createMany({ data: batch });
    }
    
    console.log('Load test data setup complete');
  });

  test.afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({ where: { email: { contains: 'load.user' } } });
    await prisma.alert.deleteMany({ where: { title: { contains: 'Load Test' } } });
    await prisma.$disconnect();
  });

  test('Alert System Performance Under High Load', async ({ page }) => {
    // Login as admin
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@jamalert.jm');
    await page.fill('input[name="password"]', 'admin123!');
    await page.click('button[type="submit"]');

    // Test sending alert to 1000 users
    const startTime = Date.now();
    
    await page.goto('/admin/alerts/new');
    await page.selectOption('select[name="type"]', 'EMERGENCY');
    await page.selectOption('select[name="severity"]', 'HIGH');
    await page.fill('input[name="title"]', 'Load Test Emergency Alert');
    await page.fill('textarea[name="message"]', 'This is a load test emergency alert for performance testing.');
    
    // Select all parishes
    await page.check('input[value="KINGSTON"]');
    await page.check('input[value="ST_ANDREW"]');
    await page.check('input[value="ST_CATHERINE"]');
    await page.check('input[value="CLARENDON"]');
    await page.check('input[value="MANCHESTER"]');
    
    await page.click('button[type="submit"]');
    
    // Wait for success message
    await expect(page.locator('.success-message')).toContainText('Alert sent successfully');
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`Alert processing time for 1000 users: ${processingTime}ms`);
    
    // Should complete within 60 seconds
    expect(processingTime).toBeLessThan(60000);
    
    // Verify alert was created
    const alert = await prisma.alert.findFirst({
      where: { title: 'Load Test Emergency Alert' }
    });
    expect(alert).toBeTruthy();
    
    // Verify delivery logs were created
    const deliveryCount = await prisma.alertDeliveryLog.count({
      where: { alertId: alert!.id }
    });
    
    // Should have delivery logs for all active users
    expect(deliveryCount).toBeGreaterThan(900); // Allow for some emergency-only users
  });

  test('Database Performance Under Concurrent Load', async ({ browser }) => {
    // Create multiple browser contexts to simulate concurrent users
    const contexts = [];
    const pages = [];
    
    for (let i = 0; i < 10; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);
      pages.push(page);
    }
    
    try {
      // Simulate concurrent incident reporting
      const startTime = Date.now();
      
      const reportPromises = pages.map(async (page, index) => {
        await page.goto('/incidents/report');
        await page.selectOption('select[name="type"]', 'FLOOD');
        await page.fill('input[name="title"]', `Load Test Incident ${index}`);
        await page.fill('textarea[name="description"]', `Concurrent load test incident report ${index}`);
        await page.fill('input[name="location"]', `Test Location ${index}`);
        await page.selectOption('select[name="parish"]', 'KINGSTON');
        await page.selectOption('select[name="severity"]', 'MEDIUM');
        await page.fill('input[name="reporterName"]', `Load Tester ${index}`);
        await page.fill('input[name="reporterEmail"]', `load.tester.${index}@example.com`);
        await page.click('button[type="submit"]');
        
        return page.waitForSelector('.success-message');
      });
      
      await Promise.all(reportPromises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      console.log(`Concurrent incident reporting time: ${totalTime}ms`);
      
      // Should complete within 30 seconds
      expect(totalTime).toBeLessThan(30000);
      
      // Verify all incidents were created
      const incidentCount = await prisma.incidentReport.count({
        where: { title: { contains: 'Load Test Incident' } }
      });
      expect(incidentCount).toBe(10);
      
    } finally {
      // Clean up contexts
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('API Performance Under Load', async ({ request }) => {
    // Test API endpoint performance
    const endpoints = [
      '/api/health',
      '/api/alerts/public',
      '/api/incidents/public',
      '/api/weather/current'
    ];
    
    for (const endpoint of endpoints) {
      const startTime = Date.now();
      
      // Make 50 concurrent requests
      const requests = [];
      for (let i = 0; i < 50; i++) {
        requests.push(request.get(endpoint));
      }
      
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      
      const totalTime = endTime - startTime;
      const avgResponseTime = totalTime / responses.length;
      
      console.log(`${endpoint} - Total: ${totalTime}ms, Avg: ${avgResponseTime}ms`);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status()).toBeLessThan(400);
      });
      
      // Average response time should be under 1 second
      expect(avgResponseTime).toBeLessThan(1000);
    }
  });

  test('Memory Usage Under Load', async ({ page }) => {
    // Monitor memory usage during heavy operations
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@jamalert.jm');
    await page.fill('input[name="password"]', 'admin123!');
    await page.click('button[type="submit"]');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Perform memory-intensive operations
    await page.goto('/admin/alerts');
    await page.goto('/admin/incidents');
    await page.goto('/admin/users');
    
    // Navigate through large datasets
    for (let i = 0; i < 5; i++) {
      await page.reload();
      await page.waitForLoadState('networkidle');
    }
    
    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    const memoryIncrease = finalMemory - initialMemory;
    console.log(`Memory increase: ${memoryIncrease} bytes`);
    
    // Memory increase should be reasonable (less than 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });

  test('Database Connection Pool Performance', async () => {
    // Test database connection pool under load
    const startTime = Date.now();
    
    // Create 100 concurrent database operations
    const operations = [];
    for (let i = 0; i < 100; i++) {
      operations.push(
        prisma.user.count({
          where: { isActive: true }
        })
      );
    }
    
    const results = await Promise.all(operations);
    const endTime = Date.now();
    
    const totalTime = endTime - startTime;
    console.log(`Database pool performance: ${totalTime}ms for 100 operations`);
    
    // All operations should succeed
    results.forEach(result => {
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });
    
    // Should complete within 10 seconds
    expect(totalTime).toBeLessThan(10000);
  });

  test('File Upload Performance', async ({ page }) => {
    // Test file upload performance with multiple files
    await page.goto('/incidents/report');
    
    // Create test files of different sizes
    const testFiles = [
      { name: 'small.txt', size: 1024 }, // 1KB
      { name: 'medium.jpg', size: 100 * 1024 }, // 100KB
      { name: 'large.pdf', size: 1024 * 1024 } // 1MB
    ];
    
    for (const file of testFiles) {
      const startTime = Date.now();
      
      // Create file buffer
      const buffer = Buffer.alloc(file.size, 'A');
      
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles({
          name: file.name,
          mimeType: 'application/octet-stream',
          buffer: buffer
        });
        
        // Fill form and submit
        await page.selectOption('select[name="type"]', 'OTHER');
        await page.fill('input[name="title"]', `File Upload Test ${file.name}`);
        await page.fill('textarea[name="description"]', 'Testing file upload performance');
        await page.selectOption('select[name="parish"]', 'KINGSTON');
        await page.selectOption('select[name="severity"]', 'LOW');
        await page.fill('input[name="reporterName"]', 'Performance Tester');
        await page.fill('input[name="reporterEmail"]', 'perf.test@example.com');
        
        await page.click('button[type="submit"]');
        await page.waitForSelector('.success-message');
        
        const endTime = Date.now();
        const uploadTime = endTime - startTime;
        
        console.log(`Upload time for ${file.name} (${file.size} bytes): ${uploadTime}ms`);
        
        // Upload time should be reasonable based on file size
        const expectedMaxTime = Math.max(5000, file.size / 1024); // 5s minimum, 1ms per KB
        expect(uploadTime).toBeLessThan(expectedMaxTime);
      }
    }
  });

  test('Search Performance Under Load', async ({ page }) => {
    // Test search functionality performance
    await page.goto('/incidents');
    
    const searchTerms = [
      'flood',
      'emergency',
      'kingston',
      'test',
      'load'
    ];
    
    for (const term of searchTerms) {
      const startTime = Date.now();
      
      await page.fill('input[name="search"]', term);
      await page.keyboard.press('Enter');
      
      // Wait for search results
      await page.waitForSelector('.search-results, .no-results');
      
      const endTime = Date.now();
      const searchTime = endTime - startTime;
      
      console.log(`Search time for "${term}": ${searchTime}ms`);
      
      // Search should complete within 3 seconds
      expect(searchTime).toBeLessThan(3000);
    }
  });

  test('Real-time Updates Performance', async ({ browser }) => {
    // Test real-time update performance with multiple clients
    const contexts = [];
    const pages = [];
    
    // Create 5 browser contexts
    for (let i = 0; i < 5; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);
      pages.push(page);
      
      // Navigate to dashboard
      await page.goto('/dashboard');
    }
    
    try {
      // Admin sends alert
      const adminPage = pages[0];
      await adminPage.goto('/admin/login');
      await adminPage.fill('input[name="email"]', 'admin@jamalert.jm');
      await adminPage.fill('input[name="password"]', 'admin123!');
      await adminPage.click('button[type="submit"]');
      
      const startTime = Date.now();
      
      await adminPage.goto('/admin/alerts/new');
      await adminPage.selectOption('select[name="type"]', 'WEATHER');
      await adminPage.selectOption('select[name="severity"]', 'MEDIUM');
      await adminPage.fill('input[name="title"]', 'Real-time Performance Test Alert');
      await adminPage.fill('textarea[name="message"]', 'Testing real-time update performance');
      await adminPage.check('input[value="KINGSTON"]');
      await adminPage.click('button[type="submit"]');
      
      // Wait for all clients to receive the update
      const updatePromises = pages.slice(1).map(page => 
        page.waitForSelector('.alert-notification', { timeout: 10000 })
      );
      
      await Promise.all(updatePromises);
      
      const endTime = Date.now();
      const propagationTime = endTime - startTime;
      
      console.log(`Real-time update propagation time: ${propagationTime}ms`);
      
      // Updates should propagate within 5 seconds
      expect(propagationTime).toBeLessThan(5000);
      
    } finally {
      // Clean up contexts
      for (const context of contexts) {
        await context.close();
      }
    }
  });

  test('Cache Performance Under Load', async ({ request }) => {
    // Test cache performance
    const cachedEndpoints = [
      '/api/alerts/public',
      '/api/weather/current',
      '/api/parishes'
    ];
    
    for (const endpoint of cachedEndpoints) {
      // First request (cache miss)
      const startTime1 = Date.now();
      const response1 = await request.get(endpoint);
      const endTime1 = Date.now();
      const uncachedTime = endTime1 - startTime1;
      
      expect(response1.status()).toBe(200);
      
      // Second request (cache hit)
      const startTime2 = Date.now();
      const response2 = await request.get(endpoint);
      const endTime2 = Date.now();
      const cachedTime = endTime2 - startTime2;
      
      expect(response2.status()).toBe(200);
      
      console.log(`${endpoint} - Uncached: ${uncachedTime}ms, Cached: ${cachedTime}ms`);
      
      // Cached response should be significantly faster
      expect(cachedTime).toBeLessThan(uncachedTime * 0.5);
    }
  });
});
