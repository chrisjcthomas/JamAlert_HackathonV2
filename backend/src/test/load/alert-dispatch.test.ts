import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { HttpRequest } from '@azure/functions';
import { alertsSend } from '../../functions/alerts-send';
import { mockContext } from '../setup';

const prisma = new PrismaClient();

describe('Load Testing: Alert Dispatch System', () => {
  beforeAll(async () => {
    await prisma.$connect();
    
    // Create test users for load testing
    console.log('Creating test users for load testing...');
    await createTestUsers(5000);
  });

  afterAll(async () => {
    // Clean up test data
    console.log('Cleaning up test users...');
    await prisma.user.deleteMany({ 
      where: { email: { contains: 'loadtest' } } 
    });
    await prisma.alert.deleteMany({ 
      where: { title: { contains: 'Load Test' } } 
    });
    await prisma.alertDeliveryLog.deleteMany({
      where: { 
        user: { email: { contains: 'loadtest' } }
      }
    });
    await prisma.$disconnect();
  });

  async function createTestUsers(count: number): Promise<void> {
    const parishes = ['KINGSTON', 'ST_ANDREW', 'ST_THOMAS', 'PORTLAND', 'ST_MARY'];
    const batchSize = 100;
    
    for (let i = 0; i < count; i += batchSize) {
      const batch = [];
      const currentBatchSize = Math.min(batchSize, count - i);
      
      for (let j = 0; j < currentBatchSize; j++) {
        const userIndex = i + j;
        batch.push({
          id: `loadtest-user-${userIndex}`,
          firstName: `LoadTest`,
          lastName: `User${userIndex}`,
          email: `loadtest.user${userIndex}@example.com`,
          phone: `+1876555${String(userIndex).padStart(4, '0')}`,
          parish: parishes[userIndex % parishes.length] as any,
          emailAlerts: true,
          smsAlerts: userIndex % 3 === 0, // 1/3 of users have SMS
          emergencyOnly: userIndex % 10 === 0, // 1/10 are emergency only
          isActive: true
        });
      }
      
      await prisma.user.createMany({
        data: batch,
        skipDuplicates: true
      });
      
      if (i % 1000 === 0) {
        console.log(`Created ${i + currentBatchSize} test users...`);
      }
    }
    
    console.log(`Successfully created ${count} test users`);
  }

  it('should handle alert dispatch to 5000+ users within acceptable time', async () => {
    const startTime = Date.now();
    
    const alertRequest = {
      url: 'http://localhost:7071/api/alerts/send',
      method: 'POST',
      headers: { 
        'content-type': 'application/json',
        'authorization': 'Bearer admin-token'
      },
      body: {
        string: JSON.stringify({
          type: 'EMERGENCY',
          severity: 'HIGH',
          title: 'Load Test Emergency Alert',
          message: 'This is a load test emergency alert for 5000+ users',
          parishes: ['KINGSTON', 'ST_ANDREW', 'ST_THOMAS', 'PORTLAND', 'ST_MARY'],
          channels: ['EMAIL'],
          emergencyOnly: false
        })
      }
    } as HttpRequest;

    const response = await alertsSend(alertRequest, mockContext);
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    expect(response.status).toBe(200);
    expect(response.jsonBody.success).toBe(true);
    
    // Should complete within 30 seconds for 5000 users
    expect(processingTime).toBeLessThan(30000);
    
    console.log(`Alert dispatch completed in ${processingTime}ms`);
    
    // Verify alert was created
    const alert = await prisma.alert.findFirst({
      where: { title: 'Load Test Emergency Alert' }
    });
    expect(alert).toBeTruthy();
    
    // Wait a bit for async delivery processing
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Verify delivery logs were created
    const deliveryLogs = await prisma.alertDeliveryLog.findMany({
      where: { alertId: alert!.id }
    });
    
    expect(deliveryLogs.length).toBeGreaterThan(4000); // Allow for some emergency-only users
    
    // Check delivery success rate
    const successfulDeliveries = deliveryLogs.filter(
      log => log.deliveryStatus === 'DELIVERED'
    );
    const successRate = (successfulDeliveries.length / deliveryLogs.length) * 100;
    
    expect(successRate).toBeGreaterThan(95); // 95% success rate
    
    console.log(`Delivery success rate: ${successRate.toFixed(2)}%`);
    console.log(`Total deliveries attempted: ${deliveryLogs.length}`);
    console.log(`Successful deliveries: ${successfulDeliveries.length}`);
  });

  it('should handle concurrent alert dispatches without conflicts', async () => {
    const concurrentAlerts = 5;
    const alertPromises = [];
    
    for (let i = 0; i < concurrentAlerts; i++) {
      const alertRequest = {
        url: 'http://localhost:7071/api/alerts/send',
        method: 'POST',
        headers: { 
          'content-type': 'application/json',
          'authorization': 'Bearer admin-token'
        },
        body: {
          string: JSON.stringify({
            type: 'WEATHER',
            severity: 'MEDIUM',
            title: `Concurrent Load Test Alert ${i + 1}`,
            message: `Concurrent alert test ${i + 1} for load testing`,
            parishes: ['KINGSTON'],
            channels: ['EMAIL'],
            emergencyOnly: false
          })
        }
      } as HttpRequest;
      
      alertPromises.push(alertsSend(alertRequest, mockContext));
    }
    
    const startTime = Date.now();
    const responses = await Promise.all(alertPromises);
    const endTime = Date.now();
    
    const totalTime = endTime - startTime;
    
    // All alerts should succeed
    responses.forEach((response, index) => {
      expect(response.status).toBe(200);
      expect(response.jsonBody.success).toBe(true);
    });
    
    // Should complete within reasonable time
    expect(totalTime).toBeLessThan(45000); // 45 seconds for 5 concurrent alerts
    
    console.log(`Concurrent alert dispatch completed in ${totalTime}ms`);
    
    // Verify all alerts were created
    const alerts = await prisma.alert.findMany({
      where: { title: { contains: 'Concurrent Load Test Alert' } }
    });
    expect(alerts.length).toBe(concurrentAlerts);
  });

  it('should maintain performance under sustained load', async () => {
    const sustainedAlerts = 10;
    const delayBetweenAlerts = 2000; // 2 seconds
    const results = [];
    
    for (let i = 0; i < sustainedAlerts; i++) {
      const startTime = Date.now();
      
      const alertRequest = {
        url: 'http://localhost:7071/api/alerts/send',
        method: 'POST',
        headers: { 
          'content-type': 'application/json',
          'authorization': 'Bearer admin-token'
        },
        body: {
          string: JSON.stringify({
            type: 'WEATHER',
            severity: 'LOW',
            title: `Sustained Load Test Alert ${i + 1}`,
            message: `Sustained load test alert ${i + 1}`,
            parishes: ['ST_ANDREW'],
            channels: ['EMAIL'],
            emergencyOnly: false
          })
        }
      } as HttpRequest;
      
      const response = await alertsSend(alertRequest, mockContext);
      const endTime = Date.now();
      
      expect(response.status).toBe(200);
      expect(response.jsonBody.success).toBe(true);
      
      const processingTime = endTime - startTime;
      results.push(processingTime);
      
      console.log(`Alert ${i + 1} processed in ${processingTime}ms`);
      
      // Wait before next alert
      if (i < sustainedAlerts - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenAlerts));
      }
    }
    
    // Calculate performance metrics
    const avgTime = results.reduce((sum, time) => sum + time, 0) / results.length;
    const maxTime = Math.max(...results);
    const minTime = Math.min(...results);
    
    console.log(`Sustained load test results:`);
    console.log(`Average processing time: ${avgTime.toFixed(2)}ms`);
    console.log(`Max processing time: ${maxTime}ms`);
    console.log(`Min processing time: ${minTime}ms`);
    
    // Performance should remain consistent
    expect(avgTime).toBeLessThan(10000); // Average under 10 seconds
    expect(maxTime).toBeLessThan(15000); // Max under 15 seconds
    
    // Performance degradation should be minimal
    const performanceDegradation = (maxTime - minTime) / minTime;
    expect(performanceDegradation).toBeLessThan(2); // Less than 200% degradation
  });

  it('should handle memory efficiently during large alert dispatch', async () => {
    const initialMemory = process.memoryUsage();
    
    const alertRequest = {
      url: 'http://localhost:7071/api/alerts/send',
      method: 'POST',
      headers: { 
        'content-type': 'application/json',
        'authorization': 'Bearer admin-token'
      },
      body: {
        string: JSON.stringify({
          type: 'FLOOD',
          severity: 'HIGH',
          title: 'Memory Test Large Alert',
          message: 'Testing memory usage during large alert dispatch',
          parishes: ['KINGSTON', 'ST_ANDREW', 'ST_THOMAS', 'PORTLAND', 'ST_MARY'],
          channels: ['EMAIL'],
          emergencyOnly: false
        })
      }
    } as HttpRequest;

    await alertsSend(alertRequest, mockContext);
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage();
    
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    const memoryIncreasePerUser = memoryIncrease / 5000;
    
    console.log(`Memory usage increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Memory per user: ${memoryIncreasePerUser.toFixed(2)} bytes`);
    
    // Memory increase should be reasonable (less than 100MB for 5000 users)
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    
    // Memory per user should be minimal (less than 1KB per user)
    expect(memoryIncreasePerUser).toBeLessThan(1024);
  });
});
