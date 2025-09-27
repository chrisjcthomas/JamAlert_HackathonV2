import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { HttpRequest, InvocationContext } from '@azure/functions';
import { authRegister } from '../../functions/auth-register';
import { incidentsReport } from '../../functions/incidents-report';
import { alertsSend } from '../../functions/alerts-send';
import { adminDashboard } from '../../functions/admin-dashboard';
import { mockContext } from '../setup';

const prisma = new PrismaClient();

describe('Integration Tests: Complete User Workflows', () => {
  beforeAll(async () => {
    // Set up test database
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up test database
    await prisma.user.deleteMany({ where: { email: { contains: 'test' } } });
    await prisma.incidentReport.deleteMany({ where: { title: { contains: 'Test' } } });
    await prisma.alert.deleteMany({ where: { title: { contains: 'Test' } } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test
    await prisma.user.deleteMany({ where: { email: { contains: 'test' } } });
    await prisma.incidentReport.deleteMany({ where: { title: { contains: 'Test' } } });
    await prisma.alert.deleteMany({ where: { title: { contains: 'Test' } } });
  });

  describe('User Registration → Alert Receipt Workflow', () => {
    it('should complete full user registration and alert delivery workflow', async () => {
      // Step 1: User Registration
      const registrationRequest = {
        url: 'http://localhost:7071/api/auth/register',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          string: JSON.stringify({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe.test@example.com',
            phone: '+1876-555-0123',
            parish: 'KINGSTON',
            address: '123 Test Street, Kingston',
            emailAlerts: true,
            smsAlerts: false,
            emergencyOnly: false
          })
        }
      } as HttpRequest;

      const registrationResponse = await authRegister(registrationRequest, mockContext);
      
      expect(registrationResponse.status).toBe(201);
      expect(registrationResponse.jsonBody.success).toBe(true);
      expect(registrationResponse.jsonBody.data.user.email).toBe('john.doe.test@example.com');

      // Verify user was created in database
      const createdUser = await prisma.user.findUnique({
        where: { email: 'john.doe.test@example.com' }
      });
      expect(createdUser).toBeTruthy();
      expect(createdUser?.parish).toBe('KINGSTON');

      // Step 2: Create and Send Alert
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
            title: 'Test Flood Alert',
            message: 'Flash flood warning for Kingston area',
            parishes: ['KINGSTON'],
            emergencyOnly: false
          })
        }
      } as HttpRequest;

      const alertResponse = await alertsSend(alertRequest, mockContext);
      
      expect(alertResponse.status).toBe(200);
      expect(alertResponse.jsonBody.success).toBe(true);

      // Step 3: Verify Alert Delivery
      const deliveryLogs = await prisma.alertDeliveryLog.findMany({
        where: { 
          userId: createdUser!.id,
          deliveryStatus: 'DELIVERED'
        }
      });
      
      expect(deliveryLogs.length).toBeGreaterThan(0);
      expect(deliveryLogs[0].channel).toBe('EMAIL');
    });

    it('should handle user preferences correctly in alert delivery', async () => {
      // Register user with emergency-only preference
      const registrationRequest = {
        url: 'http://localhost:7071/api/auth/register',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          string: JSON.stringify({
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith.test@example.com',
            phone: '+1876-555-0456',
            parish: 'ST_ANDREW',
            emailAlerts: true,
            emergencyOnly: true
          })
        }
      } as HttpRequest;

      await authRegister(registrationRequest, mockContext);

      const user = await prisma.user.findUnique({
        where: { email: 'jane.smith.test@example.com' }
      });

      // Send non-emergency alert
      const regularAlertRequest = {
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
            title: 'Test Weather Alert',
            message: 'Weather advisory for St. Andrew',
            parishes: ['ST_ANDREW'],
            emergencyOnly: false
          })
        }
      } as HttpRequest;

      await alertsSend(regularAlertRequest, mockContext);

      // Verify no delivery for emergency-only user
      const regularDelivery = await prisma.alertDeliveryLog.findMany({
        where: { userId: user!.id }
      });
      expect(regularDelivery.length).toBe(0);

      // Send emergency alert
      const emergencyAlertRequest = {
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
            title: 'Test Emergency Alert',
            message: 'Emergency situation in St. Andrew',
            parishes: ['ST_ANDREW'],
            emergencyOnly: true
          })
        }
      } as HttpRequest;

      await alertsSend(emergencyAlertRequest, mockContext);

      // Verify delivery for emergency alert
      const emergencyDelivery = await prisma.alertDeliveryLog.findMany({
        where: { userId: user!.id }
      });
      expect(emergencyDelivery.length).toBeGreaterThan(0);
    });
  });

  describe('Incident Reporting → Admin Review → Alert Dispatch Workflow', () => {
    it('should complete full incident reporting and approval workflow', async () => {
      // Step 1: Submit Incident Report
      const incidentRequest = {
        url: 'http://localhost:7071/api/incidents/report',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          string: JSON.stringify({
            type: 'FLOOD',
            title: 'Test Flash Flood Report',
            description: 'Heavy rainfall causing flooding on Main Street',
            location: 'Main Street, Kingston',
            parish: 'KINGSTON',
            severity: 'HIGH',
            anonymous: false,
            reporterName: 'Test Reporter',
            reporterEmail: 'reporter.test@example.com',
            reporterPhone: '+1876-555-0789'
          })
        }
      } as HttpRequest;

      const incidentResponse = await incidentsReport(incidentRequest, mockContext);
      
      expect(incidentResponse.status).toBe(201);
      expect(incidentResponse.jsonBody.success).toBe(true);
      
      const reportId = incidentResponse.jsonBody.data.reportId;
      expect(reportId).toBeTruthy();

      // Verify incident was created
      const incident = await prisma.incidentReport.findUnique({
        where: { id: reportId }
      });
      expect(incident).toBeTruthy();
      expect(incident?.status).toBe('PENDING');

      // Step 2: Admin Review and Approval (simulated)
      await prisma.incidentReport.update({
        where: { id: reportId },
        data: { 
          status: 'APPROVED',
          verificationStatus: 'VERIFIED'
        }
      });

      // Step 3: Verify Incident Appears in Admin Dashboard
      const dashboardRequest = {
        url: 'http://localhost:7071/api/admin/dashboard',
        method: 'GET',
        headers: { 
          'authorization': 'Bearer admin-token'
        }
      } as HttpRequest;

      const dashboardResponse = await adminDashboard(dashboardRequest, mockContext);
      
      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.jsonBody.success).toBe(true);
      
      const dashboardData = dashboardResponse.jsonBody.data;
      expect(dashboardData.recentIncidents.length).toBeGreaterThan(0);
      
      const reportedIncident = dashboardData.recentIncidents.find(
        (inc: any) => inc.id === reportId
      );
      expect(reportedIncident).toBeTruthy();
      expect(reportedIncident.status).toBe('APPROVED');
    });

    it('should handle anonymous incident reporting correctly', async () => {
      const anonymousIncidentRequest = {
        url: 'http://localhost:7071/api/incidents/report',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          string: JSON.stringify({
            type: 'ACCIDENT',
            title: 'Test Anonymous Accident Report',
            description: 'Vehicle accident on highway',
            location: 'Highway A1, St. Catherine',
            parish: 'ST_CATHERINE',
            severity: 'MEDIUM',
            anonymous: true
          })
        }
      } as HttpRequest;

      const response = await incidentsReport(anonymousIncidentRequest, mockContext);
      
      expect(response.status).toBe(201);
      expect(response.jsonBody.success).toBe(true);

      const reportId = response.jsonBody.data.reportId;
      const incident = await prisma.incidentReport.findUnique({
        where: { id: reportId }
      });

      expect(incident).toBeTruthy();
      expect(incident?.reporterName).toBeNull();
      expect(incident?.reporterEmail).toBeNull();
      expect(incident?.reporterPhone).toBeNull();
      expect(incident?.anonymous).toBe(true);
    });
  });

  describe('Multi-Channel Alert Delivery Workflow', () => {
    it('should deliver alerts through multiple channels with fallback', async () => {
      // Register user with multiple notification preferences
      const registrationRequest = {
        url: 'http://localhost:7071/api/auth/register',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          string: JSON.stringify({
            firstName: 'Multi',
            lastName: 'Channel',
            email: 'multi.channel.test@example.com',
            phone: '+1876-555-1111',
            parish: 'CLARENDON',
            emailAlerts: true,
            smsAlerts: true,
            emergencyOnly: false
          })
        }
      } as HttpRequest;

      await authRegister(registrationRequest, mockContext);

      const user = await prisma.user.findUnique({
        where: { email: 'multi.channel.test@example.com' }
      });

      // Send alert with multiple channels
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
            title: 'Test Multi-Channel Alert',
            message: 'Emergency alert for multi-channel testing',
            parishes: ['CLARENDON'],
            channels: ['EMAIL', 'SMS', 'PUSH'],
            emergencyOnly: false
          })
        }
      } as HttpRequest;

      await alertsSend(alertRequest, mockContext);

      // Verify delivery attempts for multiple channels
      const deliveryLogs = await prisma.alertDeliveryLog.findMany({
        where: { userId: user!.id }
      });

      expect(deliveryLogs.length).toBeGreaterThan(0);
      
      // Should have attempted email delivery
      const emailDelivery = deliveryLogs.find(log => log.channel === 'EMAIL');
      expect(emailDelivery).toBeTruthy();
    });
  });
});
