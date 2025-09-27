@description('The name of the environment (dev, staging, prod)')
param environment string = 'dev'

@description('The location for all resources')
param location string = resourceGroup().location

@description('The name prefix for all resources')
param namePrefix string = 'jamalert'

@description('The administrator login for the MySQL server')
param mysqlAdminLogin string

@description('The administrator password for the MySQL server')
@secure()
param mysqlAdminPassword string

@description('The SKU name for the MySQL server')
param mysqlSkuName string = 'Standard_B1ms'

@description('The storage size in GB for the MySQL server')
param mysqlStorageSizeGB int = 20

@description('The backup retention days for the MySQL server')
param mysqlBackupRetentionDays int = 7

@description('Enable geo-redundant backup')
param mysqlGeoRedundantBackup bool = false

// Variables
var resourceNamePrefix = '${namePrefix}-${environment}'
var functionAppName = '${resourceNamePrefix}-func'
var appServicePlanName = '${resourceNamePrefix}-plan'
var storageAccountName = replace('${resourceNamePrefix}storage', '-', '')
var applicationInsightsName = '${resourceNamePrefix}-insights'
var mysqlServerName = '${resourceNamePrefix}-mysql'
var mysqlDatabaseName = 'jamalert'
var keyVaultName = '${resourceNamePrefix}-kv'
var logAnalyticsWorkspaceName = '${resourceNamePrefix}-logs'

// Log Analytics Workspace
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsWorkspaceName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

// Application Insights
resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: applicationInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalyticsWorkspace.id
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// Storage Account
resource storageAccount 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    networkAcls: {
      defaultAction: 'Allow'
    }
  }
}

// App Service Plan
resource appServicePlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: environment == 'prod' ? 'P1v2' : 'Y1'
    tier: environment == 'prod' ? 'PremiumV2' : 'Dynamic'
  }
  properties: {
    reserved: false
  }
}

// MySQL Server
resource mysqlServer 'Microsoft.DBforMySQL/flexibleServers@2021-12-01-preview' = {
  name: mysqlServerName
  location: location
  sku: {
    name: mysqlSkuName
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: mysqlAdminLogin
    administratorLoginPassword: mysqlAdminPassword
    storage: {
      storageSizeGB: mysqlStorageSizeGB
      iops: 360
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: mysqlBackupRetentionDays
      geoRedundantBackup: mysqlGeoRedundantBackup ? 'Enabled' : 'Disabled'
    }
    highAvailability: {
      mode: environment == 'prod' ? 'ZoneRedundant' : 'Disabled'
    }
    version: '8.0'
  }
}

// MySQL Database
resource mysqlDatabase 'Microsoft.DBforMySQL/flexibleServers/databases@2021-12-01-preview' = {
  parent: mysqlServer
  name: mysqlDatabaseName
  properties: {
    charset: 'utf8mb4'
    collation: 'utf8mb4_unicode_ci'
  }
}

// MySQL Firewall Rule for Azure Services
resource mysqlFirewallRule 'Microsoft.DBforMySQL/flexibleServers/firewallRules@2021-12-01-preview' = {
  parent: mysqlServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    accessPolicies: []
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    enableRbacAuthorization: true
  }
}

// Function App
resource functionApp 'Microsoft.Web/sites@2022-03-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${az.environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${az.environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: toLower(functionAppName)
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~18'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: applicationInsights.properties.InstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: applicationInsights.properties.ConnectionString
        }
        {
          name: 'DATABASE_URL'
          value: 'mysql://${mysqlAdminLogin}:${mysqlAdminPassword}@${mysqlServer.properties.fullyQualifiedDomainName}:3306/${mysqlDatabaseName}?ssl=true'
        }
        {
          name: 'ENVIRONMENT'
          value: environment
        }
      ]
      cors: {
        allowedOrigins: [
          'https://portal.azure.com'
          environment == 'prod' ? 'https://jamalert.jm' : 'https://${resourceNamePrefix}-web.azurewebsites.net'
        ]
      }
      use32BitWorkerProcess: false
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
    }
    httpsOnly: true
  }
}

// Outputs
output functionAppName string = functionApp.name
output functionAppUrl string = 'https://${functionApp.properties.defaultHostName}'
output mysqlServerName string = mysqlServer.name
output mysqlDatabaseName string = mysqlDatabase.name
output storageAccountName string = storageAccount.name
output applicationInsightsName string = applicationInsights.name
output keyVaultName string = keyVault.name
output resourceGroupName string = resourceGroup().name
