#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting JamAlert Services...\n');

// Start backend
console.log('📦 Starting Backend (Express.js on port 8000)...');
const backendProcess = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, 'backend/express-app'),
  stdio: 'inherit',
  shell: true
});

backendProcess.on('error', (err) => {
  console.error('❌ Backend error:', err);
});

// Wait a bit before starting frontend
setTimeout(() => {
  console.log('\n📱 Starting Frontend (Next.js on port 3000)...');
  const frontendProcess = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });

  frontendProcess.on('error', (err) => {
    console.error('❌ Frontend error:', err);
  });
}, 3000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down services...');
  backendProcess.kill();
  process.exit(0);
});

