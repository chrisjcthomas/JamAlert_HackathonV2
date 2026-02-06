const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyRateLimit() {
  console.log('🛡️ Starting Rate Limit Verification...');

  // 1. Start the server
  const serverPath = path.join(__dirname, 'server.js');
  const serverProcess = spawn('node', [serverPath], {
    env: { ...process.env, PORT: '8001' }, // Use a different port
    stdio: 'pipe'
  });

  let serverReady = false;
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    // console.log('[Server]:', output);
    if (output.includes('running on port 8001')) {
      serverReady = true;
    }
  });

  serverProcess.stderr.on('data', (data) => {
    console.error('[Server Error]:', data.toString());
  });

  // Wait for server to start
  console.log('⏳ Waiting for server to start...');
  for (let i = 0; i < 10; i++) {
    if (serverReady) break;
    await sleep(1000);
  }

  if (!serverReady) {
    console.error('❌ Server failed to start');
    serverProcess.kill();
    process.exit(1);
  }

  const baseURL = 'http://localhost:8001/api/auth/login';
  const MAX_REQUESTS = 10;
  let successCount = 0;
  let blockedCount = 0;

  console.log(`🚀 Sending ${MAX_REQUESTS + 5} requests to ${baseURL}...`);

  try {
    for (let i = 1; i <= MAX_REQUESTS + 5; i++) {
      try {
        await axios.post(baseURL, {
          email: 'test@example.com',
          password: 'wrongpassword'
        });
        // If it succeeds (returns 200 or 401), it's not rate limited
        console.log(`✅ Request ${i}: Allowed (Expected for first ${MAX_REQUESTS})`);
        successCount++;
      } catch (error) {
        if (error.response && error.response.status === 429) {
          console.log(`🛑 Request ${i}: Blocked (429 Too Many Requests)`);
          blockedCount++;
        } else if (error.response && error.response.status === 401) {
             // 401 is expected for wrong password
             console.log(`✅ Request ${i}: Allowed (401 Unauthorized)`);
             successCount++;
        } else {
          console.log(`⚠️ Request ${i}: Unexpected status ${error.response ? error.response.status : error.message}`);
        }
      }
    }

    console.log('--- Results ---');
    console.log(`Successful requests: ${successCount}`);
    console.log(`Blocked requests: ${blockedCount}`);

    if (successCount === MAX_REQUESTS && blockedCount >= 5) {
      console.log('✅ VERIFICATION PASSED: Rate limiter is working correctly.');
      serverProcess.kill();
      process.exit(0);
    } else {
      console.error('❌ VERIFICATION FAILED: Rate limiter did not behave as expected.');
      console.error(`Expected ${MAX_REQUESTS} allowed and subsequent blocked.`);
      serverProcess.kill();
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error during verification:', error);
    serverProcess.kill();
    process.exit(1);
  }
}

verifyRateLimit();
