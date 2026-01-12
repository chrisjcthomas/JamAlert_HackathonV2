const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:8000';

/**
 * Rate Limiting Verification Test
 *
 * This test verifies that the rate limiting middleware is correctly configured
 * for both global routes and authentication endpoints.
 *
 * Pre-requisites: The server must be running on localhost:8000.
 */
async function testRateLimit() {
  console.log('🛡️  Testing Rate Limiting Configuration\n');

  let passed = true;

  // 1. Test Auth Endpoint (Strict Limit)
  // Limit: 5 requests per 15 mins
  console.log('Test 1: Auth Rate Limit (Limit: 5)');
  console.log('Sending 10 login requests...');

  let authSuccessCount = 0;
  let authFailCount = 0;

  const authPromises = [];
  for (let i = 0; i < 10; i++) {
    // We expect the first 5 to "succeed" (get processed, even if 401)
    // and the next 5 to be rate limited (429)
    authPromises.push(
      axios.post(`${BASE_URL}/api/auth/login`, { email: 'test@example.com', password: 'wrong' })
        .then(() => { authSuccessCount++; })
        .catch((err) => {
          if (err.response && err.response.status === 401) {
            authSuccessCount++; // 401 is success for this test (it reached the handler)
          } else if (err.response && err.response.status === 429) {
            authFailCount++;
          } else {
             // Other errors are failures
             console.error(`   Unexpected error: ${err.message}`);
          }
        })
    );
  }

  await Promise.all(authPromises);
  console.log(`   Result: ${authSuccessCount} allowed, ${authFailCount} blocked`);

  if (authSuccessCount === 5 && authFailCount === 5) {
      console.log("   ✅ PASSED: Auth limiter blocked excess requests correctly.");
  } else {
      console.log(`   ❌ FAILED: Expected 5 allowed and 5 blocked.`);
      passed = false;
  }

  // 2. Test Global Endpoint
  // Limit: 100 requests per 15 mins
  // Note: Previous requests count towards the global limit.
  // We used 10 requests (5 allowed, 5 blocked).
  // We need to send enough to breach 100 total.

  console.log('\nTest 2: Global Rate Limit (Limit: 100)');
  console.log('Sending 120 health check requests...');

  let globalSuccessCount = 0;
  let globalFailCount = 0;

  const globalPromises = [];
  for (let i = 0; i < 120; i++) {
    globalPromises.push(
      axios.get(`${BASE_URL}/api/health`)
        .then(() => { globalSuccessCount++; })
        .catch((err) => {
          if (err.response && err.response.status === 429) {
            globalFailCount++;
          } else {
             console.error(`   Unexpected error: ${err.message}`);
          }
        })
    );
  }

  await Promise.all(globalPromises);
  console.log(`   Result: ${globalSuccessCount} allowed, ${globalFailCount} blocked`);

  // We expect failures because 10 + 120 > 100.
  if (globalFailCount > 0) {
      console.log("   ✅ PASSED: Global limiter blocked excess requests.");
  } else {
      console.log("   ❌ FAILED: Global limiter did not block any requests.");
      passed = false;
  }

  console.log('\n' + '='.repeat(40));
  if (passed) {
    console.log('✅ RATE LIMITING VERIFICATION PASSED');
    process.exit(0);
  } else {
    console.log('❌ RATE LIMITING VERIFICATION FAILED');
    process.exit(1);
  }
}

// Check if server is running
axios.get(`${BASE_URL}/api/health`)
  .then(() => {
    testRateLimit();
  })
  .catch((err) => {
    console.error('❌ Server is not running. Please start the server first.');
    console.error('   Usage: node server.js (in one terminal) & node tests/rate-limit.test.js (in another)');
    process.exit(1);
  });
