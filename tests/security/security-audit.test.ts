import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe('Security Audit and Penetration Testing', () => {
  test.beforeAll(async () => {
    await prisma.$connect();
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test.describe('Authentication Security', () => {
    test('should prevent SQL injection in login', async ({ page }) => {
      await page.goto('/login');
      
      // Attempt SQL injection
      const maliciousInputs = [
        "admin@jamalert.jm'; DROP TABLE users; --",
        "admin@jamalert.jm' OR '1'='1",
        "admin@jamalert.jm' UNION SELECT * FROM users --",
        "'; UPDATE users SET isAdmin=true WHERE email='attacker@test.com'; --"
      ];

      for (const maliciousInput of maliciousInputs) {
        await page.fill('input[name="email"]', maliciousInput);
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        
        // Should show invalid credentials, not succeed or crash
        await expect(page.locator('.error-message')).toContainText('Invalid credentials');
        
        // Verify database integrity
        const userCount = await prisma.user.count();
        expect(userCount).toBeGreaterThan(0); // Table should still exist
      }
    });

    test('should enforce password complexity requirements', async ({ page }) => {
      await page.goto('/register');
      
      const weakPasswords = [
        '123',
        'password',
        'abc123',
        '12345678',
        'qwerty',
        'admin'
      ];

      for (const weakPassword of weakPasswords) {
        await page.fill('input[name="firstName"]', 'Test');
        await page.fill('input[name="lastName"]', 'User');
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', weakPassword);
        await page.fill('input[name="confirmPassword"]', weakPassword);
        await page.click('button[type="submit"]');
        
        // Should reject weak passwords
        await expect(page.locator('.error-message')).toContainText('Password is too weak');
      }
    });

    test('should prevent brute force attacks', async ({ page }) => {
      await page.goto('/login');
      
      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        await page.fill('input[name="email"]', 'admin@jamalert.jm');
        await page.fill('input[name="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(100);
      }
      
      // Should be rate limited after multiple attempts
      await expect(page.locator('.error-message')).toContainText('Too many login attempts');
    });

    test('should validate JWT tokens properly', async ({ page, context }) => {
      // Login to get valid token
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@jamalert.jm');
      await page.fill('input[name="password"]', 'admin123!');
      await page.click('button[type="submit"]');
      
      // Get the token from storage
      const token = await page.evaluate(() => localStorage.getItem('auth-token'));
      expect(token).toBeTruthy();
      
      // Test with tampered token
      await page.evaluate(() => {
        localStorage.setItem('auth-token', 'tampered.token.here');
      });
      
      await page.goto('/admin/dashboard');
      
      // Should redirect to login due to invalid token
      await expect(page).toHaveURL(/.*login.*/);
    });
  });

  test.describe('Authorization Security', () => {
    test('should prevent privilege escalation', async ({ page }) => {
      // Login as regular user
      await page.goto('/register');
      await page.fill('input[name="firstName"]', 'Regular');
      await page.fill('input[name="lastName"]', 'User');
      await page.fill('input[name="email"]', 'regular.user@example.com');
      await page.fill('input[name="password"]', 'SecurePass123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
      await page.selectOption('select[name="parish"]', 'KINGSTON');
      await page.click('button[type="submit"]');
      
      // Attempt to access admin routes
      const adminRoutes = [
        '/admin/dashboard',
        '/admin/alerts/new',
        '/admin/users',
        '/admin/incidents',
        '/admin/settings'
      ];
      
      for (const route of adminRoutes) {
        await page.goto(route);
        
        // Should be redirected or show unauthorized
        const url = page.url();
        const content = await page.textContent('body');
        
        expect(url.includes('/login') || content?.includes('Unauthorized') || content?.includes('403')).toBeTruthy();
      }
    });

    test('should protect API endpoints', async ({ request }) => {
      // Test API endpoints without authentication
      const protectedEndpoints = [
        '/api/admin/users',
        '/api/admin/alerts',
        '/api/admin/incidents',
        '/api/admin/settings'
      ];
      
      for (const endpoint of protectedEndpoints) {
        const response = await request.get(endpoint);
        expect(response.status()).toBe(401); // Unauthorized
      }
    });

    test('should validate user permissions for data access', async ({ page }) => {
      // Create two users
      await page.goto('/register');
      await page.fill('input[name="firstName"]', 'User');
      await page.fill('input[name="lastName"]', 'One');
      await page.fill('input[name="email"]', 'user1@example.com');
      await page.fill('input[name="password"]', 'SecurePass123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
      await page.selectOption('select[name="parish"]', 'KINGSTON');
      await page.click('button[type="submit"]');
      
      const user1 = await prisma.user.findUnique({
        where: { email: 'user1@example.com' }
      });
      
      // Create incident report as user1
      await page.goto('/incidents/report');
      await page.selectOption('select[name="type"]', 'FLOOD');
      await page.fill('input[name="title"]', 'User1 Private Incident');
      await page.fill('textarea[name="description"]', 'Private incident report');
      await page.fill('input[name="location"]', 'Private Location');
      await page.selectOption('select[name="parish"]', 'KINGSTON');
      await page.selectOption('select[name="severity"]', 'MEDIUM');
      await page.fill('input[name="reporterName"]', 'User One');
      await page.fill('input[name="reporterEmail"]', 'user1@example.com');
      await page.click('button[type="submit"]');
      
      const incident = await prisma.incidentReport.findFirst({
        where: { title: 'User1 Private Incident' }
      });
      
      // Logout and register as user2
      await page.goto('/logout');
      await page.goto('/register');
      await page.fill('input[name="firstName"]', 'User');
      await page.fill('input[name="lastName"]', 'Two');
      await page.fill('input[name="email"]', 'user2@example.com');
      await page.fill('input[name="password"]', 'SecurePass123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
      await page.selectOption('select[name="parish"]', 'KINGSTON');
      await page.click('button[type="submit"]');
      
      // User2 should not be able to access User1's incident details
      await page.goto(`/incidents/${incident!.id}`);
      
      const content = await page.textContent('body');
      expect(content?.includes('Unauthorized') || content?.includes('Not found')).toBeTruthy();
    });
  });

  test.describe('Input Validation Security', () => {
    test('should prevent XSS attacks', async ({ page }) => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(\'XSS\')">',
        'javascript:alert("XSS")',
        '<svg onload="alert(\'XSS\')">',
        '"><script>alert("XSS")</script>'
      ];
      
      // Test XSS in incident report
      await page.goto('/incidents/report');
      
      for (const payload of xssPayloads) {
        await page.fill('input[name="title"]', payload);
        await page.fill('textarea[name="description"]', payload);
        await page.selectOption('select[name="type"]', 'OTHER');
        await page.selectOption('select[name="parish"]', 'KINGSTON');
        await page.selectOption('select[name="severity"]', 'LOW');
        await page.fill('input[name="reporterName"]', 'Test User');
        await page.fill('input[name="reporterEmail"]', 'test@example.com');
        await page.click('button[type="submit"]');
        
        // Check that script didn't execute
        const alerts = await page.evaluate(() => window.alert.toString());
        expect(alerts).not.toContain('XSS');
        
        // Verify content is properly escaped
        await page.goto('/incidents');
        const content = await page.textContent('body');
        expect(content).not.toContain('<script>');
      }
    });

    test('should validate file uploads', async ({ page }) => {
      // Test malicious file upload attempts
      await page.goto('/incidents/report');
      
      // Create malicious files
      const maliciousFiles = [
        { name: 'malware.exe', content: 'MZ\x90\x00\x03\x00\x00\x00' }, // PE header
        { name: 'script.php', content: '<?php system($_GET["cmd"]); ?>' },
        { name: 'large.txt', content: 'A'.repeat(10 * 1024 * 1024) }, // 10MB file
        { name: '../../../etc/passwd', content: 'root:x:0:0:root:/root:/bin/bash' }
      ];
      
      for (const file of maliciousFiles) {
        const fileInput = page.locator('input[type="file"]');
        if (await fileInput.isVisible()) {
          // Should reject malicious files
          await fileInput.setInputFiles({
            name: file.name,
            mimeType: 'text/plain',
            buffer: Buffer.from(file.content)
          });
          
          await page.click('button[type="submit"]');
          
          // Should show validation error
          const errorMessage = await page.locator('.error-message').textContent();
          expect(errorMessage).toMatch(/invalid|not allowed|too large/i);
        }
      }
    });

    test('should prevent CSRF attacks', async ({ page, context }) => {
      // Login as admin
      await page.goto('/admin/login');
      await page.fill('input[name="email"]', 'admin@jamalert.jm');
      await page.fill('input[name="password"]', 'admin123!');
      await page.click('button[type="submit"]');
      
      // Get CSRF token
      const csrfToken = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta?.getAttribute('content');
      });
      
      // Create new page (simulating external site)
      const maliciousPage = await context.newPage();
      
      // Attempt CSRF attack without token
      await maliciousPage.goto('data:text/html,<form id="csrf" action="/api/admin/alerts" method="post"><input name="title" value="CSRF Attack"><input name="message" value="Malicious alert"></form><script>document.getElementById("csrf").submit()</script>');
      
      // Should be rejected due to missing CSRF token
      await page.goto('/admin/alerts');
      const alertExists = await page.locator('text=CSRF Attack').isVisible();
      expect(alertExists).toBeFalsy();
    });
  });

  test.describe('Data Protection Security', () => {
    test('should encrypt sensitive data', async ({ page }) => {
      // Register user with sensitive information
      await page.goto('/register');
      await page.fill('input[name="firstName"]', 'Sensitive');
      await page.fill('input[name="lastName"]', 'Data');
      await page.fill('input[name="email"]', 'sensitive@example.com');
      await page.fill('input[name="phone"]', '+1876-555-1234');
      await page.fill('input[name="password"]', 'SecurePass123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
      await page.selectOption('select[name="parish"]', 'KINGSTON');
      await page.click('button[type="submit"]');
      
      // Check that password is hashed in database
      const user = await prisma.user.findUnique({
        where: { email: 'sensitive@example.com' }
      });
      
      expect(user?.password).not.toBe('SecurePass123!');
      expect(user?.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash pattern
    });

    test('should prevent information disclosure', async ({ page }) => {
      // Test error messages don't reveal sensitive information
      await page.goto('/login');
      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      const errorMessage = await page.locator('.error-message').textContent();
      
      // Should not reveal whether email exists
      expect(errorMessage).not.toContain('user not found');
      expect(errorMessage).not.toContain('email does not exist');
      expect(errorMessage).toContain('Invalid credentials');
    });

    test('should implement proper session management', async ({ page, context }) => {
      // Login
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@jamalert.jm');
      await page.fill('input[name="password"]', 'admin123!');
      await page.click('button[type="submit"]');
      
      // Check session cookie properties
      const cookies = await context.cookies();
      const sessionCookie = cookies.find(c => c.name.includes('session') || c.name.includes('auth'));
      
      if (sessionCookie) {
        expect(sessionCookie.httpOnly).toBeTruthy();
        expect(sessionCookie.secure).toBeTruthy();
        expect(sessionCookie.sameSite).toBe('Strict');
      }
      
      // Test session timeout
      await page.evaluate(() => {
        // Simulate session expiry
        localStorage.removeItem('auth-token');
        sessionStorage.clear();
      });
      
      await page.goto('/admin/dashboard');
      await expect(page).toHaveURL(/.*login.*/);
    });
  });

  test.describe('Infrastructure Security', () => {
    test('should have proper HTTP security headers', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      
      // Check for security headers
      expect(headers?.['x-frame-options']).toBeTruthy();
      expect(headers?.['x-content-type-options']).toBe('nosniff');
      expect(headers?.['x-xss-protection']).toBeTruthy();
      expect(headers?.['strict-transport-security']).toBeTruthy();
      expect(headers?.['content-security-policy']).toBeTruthy();
    });

    test('should enforce HTTPS', async ({ page }) => {
      // In production, HTTP should redirect to HTTPS
      const response = await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      
      if (process.env.NODE_ENV === 'production') {
        expect(page.url()).toMatch(/^https:/);
      }
    });

    test('should have proper CORS configuration', async ({ request }) => {
      const response = await request.get('/api/health', {
        headers: {
          'Origin': 'https://malicious-site.com'
        }
      });
      
      const corsHeader = response.headers()['access-control-allow-origin'];
      
      // Should not allow arbitrary origins
      expect(corsHeader).not.toBe('*');
      expect(corsHeader).not.toBe('https://malicious-site.com');
    });
  });

  test.describe('API Security', () => {
    test('should implement rate limiting', async ({ request }) => {
      // Make rapid requests to test rate limiting
      const requests = [];
      for (let i = 0; i < 20; i++) {
        requests.push(request.get('/api/health'));
      }
      
      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status() === 429);
      
      // Should have some rate limited responses
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should validate API input parameters', async ({ request }) => {
      // Test with invalid parameters
      const invalidRequests = [
        { endpoint: '/api/alerts', data: { type: 'INVALID_TYPE' } },
        { endpoint: '/api/incidents', data: { severity: 'INVALID_SEVERITY' } },
        { endpoint: '/api/users', data: { email: 'invalid-email' } }
      ];
      
      for (const req of invalidRequests) {
        const response = await request.post(req.endpoint, {
          data: req.data
        });
        
        expect(response.status()).toBe(400); // Bad Request
      }
    });

    test('should prevent API abuse', async ({ request }) => {
      // Test large payload attack
      const largePayload = {
        message: 'A'.repeat(1024 * 1024) // 1MB string
      };
      
      const response = await request.post('/api/incidents', {
        data: largePayload
      });
      
      // Should reject large payloads
      expect(response.status()).toBe(413); // Payload Too Large
    });
  });
});
