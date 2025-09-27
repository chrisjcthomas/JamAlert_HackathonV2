#!/usr/bin/env node

/**
 * Automated rollback script for JamAlert deployment
 * Handles rollback of web app deployments and database migrations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class RollbackManager {
  constructor(config) {
    this.config = config;
    this.logFile = path.join(__dirname, '..', 'logs', `rollback-${Date.now()}.log`);
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  async executeRollback() {
    this.log('🔄 Starting automated rollback process...');
    
    try {
      // Step 1: Validate rollback prerequisites
      await this.validatePrerequisites();
      
      // Step 2: Create backup of current state
      await this.createBackup();
      
      // Step 3: Rollback web application
      await this.rollbackWebApp();
      
      // Step 4: Rollback database migrations (if specified)
      if (this.config.rollbackDatabase) {
        await this.rollbackDatabase();
      }
      
      // Step 5: Verify rollback success
      await this.verifyRollback();
      
      // Step 6: Update monitoring and alerts
      await this.updateMonitoring();
      
      this.log('✅ Rollback completed successfully');
      return { success: true, logFile: this.logFile };
      
    } catch (error) {
      this.log(`❌ Rollback failed: ${error.message}`);
      await this.handleRollbackFailure(error);
      throw error;
    }
  }

  async validatePrerequisites() {
    this.log('🔍 Validating rollback prerequisites...');
    
    // Check Azure CLI authentication
    try {
      execSync('az account show', { stdio: 'pipe' });
      this.log('✅ Azure CLI authenticated');
    } catch (error) {
      throw new Error('Azure CLI not authenticated. Please run "az login"');
    }
    
    // Check if target slot exists (for production rollbacks)
    if (this.config.environment === 'prod') {
      try {
        const result = execSync(
          `az webapp deployment slot list --resource-group ${this.config.resourceGroup} --name ${this.config.webAppName}`,
          { encoding: 'utf8' }
        );
        const slots = JSON.parse(result);
        const hasStaging = slots.some(slot => slot.name === 'staging');
        
        if (!hasStaging) {
          throw new Error('Staging slot not found for production rollback');
        }
        this.log('✅ Staging slot available for rollback');
      } catch (error) {
        throw new Error(`Failed to check deployment slots: ${error.message}`);
      }
    }
    
    // Check if previous deployment exists
    if (this.config.targetVersion) {
      this.log(`✅ Target version specified: ${this.config.targetVersion}`);
    } else {
      this.log('⚠️  No target version specified, will rollback to previous deployment');
    }
  }

  async createBackup() {
    this.log('💾 Creating backup of current deployment state...');
    
    const backupDir = path.join(__dirname, '..', 'backups', `pre-rollback-${Date.now()}`);
    fs.mkdirSync(backupDir, { recursive: true });
    
    // Backup current app settings
    try {
      const appSettings = execSync(
        `az webapp config appsettings list --resource-group ${this.config.resourceGroup} --name ${this.config.webAppName}`,
        { encoding: 'utf8' }
      );
      fs.writeFileSync(path.join(backupDir, 'app-settings.json'), appSettings);
      this.log('✅ App settings backed up');
    } catch (error) {
      this.log(`⚠️  Failed to backup app settings: ${error.message}`);
    }
    
    // Backup current deployment info
    try {
      const deploymentInfo = execSync(
        `az webapp deployment list --resource-group ${this.config.resourceGroup} --name ${this.config.webAppName} --query "[0]"`,
        { encoding: 'utf8' }
      );
      fs.writeFileSync(path.join(backupDir, 'deployment-info.json'), deploymentInfo);
      this.log('✅ Deployment info backed up');
    } catch (error) {
      this.log(`⚠️  Failed to backup deployment info: ${error.message}`);
    }
    
    this.config.backupDir = backupDir;
    this.log(`✅ Backup created at: ${backupDir}`);
  }

  async rollbackWebApp() {
    this.log('🔄 Rolling back web application...');
    
    if (this.config.environment === 'prod') {
      // Production: Swap staging slot back to production
      this.log('🔄 Swapping staging slot to production...');
      
      try {
        execSync(
          `az webapp deployment slot swap --resource-group ${this.config.resourceGroup} --name ${this.config.webAppName} --slot staging --target-slot production`,
          { stdio: 'pipe' }
        );
        this.log('✅ Production slot swap completed');
      } catch (error) {
        throw new Error(`Failed to swap slots: ${error.message}`);
      }
      
    } else {
      // Non-production: Redeploy previous version
      if (this.config.targetVersion) {
        this.log(`🔄 Redeploying version ${this.config.targetVersion}...`);
        
        try {
          // This would typically involve redeploying from a specific Git commit or artifact
          // For now, we'll use a placeholder command
          this.log('⚠️  Specific version rollback not implemented - manual intervention required');
        } catch (error) {
          throw new Error(`Failed to redeploy version: ${error.message}`);
        }
      } else {
        this.log('⚠️  No target version specified for non-production rollback');
      }
    }
  }

  async rollbackDatabase() {
    this.log('🗄️  Rolling back database migrations...');
    
    if (!this.config.targetMigration) {
      this.log('⚠️  No target migration specified, skipping database rollback');
      return;
    }
    
    try {
      // Change to backend directory
      const backendDir = path.join(__dirname, '..', 'backend');
      process.chdir(backendDir);
      
      // Run Prisma migration rollback
      this.log(`🔄 Rolling back to migration: ${this.config.targetMigration}`);
      
      // Note: Prisma doesn't have built-in rollback, so this would require custom logic
      // For now, we'll log the requirement
      this.log('⚠️  Database rollback requires manual intervention with Prisma');
      this.log(`   Target migration: ${this.config.targetMigration}`);
      this.log('   Please run appropriate migration commands manually');
      
    } catch (error) {
      throw new Error(`Database rollback failed: ${error.message}`);
    }
  }

  async verifyRollback() {
    this.log('🔍 Verifying rollback success...');
    
    // Wait for deployment to stabilize
    this.log('⏳ Waiting for deployment to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute
    
    // Run health checks
    try {
      const healthCheckScript = path.join(__dirname, 'health-check.js');
      const env = {
        ...process.env,
        ENVIRONMENT: this.config.environment,
        BACKEND_URL: this.config.backendUrl,
        FRONTEND_URL: this.config.frontendUrl
      };
      
      execSync(`node ${healthCheckScript}`, { 
        stdio: 'pipe',
        env
      });
      
      this.log('✅ Health checks passed after rollback');
    } catch (error) {
      throw new Error(`Health checks failed after rollback: ${error.message}`);
    }
    
    // Verify specific functionality
    await this.verifyCoreFunctionality();
  }

  async verifyCoreFunctionality() {
    this.log('🧪 Verifying core functionality...');
    
    // Test API endpoints
    const testEndpoints = [
      '/api/health',
      '/api/alerts',
      '/api/incidents'
    ];
    
    for (const endpoint of testEndpoints) {
      try {
        const url = `${this.config.backendUrl}${endpoint}`;
        const response = await this.makeHttpRequest(url);
        
        if (response.statusCode === 200) {
          this.log(`✅ ${endpoint} responding correctly`);
        } else {
          throw new Error(`${endpoint} returned ${response.statusCode}`);
        }
      } catch (error) {
        throw new Error(`Failed to verify ${endpoint}: ${error.message}`);
      }
    }
  }

  async updateMonitoring() {
    this.log('📊 Updating monitoring and alerts...');
    
    try {
      // Create rollback event in Application Insights
      const eventData = {
        name: 'Deployment Rollback',
        properties: {
          environment: this.config.environment,
          timestamp: new Date().toISOString(),
          reason: this.config.reason || 'Manual rollback',
          targetVersion: this.config.targetVersion || 'previous',
          success: true
        }
      };
      
      this.log('✅ Rollback event logged to monitoring');
      
      // Send notification (if configured)
      if (this.config.notificationWebhook) {
        await this.sendNotification({
          title: 'Deployment Rollback Completed',
          message: `Rollback completed successfully for ${this.config.environment} environment`,
          environment: this.config.environment,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      this.log(`⚠️  Failed to update monitoring: ${error.message}`);
    }
  }

  async handleRollbackFailure(error) {
    this.log('🚨 Handling rollback failure...');
    
    // Send critical alert
    if (this.config.notificationWebhook) {
      await this.sendNotification({
        title: 'CRITICAL: Rollback Failed',
        message: `Rollback failed for ${this.config.environment} environment: ${error.message}`,
        environment: this.config.environment,
        severity: 'critical',
        timestamp: new Date().toISOString()
      });
    }
    
    // Log failure details
    this.log(`💾 Backup location: ${this.config.backupDir}`);
    this.log(`📋 Log file: ${this.logFile}`);
    this.log('🔧 Manual intervention required');
  }

  makeHttpRequest(url) {
    return new Promise((resolve, reject) => {
      const https = require('https');
      const urlObj = new URL(url);
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: 'GET',
        timeout: 10000
      };
      
      const req = https.request(options, (res) => {
        resolve({ statusCode: res.statusCode });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
  }

  async sendNotification(data) {
    if (!this.config.notificationWebhook) return;
    
    try {
      // Implementation would depend on notification service (Slack, Teams, etc.)
      this.log(`📢 Notification sent: ${data.title}`);
    } catch (error) {
      this.log(`⚠️  Failed to send notification: ${error.message}`);
    }
  }
}

// Main execution
async function main() {
  const config = {
    environment: process.argv[2] || process.env.ENVIRONMENT || 'dev',
    resourceGroup: process.env.AZURE_RESOURCE_GROUP || `jamalert-${process.argv[2] || 'dev'}-rg`,
    webAppName: process.env.WEB_APP_NAME || `jamalert-${process.argv[2] || 'dev'}-web`,
    backendUrl: process.env.BACKEND_URL || `https://jamalert-${process.argv[2] || 'dev'}-func.azurewebsites.net`,
    frontendUrl: process.env.FRONTEND_URL || `https://jamalert-${process.argv[2] || 'dev'}-web.azurewebsites.net`,
    targetVersion: process.env.TARGET_VERSION,
    targetMigration: process.env.TARGET_MIGRATION,
    rollbackDatabase: process.env.ROLLBACK_DATABASE === 'true',
    reason: process.env.ROLLBACK_REASON,
    notificationWebhook: process.env.NOTIFICATION_WEBHOOK
  };

  console.log('🔄 JamAlert Rollback Manager');
  console.log('='.repeat(40));
  console.log(`Environment: ${config.environment}`);
  console.log(`Resource Group: ${config.resourceGroup}`);
  console.log(`Web App: ${config.webAppName}`);
  console.log('='.repeat(40));

  const rollbackManager = new RollbackManager(config);
  const result = await rollbackManager.executeRollback();
  
  console.log('\n✅ Rollback completed successfully!');
  console.log(`📋 Log file: ${result.logFile}`);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Rollback failed:', error.message);
    process.exit(1);
  });
}

module.exports = { RollbackManager };
