#!/usr/bin/env node

/**
 * Comprehensive health check script for JamAlert deployment
 * Validates backend API, frontend, database connectivity, and external services
 */

const https = require('https');
const http = require('http');

class HealthChecker {
  constructor(config) {
    this.config = config;
    this.results = [];
    this.startTime = Date.now();
  }

  async runAllChecks() {
    console.log('🏥 Starting comprehensive health checks...\n');

    const checks = [
      { name: 'Backend API Health', fn: () => this.checkBackendHealth() },
      { name: 'Frontend Availability', fn: () => this.checkFrontendHealth() },
      { name: 'Database Connectivity', fn: () => this.checkDatabaseHealth() },
      { name: 'API Authentication', fn: () => this.checkAuthenticationHealth() },
      { name: 'Alert System', fn: () => this.checkAlertSystemHealth() },
      { name: 'External Services', fn: () => this.checkExternalServicesHealth() },
      { name: 'Performance Metrics', fn: () => this.checkPerformanceHealth() }
    ];

    for (const check of checks) {
      try {
        console.log(`🔍 Checking: ${check.name}...`);
        const result = await check.fn();
        this.results.push({ name: check.name, status: 'PASS', ...result });
        console.log(`✅ ${check.name}: PASS\n`);
      } catch (error) {
        this.results.push({ 
          name: check.name, 
          status: 'FAIL', 
          error: error.message,
          details: error.details || null
        });
        console.log(`❌ ${check.name}: FAIL - ${error.message}\n`);
      }
    }

    return this.generateReport();
  }

  async checkBackendHealth() {
    const healthUrl = `${this.config.backendUrl}/api/health`;
    const response = await this.makeRequest(healthUrl);
    
    if (response.statusCode !== 200) {
      throw new Error(`Health endpoint returned ${response.statusCode}`);
    }

    const data = JSON.parse(response.body);
    if (data.status !== 'healthy') {
      throw new Error(`Health check failed: ${data.message || 'Unknown error'}`);
    }

    return {
      responseTime: response.responseTime,
      version: data.version,
      timestamp: data.timestamp
    };
  }

  async checkFrontendHealth() {
    const response = await this.makeRequest(this.config.frontendUrl);
    
    if (response.statusCode !== 200) {
      throw new Error(`Frontend returned ${response.statusCode}`);
    }

    // Check if the response contains expected content
    if (!response.body.includes('JamAlert') && !response.body.includes('<!DOCTYPE html>')) {
      throw new Error('Frontend response does not contain expected content');
    }

    return {
      responseTime: response.responseTime,
      contentLength: response.body.length
    };
  }

  async checkDatabaseHealth() {
    const dbHealthUrl = `${this.config.backendUrl}/api/health/database`;
    const response = await this.makeRequest(dbHealthUrl);
    
    if (response.statusCode !== 200) {
      throw new Error(`Database health check returned ${response.statusCode}`);
    }

    const data = JSON.parse(response.body);
    if (!data.connected) {
      throw new Error(`Database connection failed: ${data.error || 'Unknown error'}`);
    }

    return {
      responseTime: response.responseTime,
      connectionPool: data.connectionPool,
      queryTime: data.queryTime
    };
  }

  async checkAuthenticationHealth() {
    // Test user registration endpoint
    const registerUrl = `${this.config.backendUrl}/api/auth/register`;
    const testUser = {
      firstName: 'Health',
      lastName: 'Check',
      email: `healthcheck-${Date.now()}@test.com`,
      parish: 'KINGSTON',
      emailAlerts: true
    };

    const response = await this.makeRequest(registerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });

    if (response.statusCode !== 201) {
      throw new Error(`User registration failed with ${response.statusCode}`);
    }

    const data = JSON.parse(response.body);
    if (!data.success || !data.data.user.id) {
      throw new Error('User registration response invalid');
    }

