import { test, expect } from '@playwright/test';

test.describe('Auth Debug - Registration and Login Flow', () => {
  test('debug registration flow with detailed logging', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err));
    
    // Listen to network requests
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log('→ REQUEST:', request.method(), request.url());
      }
    });
    
    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        console.log('← RESPONSE:', response.status(), response.url());
        try {
          const body = await response.text();
          console.log('   Body:', body.substring(0, 200));
        } catch (e) {
          console.log('   Could not read body');
        }
      }
    });

    console.log('\n=== STEP 1: Navigate to registration page ===');
    await page.goto('http://localhost:3001/register');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/01-registration-page.png', fullPage: true });
    console.log('Screenshot saved: 01-registration-page.png');

    console.log('\n=== STEP 2: Fill registration form ===');
    const timestamp = Date.now();
    const email = `debuguser${timestamp}@test.com`;
    console.log('Using email:', email);
    
    await page.fill('input[id="firstName"]', 'Debug');
    await page.fill('input[id="lastName"]', 'User');
    await page.fill('input[id="email"]', email);
    await page.fill('input[id="password"]', 'DebugPass123');
    await page.fill('input[id="confirmPassword"]', 'DebugPass123');
    await page.fill('input[id="phone"]', '8761234567');
    
    console.log('\n=== STEP 3: Select parish ===');
    await page.click('button[role="combobox"]');
    await page.waitForTimeout(500);
    // Click on the option within the dropdown menu
    await page.locator('[role="option"]').filter({ hasText: 'Kingston' }).click();
    
    console.log('\n=== STEP 4: Check alert preferences ===');
    await page.check('input[id="emailAlerts"]');
    await page.check('input[id="terms"]');
    
    await page.screenshot({ path: 'test-results/02-form-filled.png', fullPage: true });
    console.log('Screenshot saved: 02-form-filled.png');
    
    console.log('\n=== STEP 5: Submit form ===');
    await page.click('button[type="submit"]:has-text("Register for Alerts")');
    
    // Wait for either success message or redirect
    console.log('\n=== STEP 6: Waiting for response ===');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-results/03-after-submit.png', fullPage: true });
    console.log('Screenshot saved: 03-after-submit.png');
    
    // Check current URL
    console.log('Current URL:', page.url());
    
    // Check localStorage
    const authToken = await page.evaluate(() => localStorage.getItem('auth-token'));
    const authUser = await page.evaluate(() => localStorage.getItem('auth-user'));
    console.log('Auth Token exists:', !!authToken);
    console.log('Auth Token (first 20 chars):', authToken?.substring(0, 20));
    console.log('Auth User:', authUser);
    
    // Wait for redirect to dashboard
    console.log('\n=== STEP 7: Checking for redirect ===');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'test-results/04-after-redirect.png', fullPage: true });
    console.log('Screenshot saved: 04-after-redirect.png');
    console.log('Final URL:', page.url());
    
    // Check if we're on dashboard
    const isOnDashboard = page.url().includes('/dashboard');
    console.log('Is on dashboard:', isOnDashboard);
    
    if (!isOnDashboard) {
      console.log('\n❌ REDIRECT FAILED - Still not on dashboard!');
      
      // Check if there's an error message
      const errorText = await page.textContent('body');
      console.log('Page text includes "login":', errorText?.toLowerCase().includes('login'));
      console.log('Page text includes "register":', errorText?.toLowerCase().includes('register'));
    } else {
      console.log('\n✅ SUCCESS - Redirected to dashboard!');
    }
    
    // Check for ProtectedRoute behavior
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/05-final-state.png', fullPage: true });
    console.log('Screenshot saved: 05-final-state.png');
    console.log('Very final URL:', page.url());
    
    expect(page.url()).toContain('/dashboard');
  });

  test('debug login flow with registered user', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    
    // Listen to network requests
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log('→ REQUEST:', request.method(), request.url());
      }
    });
    
    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        console.log('← RESPONSE:', response.status(), response.url());
        try {
          const body = await response.text();
          console.log('   Body:', body.substring(0, 200));
        } catch (e) {}
      }
    });

    console.log('\n=== LOGIN TEST: Navigate to login page ===');
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('networkidle');
    
    await page.screenshot({ path: 'test-results/login-01-page.png', fullPage: true });
    
    console.log('\n=== LOGIN TEST: Fill login form ===');
    // Use the user we registered earlier (from API test)
    await page.fill('input[type="email"]', 'newuser@test.com');
    await page.fill('input[type="password"]', 'TestPass123');
    
    await page.screenshot({ path: 'test-results/login-02-filled.png', fullPage: true });
    
    console.log('\n=== LOGIN TEST: Submit ===');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/login-03-after-submit.png', fullPage: true });
    
    console.log('Current URL:', page.url());
    
    // Check localStorage
    const authToken = await page.evaluate(() => localStorage.getItem('auth-token'));
    const authUser = await page.evaluate(() => localStorage.getItem('auth-user'));
    console.log('Auth Token exists:', !!authToken);
    console.log('Auth User:', authUser);
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/login-04-final.png', fullPage: true });
    console.log('Final URL:', page.url());
    
    expect(page.url()).toContain('/dashboard');
  });
});
