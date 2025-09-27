import { test, expect } from '@playwright/test';

test.describe('Critical User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('demo-mode', 'true');
    });
  });

  test('Mobile User Emergency Alert Reception', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices');
    
    // Step 1: Navigate to mobile dashboard
    await page.goto('/');
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    
    // Step 2: Verify mobile-optimized layout
    await expect(page.locator('[data-testid="alert-map"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-alert-list"]')).toBeVisible();
    
    // Step 3: Test touch interactions
    await page.tap('[data-testid="alert-card"]');
    await expect(page.locator('[data-testid="alert-details"]')).toBeVisible();
    
    // Step 4: Test map interactions
    await page.tap('[data-testid="alert-map"]');
    await page.waitForTimeout(1000);
    
    // Step 5: Test emergency alert banner
    await expect(page.locator('[data-testid="emergency-alert-banner"]')).toBeVisible();
    await page.tap('[data-testid="emergency-alert-banner"]');
    await expect(page.locator('[data-testid="emergency-details"]')).toBeVisible();
  });

  test('Accessibility Navigation Journey', async ({ page }) => {
    // Step 1: Enable accessibility features
    await page.goto('/my-alerts');
    await page.click('[data-testid="accessibility-tab"]');
    await page.check('[data-testid="high-contrast-toggle"]');
    await page.selectOption('[data-testid="font-size-select"]', 'extra-large');
    await page.check('[data-testid="reduce-motion-toggle"]');
    
    // Step 2: Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Step 3: Verify high contrast mode
    const body = page.locator('body');
    await expect(body).toHaveClass(/high-contrast/);
    
    // Step 4: Test screen reader compatibility
    await expect(page.locator('[aria-label="Main navigation"]')).toBeVisible();
    await expect(page.locator('[role="alert"]')).toHaveCount.greaterThanOrEqual(0);
    
    // Step 5: Test focus management
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('Offline Functionality Journey', async ({ page, context }) => {
    // Step 1: Load the application
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Go offline
    await context.setOffline(true);
    
    // Step 3: Test cached content access
    await page.reload();
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();
    
    // Step 4: Test offline form functionality
    await page.goto('/report');
    await page.fill('[data-testid="incident-title"]', 'Offline Test Report');
    await page.fill('[data-testid="incident-description"]', 'Testing offline functionality');
    
    // Step 5: Verify offline storage
    await page.click('[data-testid="save-draft-button"]');
    await expect(page.locator('[data-testid="draft-saved"]')).toBeVisible();
    
    // Step 6: Go back online
    await context.setOffline(false);
    await page.reload();
    
    // Step 7: Verify sync functionality
    await expect(page.locator('[data-testid="sync-notification"]')).toBeVisible();
  });

  test('Performance Under Load Journey', async ({ page }) => {
    // Step 1: Navigate to map with many incidents
    await page.goto('/?test-load=true');
    
    // Step 2: Measure initial load time
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="alert-map"]');
    const loadTime = Date.now() - startTime;
    
    // Verify reasonable load time (under 3 seconds)
    expect(loadTime).toBeLessThan(3000);
    
    // Step 3: Test map performance with many markers
    await page.waitForSelector('[data-testid="incident-marker"]');
    const markerCount = await page.locator('[data-testid="incident-marker"]').count();
    expect(markerCount).toBeGreaterThan(50);
    
    // Step 4: Test scrolling performance
    const alertList = page.locator('[data-testid="alert-list"]');
    await alertList.scrollIntoViewIfNeeded();
    
    // Step 5: Test filter performance
    await page.selectOption('[data-testid="parish-filter"]', 'KINGSTON');
    await page.waitForTimeout(500);
    
    const filteredMarkers = await page.locator('[data-testid="incident-marker"]').count();
    expect(filteredMarkers).toBeLessThan(markerCount);
  });

  test('Multi-Language Support Journey', async ({ page }) => {
    // Step 1: Navigate to language settings
    await page.goto('/settings');
    await expect(page.locator('[data-testid="language-selector"]')).toBeVisible();
    
    // Step 2: Switch to Spanish
    await page.selectOption('[data-testid="language-selector"]', 'es');
    
    // Step 3: Verify Spanish content
    await expect(page.locator('[data-testid="nav-home"]')).toContainText('Inicio');
    await expect(page.locator('[data-testid="nav-alerts"]')).toContainText('Alertas');
    
    // Step 4: Test form in Spanish
    await page.goto('/report');
    await expect(page.locator('[data-testid="form-title"]')).toContainText('Reportar Incidente');
    
    // Step 5: Switch back to English
    await page.selectOption('[data-testid="language-selector"]', 'en');
    await expect(page.locator('[data-testid="nav-home"]')).toContainText('Home');
  });

  test('Data Privacy and Security Journey', async ({ page }) => {
    // Step 1: Test anonymous reporting
    await page.goto('/report');
    await page.check('[data-testid="anonymous-report"]');
    
    // Step 2: Fill out anonymous report
    await page.fill('[data-testid="incident-title"]', 'Anonymous Test Report');
    await page.fill('[data-testid="incident-description"]', 'Testing anonymous reporting');
    await page.selectOption('[data-testid="incident-type"]', 'ACCIDENT');
    
    // Step 3: Verify no personal data required
    await expect(page.locator('[data-testid="personal-info-section"]')).not.toBeVisible();
    
    // Step 4: Submit anonymous report
    await page.click('[data-testid="submit-report-button"]');
    await expect(page.locator('[data-testid="anonymous-success"]')).toBeVisible();
    
    // Step 5: Test data deletion request
    await page.goto('/my-alerts');
    await page.click('[data-testid="privacy-tab"]');
    await page.click('[data-testid="delete-data-button"]');
    
    // Step 6: Confirm deletion
    await page.fill('[data-testid="deletion-confirmation"]', 'DELETE');
    await page.click('[data-testid="confirm-deletion-button"]');
    
    // Step 7: Verify deletion request
    await expect(page.locator('[data-testid="deletion-requested"]')).toBeVisible();
  });

  test('Admin Emergency Response Journey', async ({ page }) => {
    // Step 1: Admin login
    await page.goto('/admin/login');
    await page.fill('[data-testid="admin-email"]', 'admin@jamalert.jm');
    await page.fill('[data-testid="admin-password"]', 'admin123');
    await page.click('[data-testid="admin-login-button"]');
    
    // Step 2: Emergency dashboard access
    await page.goto('/admin/emergency');
    await expect(page.locator('[data-testid="emergency-controls"]')).toBeVisible();
    
    // Step 3: Create emergency alert
    await page.click('[data-testid="create-emergency-alert"]');
    await page.selectOption('[data-testid="emergency-type"]', 'HURRICANE');
    await page.fill('[data-testid="emergency-message"]', 'Hurricane Category 3 approaching. Evacuate immediately.');
    
    // Step 4: Select affected areas
    await page.check('[data-testid="parish-kingston"]');
    await page.check('[data-testid="parish-st-andrew"]');
    
    // Step 5: Configure notification channels
    await page.check('[data-testid="all-channels"]');
    
    // Step 6: Send emergency alert
    await page.click('[data-testid="send-emergency-alert"]');
    
    // Step 7: Monitor dispatch status
    await expect(page.locator('[data-testid="dispatch-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="dispatch-progress"]')).toBeVisible();
    
    // Step 8: Verify alert delivery metrics
    await page.waitForTimeout(3000);
    await expect(page.locator('[data-testid="delivery-metrics"]')).toBeVisible();
    
    const deliveryRate = await page.locator('[data-testid="delivery-rate"]').textContent();
    expect(deliveryRate).toMatch(/\d+%/);
  });

  test('System Recovery Journey', async ({ page }) => {
    // Step 1: Simulate system error
    await page.route('**/api/**', route => {
      if (Math.random() < 0.3) { // 30% failure rate
        route.abort('failed');
      } else {
        route.continue();
      }
    });
    
    // Step 2: Navigate to dashboard
    await page.goto('/');
    
    // Step 3: Verify error handling
    await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible();
    
    // Step 4: Test retry functionality
    await page.click('[data-testid="retry-button"]');
    
    // Step 5: Clear route interception
    await page.unroute('**/api/**');
    
    // Step 6: Verify recovery
    await page.reload();
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
  });
});
