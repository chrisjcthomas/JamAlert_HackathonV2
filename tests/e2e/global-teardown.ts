import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for E2E tests...');
  
  try {
    // Clean up any global test data
    // This could include:
    // - Cleaning up test database records
    // - Removing uploaded test files
    // - Clearing cache entries
    // - Resetting any global state
    
    console.log('🗑️ Cleaning up test data...');
    
    // Reset environment variables
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
    
    console.log('✅ Global teardown completed successfully');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw here as it might mask test failures
  }
}

export default globalTeardown;
