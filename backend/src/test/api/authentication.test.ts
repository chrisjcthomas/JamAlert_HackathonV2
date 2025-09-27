import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { HttpRequest } from '@azure/functions';
import { authRegister } from '../../functions/auth-register';
import { authLogin } from '../../functions/auth-login';
import { adminDashboard } from '../../functions/admin-dashboard';
import { mockContext } from '../setup';
import { AuthMiddleware } from '../../middleware/auth.middleware';

const prisma = new PrismaClient();

describe('API Testing: Authentication and Authorization', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.user.deleteMany({ where: { email: { contains: 'authtest' } } });
    await prisma.adminUser.deleteMany({ where: { email: { contains: 'authtest' } } });
  });

  afterEach(async () => {
    // Clean up test data after each test
    await prisma.user.deleteMany({ where: { email: { contains: 'authtest' } } });
    await prisma.adminUser.deleteMany({ where: { email: { contains: 'authtest' } } });
  });

  describe('User Registration Authentication', () => {
    it('should register user with valid data', async () => {
      const request = {
        url: 'http://localhost:7071/api/auth/register',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          string: JSON.stringify({
            firstName: 'Auth',
            lastName: 'Test',
            email: 'authtest.user@example.com',
            phone: '+1876-555-0001',
            parish: 'KINGSTON',
            address: '123 Auth Test Street',
            emailAlerts: true,
            smsAlerts: false,
            emergencyOnly: false
          })
        }
      } as HttpRequest;

      const response = await authRegister(request, mockContext);

      expect(response.status).toBe(201);
      expect(response.jsonBody.success).toBe(true);
      expect(response.jsonBody.data.user.email).toBe('authtest.user@example.com');
      expect(response.jsonBody.data.user.id).toBeTruthy();

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: 'authtest.user@example.com' }
      });
      expect(user).toBeTruthy();
      expect(user?.isActive).toBe(true);
    });

    it('should reject registration with invalid email', async () => {
      const request = {
        url: 'http://localhost:7071/api/auth/register',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          string: JSON.stringify({
            firstName: 'Auth',
            lastName: 'Test',
            email: 'invalid-email',
            phone: '+1876-555-0002',
            parish: 'KINGSTON'
          })
        }
      } as HttpRequest;

      const response = await authRegister(request, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody.success).toBe(false);
      expect(response.jsonBody.error).toContain('validation');
    });

    it('should reject duplicate email registration', async () => {
      // First registration
      const firstRequest = {
        url: 'http://localhost:7071/api/auth/register',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          string: JSON.stringify({
            firstName: 'First',
            lastName: 'User',
            email: 'authtest.duplicate@example.com',
            phone: '+1876-555-0003',
            parish: 'KINGSTON'
          })
        }
      } as HttpRequest;

      const firstResponse = await authRegister(firstRequest, mockContext);
      expect(firstResponse.status).toBe(201);

      // Duplicate registration
      const duplicateRequest = {
        url: 'http://localhost:7071/api/auth/register',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          string: JSON.stringify({
            firstName: 'Second',
            lastName: 'User',
            email: 'authtest.duplicate@example.com',
            phone: '+1876-555-0004',
            parish: 'ST_ANDREW'
          })
        }
      } as HttpRequest;

      const duplicateResponse = await authRegister(duplicateRequest, mockContext);
      expect(duplicateResponse.status).toBe(409);
      expect(duplicateResponse.jsonBody.success).toBe(false);
      expect(duplicateResponse.jsonBody.error).toContain('already exists');
    });

    it('should handle missing required fields', async () => {
      const request = {
        url: 'http://localhost:7071/api/auth/register',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          string: JSON.stringify({
            firstName: 'Auth',
            // Missing lastName, email, parish
            phone: '+1876-555-0005'
          })
        }
      } as HttpRequest;

      const response = await authRegister(request, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody.success).toBe(false);
      expect(response.jsonBody.error).toContain('validation');
    });
  });

  describe('Admin Authentication', () => {
    beforeEach(async () => {
      // Create test admin user
      await prisma.adminUser.create({
        data: {
          id: 'authtest-admin-1',
          email: 'authtest.admin@example.com',
          passwordHash: '$2b$10$test.hash.for.password123', // Mock hash
          role: 'ADMIN',
          isActive: true
        }
      });
    });

    it('should authenticate valid admin credentials', async () => {
      const request = {
        url: 'http://localhost:7071/api/auth/admin/login',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          string: JSON.stringify({
            email: 'authtest.admin@example.com',
            password: 'password123'
          })
        }
      } as HttpRequest;

      // Mock bcrypt comparison for testing
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const response = await authLogin(request, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.success).toBe(true);
      expect(response.jsonBody.data.token).toBeTruthy();
      expect(response.jsonBody.data.admin.email).toBe('authtest.admin@example.com');

      bcrypt.compare.mockRestore();
    });

    it('should reject invalid admin credentials', async () => {
      const request = {
        url: 'http://localhost:7071/api/auth/admin/login',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          string: JSON.stringify({
            email: 'authtest.admin@example.com',
            password: 'wrongpassword'
          })
        }
      } as HttpRequest;

      // Mock bcrypt comparison for testing
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      const response = await authLogin(request, mockContext);

      expect(response.status).toBe(401);
      expect(response.jsonBody.success).toBe(false);
      expect(response.jsonBody.error).toContain('Invalid credentials');

      bcrypt.compare.mockRestore();
    });

    it('should reject non-existent admin email', async () => {
      const request = {
        url: 'http://localhost:7071/api/auth/admin/login',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          string: JSON.stringify({
            email: 'authtest.nonexistent@example.com',
            password: 'password123'
          })
        }
      } as HttpRequest;

      const response = await authLogin(request, mockContext);

      expect(response.status).toBe(401);
      expect(response.jsonBody.success).toBe(false);
      expect(response.jsonBody.error).toContain('Invalid credentials');
    });
  });

  describe('Authorization Middleware', () => {
    it('should validate valid admin token', async () => {
      const adminData = {
        id: 'authtest-admin-1',
        email: 'authtest.admin@example.com',
        role: 'ADMIN'
      };

      const token = AuthMiddleware.generateAdminToken(adminData);
      const authHeader = `Bearer ${token}`;

      const result = await AuthMiddleware.validateAdminToken(authHeader);

      expect(result).toBeTruthy();
      expect(result.type).toBe('admin');
      expect(result.userId).toBe(adminData.id);
      expect(result.email).toBe(adminData.email);
      expect(result.role).toBe(adminData.role);
    });

    it('should reject invalid token format', async () => {
      const invalidHeaders = [
        'InvalidToken',
        'Bearer',
        'Bearer ',
        'Basic dGVzdA==',
        ''
      ];

      for (const header of invalidHeaders) {
        const result = await AuthMiddleware.validateAdminToken(header);
        expect(result).toBeNull();
      }
    });

    it('should reject expired token', async () => {
      const adminData = {
        id: 'authtest-admin-1',
        email: 'authtest.admin@example.com',
        role: 'ADMIN'
      };

      // Generate token with very short expiry
      const token = AuthMiddleware.generateAdminToken(adminData, '1ms');
      const authHeader = `Bearer ${token}`;

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await AuthMiddleware.validateAdminToken(authHeader);
      expect(result).toBeNull();
    });

    it('should reject malformed token', async () => {
      const malformedTokens = [
        'Bearer invalid.token.here',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid'
      ];

      for (const header of malformedTokens) {
        const result = await AuthMiddleware.validateAdminToken(header);
        expect(result).toBeNull();
      }
    });
  });

  describe('Protected Endpoint Access', () => {
    it('should allow access with valid admin token', async () => {
      const adminData = {
        id: 'authtest-admin-1',
        email: 'authtest.admin@example.com',
        role: 'ADMIN'
      };

      const token = AuthMiddleware.generateAdminToken(adminData);

      const request = {
        url: 'http://localhost:7071/api/admin/dashboard',
        method: 'GET',
        headers: { 
          'authorization': `Bearer ${token}`
        }
      } as HttpRequest;

      const response = await adminDashboard(request, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.success).toBe(true);
    });

    it('should deny access without token', async () => {
      const request = {
        url: 'http://localhost:7071/api/admin/dashboard',
        method: 'GET',
        headers: {}
      } as HttpRequest;

      const response = await adminDashboard(request, mockContext);

      expect(response.status).toBe(401);
      expect(response.jsonBody.success).toBe(false);
      expect(response.jsonBody.error).toContain('Unauthorized');
    });

    it('should deny access with invalid token', async () => {
      const request = {
        url: 'http://localhost:7071/api/admin/dashboard',
        method: 'GET',
        headers: { 
          'authorization': 'Bearer invalid.token.here'
        }
      } as HttpRequest;

      const response = await adminDashboard(request, mockContext);

      expect(response.status).toBe(401);
      expect(response.jsonBody.success).toBe(false);
      expect(response.jsonBody.error).toContain('Unauthorized');
    });
  });

  describe('Rate Limiting and Security', () => {
    it('should handle multiple rapid authentication attempts', async () => {
      const requests = Array(5).fill(null).map(() => ({
        url: 'http://localhost:7071/api/auth/register',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          string: JSON.stringify({
            firstName: 'Rapid',
            lastName: 'Test',
            email: `authtest.rapid${Math.random()}@example.com`,
            phone: '+1876-555-0010',
            parish: 'KINGSTON'
          })
        }
      } as HttpRequest));

      const responses = await Promise.all(
        requests.map(req => authRegister(req, mockContext))
      );

      // All should succeed (no rate limiting implemented yet)
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.jsonBody.success).toBe(true);
      });
    });
  });
});
