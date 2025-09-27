import { test, expect } from '@playwright/test';

test.describe('Complete User Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Enable demo mode for consistent testing
    await page.addInitScript(() => {
      window.localStorage.setItem('demo-mode', 'true');
    });
  });

  test('User Registration → Alert Receipt Workflow', async ({ page }) => {
    // Step 1: Navigate to registration page
    await page.goto('/auth/register');
    await expect(page).toHaveTitle(/JamAlert/);
    
    // Step 2: Fill out registration form
    await page.fill('[data-testid="first-name"]', 'John');
    await page.fill('[data-testid="last-name"]', 'Doe');
    await page.fill('[data-testid="email"]', 'john.doe@test.com');
    await page.fill('[data-testid="phone"]', '+1876-555-0123');
    await page.selectOption('[data-testid="parish"]', 'KINGSTON');
    await page.fill('[data-testid="address"]', '123 Test Street, Kingston');
    
    // Step 3: Submit registration
    await page.click('[data-testid="register-button"]');
    
    // Step 4: Verify registration success
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Registration successful');
    
    // Step 5: Navigate to dashboard
    await page.goto('/dashboard');
    
    // Step 6: Verify user can see alerts
    await expect(page.locator('[data-testid="alerts-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="alert-card"]')).toHaveCount.greaterThan(0);
    
    // Step 7: Check alert preferences
    await page.goto('/my-alerts');
    await expect(page.locator('[data-testid="notification-preferences"]')).toBeVisible();
    
    // Step 8: Verify alert history
    await page.click('[data-testid="alert-history-tab"]');
    await expect(page.locator('[data-testid="alert-history-list"]')).toBeVisible();
  });

  test('Incident Reporting → Admin Review → Alert Dispatch Workflow', async ({ page }) => {
    // Step 1: Navigate to incident reporting
    await page.goto('/report');
    await expect(page.locator('[data-testid="report-form"]')).toBeVisible();
    
    // Step 2: Fill out incident report
    await page.selectOption('[data-testid="incident-type"]', 'FLOOD');
    await page.fill('[data-testid="incident-title"]', 'Flash Flood on Main Street');
    await page.fill('[data-testid="incident-description"]', 'Heavy rainfall causing flooding on Main Street near the market');
    await page.fill('[data-testid="incident-location"]', 'Main Street, Kingston');
    await page.selectOption('[data-testid="incident-severity"]', 'HIGH');
    await page.selectOption('[data-testid="incident-parish"]', 'KINGSTON');
    
    // Step 3: Submit incident report
    await page.click('[data-testid="submit-report-button"]');
    
    // Step 4: Verify submission success
    await expect(page.locator('[data-testid="submission-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-id"]')).toBeVisible();
    
    // Step 5: Admin login (simulate admin workflow)
    await page.goto('/admin/login');
    await page.fill('[data-testid="admin-email"]', 'admin@jamalert.jm');
    await page.fill('[data-testid="admin-password"]', 'admin123');
    await page.click('[data-testid="admin-login-button"]');
    
    // Step 6: Navigate to incident review
    await page.goto('/admin/incidents');
    await expect(page.locator('[data-testid="pending-incidents"]')).toBeVisible();
    
    // Step 7: Review and approve incident
    await page.click('[data-testid="incident-review-button"]');
    await page.click('[data-testid="approve-incident-button"]');
    
    // Step 8: Verify alert dispatch
    await expect(page.locator('[data-testid="alert-dispatched"]')).toBeVisible();
    
    // Step 9: Check alert appears on map
    await page.goto('/');
    await expect(page.locator('[data-testid="alert-map"]')).toBeVisible();
    await page.waitForTimeout(2000); // Wait for map to load
    await expect(page.locator('[data-testid="incident-marker"]')).toHaveCount.greaterThan(0);
  });

  test('User Profile Management → Preference Updates Workflow', async ({ page }) => {
    // Step 1: Navigate to user profile
    await page.goto('/my-alerts');
    await expect(page.locator('[data-testid="profile-section"]')).toBeVisible();
    
    // Step 2: Update personal information
    await page.fill('[data-testid="profile-first-name"]', 'Jane');
    await page.fill('[data-testid="profile-last-name"]', 'Smith');
    await page.fill('[data-testid="profile-phone"]', '+1876-555-0456');
    
    // Step 3: Update notification preferences
    await page.click('[data-testid="preferences-tab"]');
    await page.check('[data-testid="sms-alerts-toggle"]');
    await page.check('[data-testid="emergency-only-toggle"]');
    
    // Step 4: Update accessibility settings
    await page.click('[data-testid="accessibility-tab"]');
    await page.check('[data-testid="high-contrast-toggle"]');
    await page.selectOption('[data-testid="font-size-select"]', 'large');
    
    // Step 5: Save changes
    await page.click('[data-testid="save-profile-button"]');
    
    // Step 6: Verify changes saved
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
    
    // Step 7: Verify preferences applied
    await page.reload();
    await expect(page.locator('[data-testid="sms-alerts-toggle"]')).toBeChecked();
    await expect(page.locator('[data-testid="emergency-only-toggle"]')).toBeChecked();
    await expect(page.locator('[data-testid="high-contrast-toggle"]')).toBeChecked();
  });

  test('Alert Feedback → System Improvement Workflow', async ({ page }) => {
    // Step 1: Navigate to alert history
    await page.goto('/my-alerts');
    await page.click('[data-testid="alert-history-tab"]');
    
    // Step 2: Select an alert to provide feedback
    await page.click('[data-testid="alert-feedback-button"]');
    
    // Step 3: Provide feedback
    await page.click('[data-testid="feedback-rating-4"]'); // 4-star rating
    await page.check('[data-testid="feedback-accurate"]');
    await page.check('[data-testid="feedback-helpful"]');
    await page.fill('[data-testid="feedback-comment"]', 'Alert was timely and helped me avoid the flooded area');
    
    // Step 4: Submit feedback
    await page.click('[data-testid="submit-feedback-button"]');
    
    // Step 5: Verify feedback submitted
    await expect(page.locator('[data-testid="feedback-success"]')).toBeVisible();
    
    // Step 6: Verify feedback appears in admin dashboard
    await page.goto('/admin/login');
    await page.fill('[data-testid="admin-email"]', 'admin@jamalert.jm');
    await page.fill('[data-testid="admin-password"]', 'admin123');
    await page.click('[data-testid="admin-login-button"]');
    
    await page.goto('/admin/feedback');
    await expect(page.locator('[data-testid="feedback-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="feedback-item"]')).toHaveCount.greaterThan(0);
  });

  test('Emergency Alert → Multi-Channel Notification Workflow', async ({ page }) => {
    // Step 1: Admin creates emergency alert
    await page.goto('/admin/login');
    await page.fill('[data-testid="admin-email"]', 'admin@jamalert.jm');
    await page.fill('[data-testid="admin-password"]', 'admin123');
    await page.click('[data-testid="admin-login-button"]');
    
    // Step 2: Navigate to alert creation
    await page.goto('/admin/alerts/create');
    await page.selectOption('[data-testid="alert-type"]', 'EMERGENCY');
    await page.selectOption('[data-testid="alert-severity"]', 'HIGH');
    await page.fill('[data-testid="alert-title"]', 'Hurricane Warning');
    await page.fill('[data-testid="alert-message"]', 'Hurricane approaching. Seek immediate shelter.');
    await page.selectOption('[data-testid="alert-parish"]', 'all');
    
    // Step 3: Configure notification channels
    await page.check('[data-testid="email-notification"]');
    await page.check('[data-testid="sms-notification"]');
    await page.check('[data-testid="push-notification"]');
    
    // Step 4: Send alert
    await page.click('[data-testid="send-alert-button"]');
    
    // Step 5: Verify alert dispatch
    await expect(page.locator('[data-testid="alert-sent-confirmation"]')).toBeVisible();
    
    // Step 6: Check alert appears on public dashboard
    await page.goto('/');
    await expect(page.locator('[data-testid="emergency-alert-banner"]')).toBeVisible();
    await expect(page.locator('[data-testid="emergency-alert-banner"]')).toContainText('Hurricane Warning');
    
    // Step 7: Verify alert on map
    await expect(page.locator('[data-testid="alert-map"]')).toBeVisible();
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="emergency-marker"]')).toBeVisible();
  });
});
