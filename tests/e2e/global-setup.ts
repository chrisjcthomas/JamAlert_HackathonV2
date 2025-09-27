import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for E2E tests...');
  
  // Set up test environment
  process.env.NODE_ENV = 'test';
  process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
  
  // Launch browser for setup tasks
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for the application to be ready
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
    console.log(`📡 Checking if application is ready at ${baseURL}...`);
    
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    
    // Verify the application is working
    await page.waitForSelector('body', { timeout: 30000 });
    console.log('✅ Application is ready for testing');
    
    // Set up any global test data or authentication if needed
    // This could include creating test users, setting up mock data, etc.
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('✅ Global setup completed successfully');
}

export default globalSetup;