    return {
      responseTime: response.responseTime,
      userId: data.data.user.id
    };
  }

  async checkAlertSystemHealth() {
    const alertsUrl = `${this.config.backendUrl}/api/alerts`;
    const response = await this.makeRequest(alertsUrl);
    
    if (response.statusCode !== 200) {
      throw new Error(`Alerts endpoint returned ${response.statusCode}`);
    }

    const data = JSON.parse(response.body);
    if (!data.success) {
      throw new Error(`Alerts endpoint failed: ${data.error || 'Unknown error'}`);
    }

    return {
      responseTime: response.responseTime,
      alertCount: data.data.alerts.length
    };
  }

  async checkExternalServicesHealth() {
    const servicesUrl = `${this.config.backendUrl}/api/health/services`;
    const response = await this.makeRequest(servicesUrl);
    
    if (response.statusCode !== 200) {
      throw new Error(`Services health check returned ${response.statusCode}`);
    }

    const data = JSON.parse(response.body);
    const failedServices = Object.entries(data.services)
      .filter(([_, status]) => status !== 'healthy')
      .map(([service, _]) => service);

    if (failedServices.length > 0) {
      throw new Error(`External services failed: ${failedServices.join(', ')}`);
    }

    return {
      responseTime: response.responseTime,
      services: data.services
    };
  }

  async checkPerformanceHealth() {
    const performanceUrl = `${this.config.backendUrl}/api/health/performance`;
    const response = await this.makeRequest(performanceUrl);
    
    if (response.statusCode !== 200) {
      throw new Error(`Performance check returned ${response.statusCode}`);
    }

    const data = JSON.parse(response.body);
    
    // Check performance thresholds
    const thresholds = {
      averageResponseTime: 2000, // 2 seconds
      memoryUsage: 0.8, // 80%
      cpuUsage: 0.8 // 80%
    };

    const issues = [];
    if (data.averageResponseTime > thresholds.averageResponseTime) {
      issues.push(`High response time: ${data.averageResponseTime}ms`);
    }
    if (data.memoryUsage > thresholds.memoryUsage) {
      issues.push(`High memory usage: ${(data.memoryUsage * 100).toFixed(1)}%`);
    }
    if (data.cpuUsage > thresholds.cpuUsage) {
      issues.push(`High CPU usage: ${(data.cpuUsage * 100).toFixed(1)}%`);
    }

    if (issues.length > 0) {
      throw new Error(`Performance issues: ${issues.join(', ')}`);
    }

    return {
      responseTime: response.responseTime,
      averageResponseTime: data.averageResponseTime,
      memoryUsage: data.memoryUsage,
      cpuUsage: data.cpuUsage
    };
  }

  makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: 30000 // 30 seconds
      };

      const req = client.request(requestOptions, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body,
            responseTime
          });
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  generateReport() {
    const totalTime = Date.now() - this.startTime;
    const passedChecks = this.results.filter(r => r.status === 'PASS').length;
    const failedChecks = this.results.filter(r => r.status === 'FAIL').length;
    const overallStatus = failedChecks === 0 ? 'HEALTHY' : 'UNHEALTHY';

    const report = {
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      overallStatus,
      totalChecks: this.results.length,
      passedChecks,
      failedChecks,
      totalTime,
      checks: this.results
    };

    console.log('📊 Health Check Report');
    console.log('='.repeat(50));
    console.log(`Environment: ${this.config.environment}`);
    console.log(`Overall Status: ${overallStatus}`);
    console.log(`Total Checks: ${this.results.length}`);
    console.log(`Passed: ${passedChecks}`);
    console.log(`Failed: ${failedChecks}`);
    console.log(`Total Time: ${totalTime}ms`);
    console.log('='.repeat(50));

    if (failedChecks > 0) {
      console.log('\n❌ Failed Checks:');
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(check => {
          console.log(`  - ${check.name}: ${check.error}`);
        });
    }

    return report;
  }
}

// Main execution
async function main() {
  const environment = process.env.ENVIRONMENT || 'dev';
  const backendUrl = process.env.BACKEND_URL || `https://jamalert-${environment}-func.azurewebsites.net`;
  const frontendUrl = process.env.FRONTEND_URL || `https://jamalert-${environment}-web.azurewebsites.net`;

  const config = {
    environment,
    backendUrl,
    frontendUrl
  };

  const healthChecker = new HealthChecker(config);
  const report = await healthChecker.runAllChecks();

  // Exit with appropriate code
  process.exit(report.overallStatus === 'HEALTHY' ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  });
}

module.exports = { HealthChecker };
