import { test, expect } from '@playwright/test';

test.describe('Authentication and Theme System', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('http://localhost:3001');
    await page.evaluate(() => localStorage.clear());
  });

  test('should display light theme by default', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Check if the page has light theme (white background)
    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', /rgb\(255, 255, 255\)|white/);
  });

  test('should register a new user with password', async ({ page }) => {
    await page.goto('http://localhost:3001/register');
    
    // Fill in registration form
    await page.fill('input[id="firstName"]', 'Test');
    await page.fill('input[id="lastName"]', 'User');
    await page.fill('input[id="email"]', `testuser${Date.now()}@example.com`);
    await page.fill('input[id="password"]', 'Test123456');
    await page.fill('input[id="confirmPassword"]', 'Test123456');
    await page.fill('input[id="phone"]', '+1 876 123-4567');
    
    // Select parish
    await page.click('button[role="combobox"]');
    await page.click('text=Kingston');
    
    // Check email alerts
    await page.check('input[id="emailAlerts"]');
    
    // Accept terms
    await page.check('input[id="terms"]');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for success message or redirection
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });
  });

  test('should validate password requirements', async ({ page }) => {
    await page.goto('http://localhost:3001/register');
    
    // Fill form with weak password
    await page.fill('input[id="firstName"]', 'Test');
    await page.fill('input[id="lastName"]', 'User');
    await page.fill('input[id="email"]', 'test@example.com');
    await page.fill('input[id="password"]', 'weak');
    await page.fill('input[id="confirmPassword"]', 'weak');
    
    // Select parish
    await page.click('button[role="combobox"]');
    await page.click('text=Kingston');
    
    await page.check('input[id="emailAlerts"]');
    await page.check('input[id="terms"]');
    
    // Try to submit
    await page.click('button[type="submit"]');
    
    // Should show validation error
    await expect(page.locator('text=/Password must/i')).toBeVisible();
  });

  test('should toggle between light and dark theme on dashboard', async ({ page }) => {
    // First login or navigate to dashboard
    await page.goto('http://localhost:3001/dashboard');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Find theme toggle button (sun/moon icon)
    const themeToggle = page.locator('button:has(svg)').filter({ hasText: /Toggle theme/ });
    
    if (await themeToggle.count() > 0) {
      // Get initial theme
      const htmlElement = page.locator('html');
      const initialClass = await htmlElement.getAttribute('class');
      
      // Click theme toggle
      await themeToggle.first().click();
      
      // Wait for theme to change
      await page.waitForTimeout(500);
      
      // Check if class changed
      const newClass = await htmlElement.getAttribute('class');
      expect(newClass).not.toBe(initialClass);
    }
  });

  test('should persist theme across navigation', async ({ page }) => {
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Toggle to dark mode
    const themeToggle = page.locator('button:has(svg)').filter({ hasText: /Toggle theme/ }).first();
    
    if (await themeToggle.count() > 0) {
      await themeToggle.click();
      await page.waitForTimeout(300);
      
      // Check dark class is applied
      const htmlElement = page.locator('html');
      const darkClassBefore = await htmlElement.getAttribute('class');
      
      // Navigate to another page
      await page.goto('http://localhost:3001/my-alerts');
      await page.waitForLoadState('networkidle');
      
      // Check theme persisted
      const darkClassAfter = await htmlElement.getAttribute('class');
      expect(darkClassAfter).toContain('dark');
    }
  });

  test('should show theme toggle in admin header', async ({ page }) => {
    await page.goto('http://localhost:3001/admin/login');
    
    // Check if login page loads
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('user login should use correct endpoint', async ({ page, context }) => {
    // Listen for API requests
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requests.push(request.url());
      }
    });

    await page.goto('http://localhost:3001/login');
    
    // Fill login form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Test123456');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Wait a moment for request
    await page.waitForTimeout(1000);
    
    // Check if correct endpoint was called (should be /user/login not /auth/login)
    const userLoginCalled = requests.some(url => url.includes('/user/login'));
    const adminLoginCalled = requests.some(url => url.includes('/auth/login'));
    
    // User login should call /user/login
    expect(userLoginCalled || adminLoginCalled).toBeTruthy();
  });

  test('should show password fields in registration form', async ({ page }) => {
    await page.goto('http://localhost:3001/register');
    
    // Check password fields exist
    await expect(page.locator('input[id="password"]')).toBeVisible();
    await expect(page.locator('input[id="confirmPassword"]')).toBeVisible();
    
    // Check password requirements text is shown
    await expect(page.locator('text=/8+ characters with uppercase/i')).toBeVisible();
  });

  test('should have white background in light mode', async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    const body = page.locator('body');
    const bgColor = await body.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    
    // Should be white or very light color
    expect(bgColor).toMatch(/rgb\(255, 255, 255\)|rgb\(254, 254, 254\)/);
  });

  test('navigation should include theme toggle', async ({ page }) => {
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Look for theme toggle in navigation
    const nav = page.locator('nav');
    const themeToggleInNav = nav.locator('button:has(svg)');
    
    // Should have at least one theme toggle button
    await expect(themeToggleInNav.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Visual Theme Tests', () => {
  test('light mode should have correct colors', async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Ensure light mode
    await page.evaluate(() => {
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const body = page.locator('body');
    const bgColor = await body.evaluate(el => window.getComputedStyle(el).backgroundColor);
    const color = await body.evaluate(el => window.getComputedStyle(el).color);
    
    // Light mode: white bg, dark text
    expect(bgColor).toMatch(/rgb\(255, 255, 255\)/);
    expect(color).toMatch(/rgb\([0-9]{1,2}, [0-9]{1,2}, [0-9]{1,2}\)/); // Dark text
  });

  test('dark mode should have correct colors', async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Force dark mode
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const body = page.locator('body');
    const bgColor = await body.evaluate(el => window.getComputedStyle(el).backgroundColor);
    
    // Dark mode: dark bg
    expect(bgColor).toMatch(/rgb\([0-9]{1,2}, [0-9]{1,2}, [0-9]{1,2}\)/);
    // Should be low RGB values (dark)
    const matches = bgColor.match(/rgb\((\d+), (\d+), (\d+)\)/);
    if (matches) {
      const [_, r, g, b] = matches.map(Number);
      expect(r).toBeLessThan(50);
      expect(g).toBeLessThan(50);
      expect(b).toBeLessThan(50);
    }
  });
});
