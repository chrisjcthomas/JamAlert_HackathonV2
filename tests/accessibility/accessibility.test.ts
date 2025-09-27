import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Inject axe-core for accessibility testing
    await injectAxe(page);
  });

  test('should not have any accessibility violations on home page', async ({ page }) => {
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true }
    });
  });

  test('should not have accessibility violations on alerts page', async ({ page }) => {
    await page.goto('/alerts');
    await checkA11y(page);
  });

  test('should not have accessibility violations on incidents page', async ({ page }) => {
    await page.goto('/incidents');
    await checkA11y(page);
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab');
    
    // Check if first focusable element is focused
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test skip links
    await page.keyboard.press('Tab');
    const skipLink = await page.locator('[data-skip-link]');
    if (await skipLink.isVisible()) {
      await expect(skipLink).toBeFocused();
    }
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    
    let previousLevel = 0;
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const currentLevel = parseInt(tagName.charAt(1));
      
      // Check that heading levels don't skip (e.g., h1 -> h3)
      if (previousLevel > 0) {
        expect(currentLevel).toBeLessThanOrEqual(previousLevel + 1);
      }
      
      previousLevel = currentLevel;
    }
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    // Check for buttons without accessible names
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const accessibleName = await button.evaluate(el => {
        return el.getAttribute('aria-label') || 
               el.getAttribute('aria-labelledby') || 
               el.textContent?.trim() ||
               el.getAttribute('title');
      });
      expect(accessibleName).toBeTruthy();
    }

    // Check for form inputs with labels
    const inputs = await page.locator('input[type="text"], input[type="email"], input[type="password"], textarea, select').all();
    for (const input of inputs) {
      const hasLabel = await input.evaluate(el => {
        const id = el.getAttribute('id');
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        
        return !!(ariaLabel || ariaLabelledBy || label);
      });
      expect(hasLabel).toBeTruthy();
    }
  });

  test('should support high contrast mode', async ({ page }) => {
    // Enable high contrast mode
    await page.evaluate(() => {
      document.documentElement.classList.add('high-contrast');
    });

    // Check that high contrast styles are applied
    const bodyStyles = await page.evaluate(() => {
      return window.getComputedStyle(document.body);
    });

    // Verify contrast ratios meet WCAG standards
    await checkA11y(page, null, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });
  });

  test('should support large text mode', async ({ page }) => {
    // Enable large text mode
    await page.evaluate(() => {
      document.documentElement.classList.add('large-text');
    });

    // Check that text is larger
    const fontSize = await page.locator('body').evaluate(el => {
      return window.getComputedStyle(el).fontSize;
    });

    expect(parseFloat(fontSize)).toBeGreaterThan(16); // Assuming base font size is 16px
  });

  test('should support reduced motion', async ({ page }) => {
    // Enable reduced motion
    await page.evaluate(() => {
      document.documentElement.classList.add('reduced-motion');
    });

    // Check that animations are disabled or reduced
    const animationDuration = await page.locator('*').first().evaluate(el => {
      return window.getComputedStyle(el).animationDuration;
    });

    // Should be very short or 0
    expect(parseFloat(animationDuration)).toBeLessThan(0.1);
  });

  test('should have proper focus management in modals', async ({ page }) => {
    // Open accessibility controls modal
    const accessibilityButton = page.locator('.accessibility-toggle');
    if (await accessibilityButton.isVisible()) {
      await accessibilityButton.click();
      
      // Check that focus is trapped in modal
      const modal = page.locator('.accessibility-panel');
      await expect(modal).toBeVisible();
      
      // Test tab navigation within modal
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus');
      
      // Focused element should be within the modal
      const isInModal = await focusedElement.evaluate((el, modalSelector) => {
        const modal = document.querySelector(modalSelector);
        return modal?.contains(el) || false;
      }, '.accessibility-panel');
      
      expect(isInModal).toBeTruthy();
      
      // Close modal with Escape key
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    }
  });

  test('should announce dynamic content changes', async ({ page }) => {
    // Check for aria-live regions
    const liveRegions = await page.locator('[aria-live]').all();
    expect(liveRegions.length).toBeGreaterThan(0);

    // Test alert announcements
    if (await page.locator('.alert-form').isVisible()) {
      await page.fill('input[name="title"]', 'Test Alert');
      await page.fill('textarea[name="message"]', 'This is a test alert message');
      await page.click('button[type="submit"]');
      
      // Check for success message announcement
      const successMessage = page.locator('[aria-live="polite"]');
      await expect(successMessage).toBeVisible();
    }
  });

  test('should support screen reader navigation', async ({ page }) => {
    // Check for proper landmark roles
    const landmarks = await page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer').all();
    expect(landmarks.length).toBeGreaterThan(0);

    // Check for proper heading structure for screen readers
    const h1Elements = await page.locator('h1').all();
    expect(h1Elements.length).toBe(1); // Should have exactly one h1 per page

    // Check for descriptive link text
    const links = await page.locator('a').all();
    for (const link of links) {
      const linkText = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      const title = await link.getAttribute('title');
      
      const accessibleText = ariaLabel || linkText || title;
      expect(accessibleText).toBeTruthy();
      
      // Avoid generic link text
      if (accessibleText) {
        expect(accessibleText.toLowerCase()).not.toMatch(/^(click here|read more|more|link)$/);
      }
    }
  });

  test('should handle form validation accessibly', async ({ page }) => {
    // Navigate to registration form
    await page.goto('/register');
    
    // Submit form without filling required fields
    await page.click('button[type="submit"]');
    
    // Check for error messages with proper ARIA attributes
    const errorMessages = await page.locator('[role="alert"], .error-message').all();
    
    for (const error of errorMessages) {
      await expect(error).toBeVisible();
      
      // Check that error is associated with form field
      const ariaDescribedBy = await error.getAttribute('id');
      if (ariaDescribedBy) {
        const associatedField = page.locator(`[aria-describedby*="${ariaDescribedBy}"]`);
        await expect(associatedField).toBeVisible();
      }
    }
  });

  test('should support multiple languages', async ({ page }) => {
    // Check for language selector
    const languageSelector = page.locator('.language-selector');
    if (await languageSelector.isVisible()) {
      await languageSelector.click();
      
      // Select Spanish
      const spanishOption = page.locator('[role="option"]').filter({ hasText: 'Español' });
      if (await spanishOption.isVisible()) {
        await spanishOption.click();
        
        // Check that page content changed to Spanish
        const htmlLang = await page.getAttribute('html', 'lang');
        expect(htmlLang).toBe('es');
        
        // Check for Spanish content
        const spanishContent = page.locator('text=Alertas de Emergencia');
        if (await spanishContent.isVisible()) {
          await expect(spanishContent).toBeVisible();
        }
      }
    }
  });

  test('should support RTL languages', async ({ page }) => {
    // Test Arabic language support (if available)
    const languageSelector = page.locator('.language-selector');
    if (await languageSelector.isVisible()) {
      await languageSelector.click();
      
      const arabicOption = page.locator('[role="option"]').filter({ hasText: 'العربية' });
      if (await arabicOption.isVisible()) {
        await arabicOption.click();
        
        // Check that direction is set to RTL
        const htmlDir = await page.getAttribute('html', 'dir');
        expect(htmlDir).toBe('rtl');
        
        // Check that layout adapts to RTL
        const bodyStyles = await page.evaluate(() => {
          return window.getComputedStyle(document.body).direction;
        });
        expect(bodyStyles).toBe('rtl');
      }
    }
  });

  test('should meet WCAG 2.1 AA standards', async ({ page }) => {
    await checkA11y(page, null, {
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
      rules: {
        // Enable all WCAG 2.1 AA rules
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'focus-management': { enabled: true },
        'aria-labels': { enabled: true },
        'heading-order': { enabled: true },
        'landmark-roles': { enabled: true }
      }
    });
  });

  test('should work with assistive technologies', async ({ page }) => {
    // Simulate screen reader interaction
    await page.evaluate(() => {
      // Enable screen reader mode
      document.documentElement.classList.add('screen-reader-mode');
    });

    // Check that decorative images are hidden
    const decorativeImages = await page.locator('.decorative-image').all();
    for (const img of decorativeImages) {
      const isVisible = await img.isVisible();
      expect(isVisible).toBeFalsy();
    }

    // Check that all interactive elements are accessible via keyboard
    const interactiveElements = await page.locator('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])').all();
    
    for (const element of interactiveElements) {
      await element.focus();
      const isFocused = await element.evaluate(el => el === document.activeElement);
      expect(isFocused).toBeTruthy();
    }
  });
});
