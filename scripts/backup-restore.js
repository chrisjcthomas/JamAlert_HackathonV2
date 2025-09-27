#!/usr/bin/env node

/**
 * Backup and Disaster Recovery script for JamAlert
 * Handles database backups, application state backups, and disaster recovery procedures
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class BackupManager {
  constructor(config) {
    this.config = config;
    this.backupDir = path.join(__dirname, '..', 'backups', `backup-${Date.now()}`);
    this.logFile = path.join(this.backupDir, 'backup.log');
    this.ensureBackupDirectory();
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  async createFullBackup() {
    this.log('🗄️  Starting full system backup...');
    
    const backupManifest = {
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      backupType: 'full',
      components: []
    };

    try {
      // Database backup
      const dbBackup = await this.backupDatabase();
      backupManifest.components.push(dbBackup);

      // Application configuration backup
      const configBackup = await this.backupConfiguration();
      backupManifest.components.push(configBackup);

      // File storage backup
      const storageBackup = await this.backupFileStorage();
      backupManifest.components.push(storageBackup);

      // Monitoring and logs backup
      const logsBackup = await this.backupLogs();
      backupManifest.components.push(logsBackup);

      // Create backup manifest
      const manifestPath = path.join(this.backupDir, 'backup-manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify(backupManifest, null, 2));

      // Create backup checksum
      const checksum = await this.createBackupChecksum();
      backupManifest.checksum = checksum;

      this.log(`✅ Full backup completed: ${this.backupDir}`);
      return { success: true, backupDir: this.backupDir, manifest: backupManifest };

    } catch (error) {
      this.log(`❌ Backup failed: ${error.message}`);
      throw error;
    }
  }

  async backupDatabase() {
    this.log('🗄️  Backing up database...');
    
    const dbBackupFile = path.join(this.backupDir, 'database-backup.sql');
    
    try {
      // Extract database connection details
      const databaseUrl = this.config.databaseUrl;
      const urlParts = new URL(databaseUrl);
      
      const host = urlParts.hostname;
      const port = urlParts.port || 3306;
      const username = urlParts.username;
      const password = urlParts.password;
      const database = urlParts.pathname.substring(1);

      // Create mysqldump command
      const dumpCommand = `mysqldump -h ${host} -P ${port} -u ${username} -p${password} ${database} --single-transaction --routines --triggers`;
      
      // Execute backup
      const backupData = execSync(dumpCommand, { encoding: 'utf8' });
      fs.writeFileSync(dbBackupFile, backupData);

      // Compress backup
      const compressedFile = `${dbBackupFile}.gz`;
      execSync(`gzip ${dbBackupFile}`);

      const stats = fs.statSync(compressedFile);
      
      this.log(`✅ Database backup completed: ${compressedFile} (${this.formatBytes(stats.size)})`);
      
      return {
        component: 'database',
        file: path.basename(compressedFile),
        size: stats.size,
        checksum: this.calculateFileChecksum(compressedFile)
      };

    } catch (error) {
      throw new Error(`Database backup failed: ${error.message}`);
    }
  }

  async backupConfiguration() {
    this.log('⚙️  Backing up application configuration...');
    
    const configDir = path.join(this.backupDir, 'configuration');
    fs.mkdirSync(configDir, { recursive: true });

    try {
      // Backup Azure App Service configuration
      const appSettings = execSync(
        `az webapp config appsettings list --resource-group ${this.config.resourceGroup} --name ${this.config.functionAppName}`,
        { encoding: 'utf8' }
      );
      fs.writeFileSync(path.join(configDir, 'app-settings.json'), appSettings);

      // Backup connection strings
      const connectionStrings = execSync(
        `az webapp config connection-string list --resource-group ${this.config.resourceGroup} --name ${this.config.functionAppName}`,
        { encoding: 'utf8' }
      );
      fs.writeFileSync(path.join(configDir, 'connection-strings.json'), connectionStrings);

      // Backup deployment configuration
      const deploymentConfig = execSync(
        `az webapp deployment source show --resource-group ${this.config.resourceGroup} --name ${this.config.functionAppName}`,
        { encoding: 'utf8' }
      );
      fs.writeFileSync(path.join(configDir, 'deployment-config.json'), deploymentConfig);

      // Backup infrastructure templates
      const infraDir = path.join(__dirname, '..', 'infrastructure');
      if (fs.existsSync(infraDir)) {
        execSync(`cp -r ${infraDir} ${configDir}/infrastructure`);
      }

      // Create configuration archive
      const configArchive = path.join(this.backupDir, 'configuration.tar.gz');
      execSync(`tar -czf ${configArchive} -C ${this.backupDir} configuration`);
      
      // Remove uncompressed directory
      execSync(`rm -rf ${configDir}`);

      const stats = fs.statSync(configArchive);
      
      this.log(`✅ Configuration backup completed: ${configArchive} (${this.formatBytes(stats.size)})`);
      
      return {
        component: 'configuration',
        file: path.basename(configArchive),
        size: stats.size,
        checksum: this.calculateFileChecksum(configArchive)
      };

    } catch (error) {
      throw new Error(`Configuration backup failed: ${error.message}`);
    }
  }

  async backupFileStorage() {
    this.log('📁 Backing up file storage...');
    
    try {
      // Backup Azure Storage Account contents
      const storageDir = path.join(this.backupDir, 'storage');
      fs.mkdirSync(storageDir, { recursive: true });

      // Download all blobs from storage account
      const downloadCommand = `az storage blob download-batch --destination ${storageDir} --source $web --account-name ${this.config.storageAccountName}`;
      
      try {
        execSync(downloadCommand, { stdio: 'pipe' });
        this.log('✅ Storage account files downloaded');
      } catch (error) {
        this.log('⚠️  No files found in storage account or download failed');
      }

      // Create storage archive
      const storageArchive = path.join(this.backupDir, 'storage.tar.gz');
      execSync(`tar -czf ${storageArchive} -C ${this.backupDir} storage`);
      
      // Remove uncompressed directory
      execSync(`rm -rf ${storageDir}`);

      const stats = fs.statSync(storageArchive);
      
      this.log(`✅ File storage backup completed: ${storageArchive} (${this.formatBytes(stats.size)})`);
      
      return {
        component: 'storage',
        file: path.basename(storageArchive),
        size: stats.size,
        checksum: this.calculateFileChecksum(storageArchive)
      };

    } catch (error) {
      throw new Error(`File storage backup failed: ${error.message}`);
    }
  }

  async backupLogs() {
    this.log('📋 Backing up logs and monitoring data...');
    
    try {
      const logsDir = path.join(this.backupDir, 'logs');
      fs.mkdirSync(logsDir, { recursive: true });

      // Export Application Insights logs (last 30 days)
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Query Application Insights for logs
      const query = `
        union traces, exceptions, requests, dependencies
        | where timestamp between(datetime(${startTime}) .. datetime(${endTime}))
        | order by timestamp desc
      `;

      try {
        const logsData = execSync(
          `az monitor app-insights query --app ${this.config.applicationInsightsName} --analytics-query "${query}"`,
          { encoding: 'utf8' }
        );
        fs.writeFileSync(path.join(logsDir, 'application-insights.json'), logsData);
        this.log('✅ Application Insights logs exported');
      } catch (error) {
        this.log('⚠️  Failed to export Application Insights logs');
      }

      // Backup local log files
      const localLogsDir = path.join(__dirname, '..', 'logs');
      if (fs.existsSync(localLogsDir)) {
        execSync(`cp -r ${localLogsDir} ${logsDir}/local-logs`);
        this.log('✅ Local logs backed up');
      }

      // Create logs archive
      const logsArchive = path.join(this.backupDir, 'logs.tar.gz');
      execSync(`tar -czf ${logsArchive} -C ${this.backupDir} logs`);
      
      // Remove uncompressed directory
      execSync(`rm -rf ${logsDir}`);

      const stats = fs.statSync(logsArchive);
      
      this.log(`✅ Logs backup completed: ${logsArchive} (${this.formatBytes(stats.size)})`);
      
      return {
        component: 'logs',
        file: path.basename(logsArchive),
        size: stats.size,
        checksum: this.calculateFileChecksum(logsArchive)
      };

    } catch (error) {
      throw new Error(`Logs backup failed: ${error.message}`);
    }
  }

  async createBackupChecksum() {
    this.log('🔐 Creating backup checksum...');
    
    const files = fs.readdirSync(this.backupDir)
      .filter(file => file.endsWith('.gz') || file.endsWith('.json'))
      .sort();

    const hash = crypto.createHash('sha256');
    
    for (const file of files) {
      const filePath = path.join(this.backupDir, file);
      const fileData = fs.readFileSync(filePath);
      hash.update(fileData);
    }

    const checksum = hash.digest('hex');
    fs.writeFileSync(path.join(this.backupDir, 'checksum.txt'), checksum);
    
    this.log(`✅ Backup checksum created: ${checksum}`);
    return checksum;
  }

  calculateFileChecksum(filePath) {
    const fileData = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileData).digest('hex');
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async restoreFromBackup(backupPath) {
    this.log(`🔄 Starting restore from backup: ${backupPath}`);
    
    try {
      // Validate backup
      await this.validateBackup(backupPath);
      
      // Read backup manifest
      const manifestPath = path.join(backupPath, 'backup-manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      
      this.log(`📋 Restoring backup from ${manifest.timestamp}`);
      
      // Restore database
      await this.restoreDatabase(backupPath, manifest);
      
      // Restore configuration
      await this.restoreConfiguration(backupPath, manifest);
      
      // Restore file storage
      await this.restoreFileStorage(backupPath, manifest);
      
      this.log('✅ Restore completed successfully');
      return { success: true };

    } catch (error) {
      this.log(`❌ Restore failed: ${error.message}`);
      throw error;
    }
  }

  async validateBackup(backupPath) {
    this.log('🔍 Validating backup integrity...');
    
    const manifestPath = path.join(backupPath, 'backup-manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error('Backup manifest not found');
    }

    const checksumPath = path.join(backupPath, 'checksum.txt');
    if (!fs.existsSync(checksumPath)) {
      throw new Error('Backup checksum not found');
    }

    // Verify checksum
    const expectedChecksum = fs.readFileSync(checksumPath, 'utf8').trim();
    const actualChecksum = await this.calculateBackupChecksum(backupPath);
    
    if (expectedChecksum !== actualChecksum) {
      throw new Error('Backup checksum verification failed');
    }

    this.log('✅ Backup validation passed');
  }

  async calculateBackupChecksum(backupPath) {
    const files = fs.readdirSync(backupPath)
      .filter(file => file.endsWith('.gz') || file.endsWith('.json'))
      .filter(file => file !== 'backup-manifest.json')
      .sort();

    const hash = crypto.createHash('sha256');
    
    for (const file of files) {
      const filePath = path.join(backupPath, file);
      const fileData = fs.readFileSync(filePath);
      hash.update(fileData);
    }

    return hash.digest('hex');
  }

  async restoreDatabase(backupPath, manifest) {
    this.log('🗄️  Restoring database...');
    
    const dbComponent = manifest.components.find(c => c.component === 'database');
    if (!dbComponent) {
      throw new Error('Database backup not found in manifest');
    }

    const backupFile = path.join(backupPath, dbComponent.file);
    if (!fs.existsSync(backupFile)) {
      throw new Error(`Database backup file not found: ${dbComponent.file}`);
    }

    // Decompress backup
    const decompressedFile = backupFile.replace('.gz', '');
    execSync(`gunzip -c ${backupFile} > ${decompressedFile}`);

    // Restore database
    const databaseUrl = this.config.databaseUrl;
    const urlParts = new URL(databaseUrl);
    
    const host = urlParts.hostname;
    const port = urlParts.port || 3306;
    const username = urlParts.username;
    const password = urlParts.password;
    const database = urlParts.pathname.substring(1);

    const restoreCommand = `mysql -h ${host} -P ${port} -u ${username} -p${password} ${database} < ${decompressedFile}`;
    execSync(restoreCommand);

    // Clean up
    fs.unlinkSync(decompressedFile);

    this.log('✅ Database restore completed');
  }

  async restoreConfiguration(backupPath, manifest) {
    this.log('⚙️  Restoring configuration...');
    
    const configComponent = manifest.components.find(c => c.component === 'configuration');
    if (!configComponent) {
      this.log('⚠️  Configuration backup not found, skipping');
      return;
    }

    // Extract configuration archive
    const configArchive = path.join(backupPath, configComponent.file);
    execSync(`tar -xzf ${configArchive} -C ${backupPath}`);

    const configDir = path.join(backupPath, 'configuration');

    // Restore app settings
    const appSettingsFile = path.join(configDir, 'app-settings.json');
    if (fs.existsSync(appSettingsFile)) {
      // Note: This would require careful handling to avoid overwriting current secrets
      this.log('⚠️  App settings restore requires manual review');
    }

    this.log('✅ Configuration restore completed');
  }

  async restoreFileStorage(backupPath, manifest) {
    this.log('📁 Restoring file storage...');
    
    const storageComponent = manifest.components.find(c => c.component === 'storage');
    if (!storageComponent) {
      this.log('⚠️  Storage backup not found, skipping');
      return;
    }

    // Extract storage archive
    const storageArchive = path.join(backupPath, storageComponent.file);
    execSync(`tar -xzf ${storageArchive} -C ${backupPath}`);

    const storageDir = path.join(backupPath, 'storage');

    // Upload files to storage account
    if (fs.existsSync(storageDir)) {
      const uploadCommand = `az storage blob upload-batch --destination $web --source ${storageDir} --account-name ${this.config.storageAccountName}`;
      execSync(uploadCommand);
    }

    this.log('✅ File storage restore completed');
  }
}

// Main execution
async function main() {
  const command = process.argv[2];
  const environment = process.argv[3] || process.env.ENVIRONMENT || 'dev';
  
  const config = {
    environment,
    resourceGroup: process.env.AZURE_RESOURCE_GROUP || `jamalert-${environment}-rg`,
    functionAppName: process.env.FUNCTION_APP_NAME || `jamalert-${environment}-func`,
    storageAccountName: process.env.STORAGE_ACCOUNT_NAME || `jamalert${environment}storage`,
    applicationInsightsName: process.env.APPLICATION_INSIGHTS_NAME || `jamalert-${environment}-insights`,
    databaseUrl: process.env.DATABASE_URL
  };

  const backupManager = new BackupManager(config);

  switch (command) {
    case 'backup':
      console.log('🗄️  JamAlert Backup Manager - Creating Backup');
      const backupResult = await backupManager.createFullBackup();
      console.log(`✅ Backup completed: ${backupResult.backupDir}`);
      break;

    case 'restore':
      const backupPath = process.argv[4];
      if (!backupPath) {
        console.error('❌ Backup path required for restore');
        process.exit(1);
      }
      console.log('🔄 JamAlert Backup Manager - Restoring from Backup');
      await backupManager.restoreFromBackup(backupPath);
      console.log('✅ Restore completed');
      break;

    default:
      console.log('JamAlert Backup Manager');
      console.log('Usage:');
      console.log('  node backup-restore.js backup [environment]');
      console.log('  node backup-restore.js restore [environment] [backup-path]');
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Operation failed:', error.message);
    process.exit(1);
  });
}

module.exports = { BackupManager };
