import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { withTransaction, withRetry, getPrismaClient } from '../../lib/database';

const prisma = new PrismaClient();

describe('Database Testing: Transaction Rollback and Data Integrity', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up all test data
    await prisma.alertDeliveryLog.deleteMany({ where: { user: { email: { contains: 'dbtest' } } } });
    await prisma.alert.deleteMany({ where: { title: { contains: 'DB Test' } } });
    await prisma.incidentReport.deleteMany({ where: { title: { contains: 'DB Test' } } });
    await prisma.user.deleteMany({ where: { email: { contains: 'dbtest' } } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test
    await prisma.alertDeliveryLog.deleteMany({ where: { user: { email: { contains: 'dbtest' } } } });
    await prisma.alert.deleteMany({ where: { title: { contains: 'DB Test' } } });
    await prisma.incidentReport.deleteMany({ where: { title: { contains: 'DB Test' } } });
    await prisma.user.deleteMany({ where: { email: { contains: 'dbtest' } } });
  });

  describe('Transaction Rollback Testing', () => {
    it('should rollback transaction on error', async () => {
      const testEmail = 'dbtest.rollback@example.com';

      try {
        await withTransaction(async (tx) => {
          // Create a user
          const user = await tx.user.create({
            data: {
              id: 'dbtest-rollback-user',
              firstName: 'DB',
              lastName: 'Test',
              email: testEmail,
              parish: 'KINGSTON',
              emailAlerts: true,
              isActive: true
            }
          });

          expect(user.email).toBe(testEmail);

          // Create an alert
          const alert = await tx.alert.create({
            data: {
              id: 'dbtest-rollback-alert',
              type: 'FLOOD',
              severity: 'HIGH',
              title: 'DB Test Rollback Alert',
              message: 'This should be rolled back',
              parishes: ['KINGSTON'],
              deliveryStatus: 'PENDING'
            }
          });

          expect(alert.title).toBe('DB Test Rollback Alert');

          // Intentionally throw an error to trigger rollback
          throw new Error('Intentional error for rollback test');
        }, 'Rollback test transaction');

        // This should not be reached
        expect(true).toBe(false);

      } catch (error) {
        expect(error.message).toBe('Intentional error for rollback test');
      }

      // Verify that no data was persisted due to rollback
      const user = await prisma.user.findUnique({
        where: { email: testEmail }
      });
      expect(user).toBeNull();

      const alert = await prisma.alert.findFirst({
        where: { title: 'DB Test Rollback Alert' }
      });
      expect(alert).toBeNull();
    });

    it('should commit transaction on success', async () => {
      const testEmail = 'dbtest.commit@example.com';

      await withTransaction(async (tx) => {
        // Create a user
        const user = await tx.user.create({
          data: {
            id: 'dbtest-commit-user',
            firstName: 'DB',
            lastName: 'Commit',
            email: testEmail,
            parish: 'ST_ANDREW',
            emailAlerts: true,
            isActive: true
          }
        });

        // Create an alert
        const alert = await tx.alert.create({
          data: {
            id: 'dbtest-commit-alert',
            type: 'WEATHER',
            severity: 'MEDIUM',
            title: 'DB Test Commit Alert',
            message: 'This should be committed',
            parishes: ['ST_ANDREW'],
            deliveryStatus: 'PENDING'
          }
        });

        // Create delivery log
        await tx.alertDeliveryLog.create({
          data: {
            id: 'dbtest-commit-delivery',
            userId: user.id,
            alertId: alert.id,
            channel: 'EMAIL',
            deliveryStatus: 'DELIVERED',
            sentAt: new Date()
          }
        });

        return { user, alert };
      }, 'Commit test transaction');

      // Verify that data was persisted
      const user = await prisma.user.findUnique({
        where: { email: testEmail }
      });
      expect(user).toBeTruthy();
      expect(user?.firstName).toBe('DB');

      const alert = await prisma.alert.findFirst({
        where: { title: 'DB Test Commit Alert' }
      });
      expect(alert).toBeTruthy();
      expect(alert?.severity).toBe('MEDIUM');

      const deliveryLog = await prisma.alertDeliveryLog.findFirst({
        where: { userId: user!.id }
      });
      expect(deliveryLog).toBeTruthy();
      expect(deliveryLog?.deliveryStatus).toBe('DELIVERED');
    });

    it('should handle nested transactions correctly', async () => {
      const testEmail = 'dbtest.nested@example.com';

      await withTransaction(async (tx) => {
        // Outer transaction: Create user
        const user = await tx.user.create({
          data: {
            id: 'dbtest-nested-user',
            firstName: 'Nested',
            lastName: 'Transaction',
            email: testEmail,
            parish: 'PORTLAND',
            emailAlerts: true,
            isActive: true
          }
        });

        // Inner operation: Create multiple alerts
        const alerts = await Promise.all([
          tx.alert.create({
            data: {
              id: 'dbtest-nested-alert-1',
              type: 'FLOOD',
              severity: 'HIGH',
              title: 'DB Test Nested Alert 1',
              message: 'First nested alert',
              parishes: ['PORTLAND'],
              deliveryStatus: 'PENDING'
            }
          }),
          tx.alert.create({
            data: {
              id: 'dbtest-nested-alert-2',
              type: 'EMERGENCY',
              severity: 'HIGH',
              title: 'DB Test Nested Alert 2',
              message: 'Second nested alert',
              parishes: ['PORTLAND'],
              deliveryStatus: 'PENDING'
            }
          })
        ]);

        // Create delivery logs for both alerts
        await Promise.all(alerts.map(alert =>
          tx.alertDeliveryLog.create({
            data: {
              id: `dbtest-nested-delivery-${alert.id}`,
              userId: user.id,
              alertId: alert.id,
              channel: 'EMAIL',
              deliveryStatus: 'DELIVERED',
              sentAt: new Date()
            }
          })
        ));

        return { user, alerts };
      }, 'Nested transaction test');

      // Verify all data was committed
      const user = await prisma.user.findUnique({
        where: { email: testEmail },
        include: {
          alertDeliveryLogs: {
            include: { alert: true }
          }
        }
      });

      expect(user).toBeTruthy();
      expect(user?.alertDeliveryLogs).toHaveLength(2);
      expect(user?.alertDeliveryLogs[0].alert.title).toContain('DB Test Nested Alert');
    });
  });

  describe('Data Integrity Testing', () => {
    it('should enforce foreign key constraints', async () => {
      // Try to create delivery log with non-existent user
      await expect(
        prisma.alertDeliveryLog.create({
          data: {
            id: 'dbtest-invalid-delivery',
            userId: 'non-existent-user-id',
            alertId: 'non-existent-alert-id',
            channel: 'EMAIL',
            deliveryStatus: 'DELIVERED',
            sentAt: new Date()
          }
        })
      ).rejects.toThrow();
    });

    it('should enforce unique constraints', async () => {
      const testEmail = 'dbtest.unique@example.com';

      // Create first user
      await prisma.user.create({
        data: {
          id: 'dbtest-unique-user-1',
          firstName: 'First',
          lastName: 'User',
          email: testEmail,
          parish: 'KINGSTON',
          emailAlerts: true,
          isActive: true
        }
      });

      // Try to create second user with same email
      await expect(
        prisma.user.create({
          data: {
            id: 'dbtest-unique-user-2',
            firstName: 'Second',
            lastName: 'User',
            email: testEmail,
            parish: 'ST_ANDREW',
            emailAlerts: true,
            isActive: true
          }
        })
      ).rejects.toThrow();
    });

    it('should handle concurrent transactions correctly', async () => {
      const testEmail1 = 'dbtest.concurrent1@example.com';
      const testEmail2 = 'dbtest.concurrent2@example.com';

      // Run concurrent transactions
      const [result1, result2] = await Promise.all([
        withTransaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              id: 'dbtest-concurrent-user-1',
              firstName: 'Concurrent',
              lastName: 'User1',
              email: testEmail1,
              parish: 'KINGSTON',
              emailAlerts: true,
              isActive: true
            }
          });

          // Simulate some processing time
          await new Promise(resolve => setTimeout(resolve, 100));

          const alert = await tx.alert.create({
            data: {
              id: 'dbtest-concurrent-alert-1',
              type: 'FLOOD',
              severity: 'HIGH',
              title: 'DB Test Concurrent Alert 1',
              message: 'Concurrent transaction 1',
              parishes: ['KINGSTON'],
              deliveryStatus: 'PENDING'
            }
          });

          return { user, alert };
        }, 'Concurrent transaction 1'),

        withTransaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              id: 'dbtest-concurrent-user-2',
              firstName: 'Concurrent',
              lastName: 'User2',
              email: testEmail2,
              parish: 'ST_ANDREW',
              emailAlerts: true,
              isActive: true
            }
          });

          // Simulate some processing time
          await new Promise(resolve => setTimeout(resolve, 100));

          const alert = await tx.alert.create({
            data: {
              id: 'dbtest-concurrent-alert-2',
              type: 'WEATHER',
              severity: 'MEDIUM',
              title: 'DB Test Concurrent Alert 2',
              message: 'Concurrent transaction 2',
              parishes: ['ST_ANDREW'],
              deliveryStatus: 'PENDING'
            }
          });

          return { user, alert };
        }, 'Concurrent transaction 2')
      ]);

      // Verify both transactions completed successfully
      expect(result1.user.email).toBe(testEmail1);
      expect(result2.user.email).toBe(testEmail2);

      // Verify data in database
      const users = await prisma.user.findMany({
        where: {
          email: { in: [testEmail1, testEmail2] }
        }
      });
      expect(users).toHaveLength(2);

      const alerts = await prisma.alert.findMany({
        where: {
          title: { contains: 'DB Test Concurrent Alert' }
        }
      });
      expect(alerts).toHaveLength(2);
    });
  });

  describe('Connection Pool Testing', () => {
    it('should handle multiple simultaneous connections', async () => {
      const connectionPromises = Array(10).fill(null).map(async (_, index) => {
        const client = getPrismaClient();
        
        // Perform a simple query
        const result = await client.$queryRaw`SELECT ${index} as connection_test`;
        
        return result;
      });

      const results = await Promise.all(connectionPromises);
      
      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result[0].connection_test).toBe(index);
      });
    });

    it('should handle connection retry logic', async () => {
      let attemptCount = 0;
      
      const result = await withRetry(async () => {
        attemptCount++;
        
        // Fail first two attempts
        if (attemptCount < 3) {
          throw new Error('Simulated connection failure');
        }
        
        // Succeed on third attempt
        return await prisma.$queryRaw`SELECT 'success' as result`;
      }, 'Connection retry test');

      expect(attemptCount).toBe(3);
      expect(result[0].result).toBe('success');
    });
  });

  describe('Performance Testing', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();
      
      // Create 1000 users in batches
      const batchSize = 100;
      const totalUsers = 1000;
      
      for (let i = 0; i < totalUsers; i += batchSize) {
        const batch = Array(Math.min(batchSize, totalUsers - i)).fill(null).map((_, j) => ({
          id: `dbtest-bulk-user-${i + j}`,
          firstName: 'Bulk',
          lastName: `User${i + j}`,
          email: `dbtest.bulk.user${i + j}@example.com`,
          parish: 'KINGSTON',
          emailAlerts: true,
          isActive: true
        }));

        await prisma.user.createMany({
          data: batch,
          skipDuplicates: true
        });
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`Bulk insert of ${totalUsers} users completed in ${duration}ms`);
      
      // Should complete within reasonable time (under 10 seconds)
      expect(duration).toBeLessThan(10000);
      
      // Verify all users were created
      const userCount = await prisma.user.count({
        where: { email: { contains: 'dbtest.bulk.user' } }
      });
      expect(userCount).toBe(totalUsers);
    });
  });
});
