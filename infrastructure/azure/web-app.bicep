@description('The name of the environment (dev, staging, prod)')
param environment string = 'dev'

@description('The location for all resources')
param location string = resourceGroup().location

@description('The name prefix for all resources')
param namePrefix string = 'jamalert'

@description('The URL of the backend API')
param backendApiUrl string

@description('The Application Insights connection string')
param applicationInsightsConnectionString string

// Variables
var resourceNamePrefix = '${namePrefix}-${environment}'
var webAppName = '${resourceNamePrefix}-web'
var appServicePlanName = '${resourceNamePrefix}-web-plan'

// App Service Plan for Web App
resource webAppServicePlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: environment == 'prod' ? 'P1v2' : 'B1'
    tier: environment == 'prod' ? 'PremiumV2' : 'Basic'
  }
  properties: {
    reserved: false
  }
}

// Web App
resource webApp 'Microsoft.Web/sites@2022-03-01' = {
  name: webAppName
  location: location
  kind: 'app'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: webAppServicePlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'NEXT_PUBLIC_API_URL'
          value: backendApiUrl
        }
        {
          name: 'NEXT_PUBLIC_ENVIRONMENT'
          value: environment
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: applicationInsightsConnectionString
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '18-lts'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'ENABLE_ORYX_BUILD'
          value: 'true'
        }
        {
          name: 'XDT_MicrosoftApplicationInsights_NodeJS'
          value: '1'
        }
      ]
      nodeVersion: '18-lts'
      use32BitWorkerProcess: false
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      alwaysOn: environment == 'prod'
      webSocketsEnabled: false
      requestTracingEnabled: true
      httpLoggingEnabled: true
      logsDirectorySizeLimit: 35
      detailedErrorLoggingEnabled: true
      defaultDocuments: [
        'index.html'
        'index.htm'
        'default.html'
      ]
    }
    httpsOnly: true
    clientAffinityEnabled: false
  }
}

// Web App Deployment Slot for Staging (Production only)
resource webAppStagingSlot 'Microsoft.Web/sites/slots@2022-03-01' = if (environment == 'prod') {
  parent: webApp
  name: 'staging'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: webAppServicePlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'NEXT_PUBLIC_API_URL'
          value: backendApiUrl
        }
        {
          name: 'NEXT_PUBLIC_ENVIRONMENT'
          value: 'staging'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: applicationInsightsConnectionString
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '18-lts'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'ENABLE_ORYX_BUILD'
          value: 'true'
        }
      ]
      nodeVersion: '18-lts'
      use32BitWorkerProcess: false
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: true
      alwaysOn: true
    }
    httpsOnly: true
    clientAffinityEnabled: false
  }
}

// Custom Domain (Production only)
resource customDomain 'Microsoft.Web/sites/hostNameBindings@2022-03-01' = if (environment == 'prod') {
  parent: webApp
  name: 'jamalert.jm'
  properties: {
    siteName: webApp.name
    hostNameType: 'Verified'
    sslState: 'SniEnabled'
    thumbprint: ''
  }
}

// Application Insights Web Test
resource webTest 'Microsoft.Insights/webtests@2022-06-15' = {
  name: '${webAppName}-availability-test'
  location: location
  kind: 'ping'
  properties: {
    SyntheticMonitorId: '${webAppName}-availability-test'
    Name: '${webAppName} Availability Test'
    Description: 'Availability test for ${webAppName}'
    Enabled: true
    Frequency: 300
    Timeout: 30
    Kind: 'ping'
    RetryEnabled: true
    Locations: [
      {
        Id: 'us-ca-sjc-azr'
      }
      {
        Id: 'us-tx-sn1-azr'
      }
      {
        Id: 'us-il-ch1-azr'
      }
    ]
    Configuration: {
      WebTest: '<WebTest Name="${webAppName} Availability Test" Id="ABD48585-0831-40CB-9069-682EA6BB3583" Enabled="True" CssProjectStructure="" CssIteration="" Timeout="30" WorkItemIds="" xmlns="http://microsoft.com/schemas/VisualStudio/TeamTest/2010" Description="" CredentialUserName="" CredentialPassword="" PreAuthenticate="True" Proxy="default" StopOnError="False" RecordedResultFile="" ResultsLocale=""><Items><Request Method="GET" Guid="a5f10126-e4cd-570d-961c-cea43999a200" Version="1.1" Url="https://${webApp.properties.defaultHostName}" ThinkTime="0" Timeout="30" ParseDependentRequests="False" FollowRedirects="True" RecordResult="True" Cache="False" ResponseTimeGoal="0" Encoding="utf-8" ExpectedHttpStatusCode="200" ExpectedResponseUrl="" ReportingName="" IgnoreHttpStatusCode="False" /></Items></WebTest>'
    }
  }
  tags: {
    'hidden-link:/subscriptions/${subscription().subscriptionId}/resourceGroups/${resourceGroup().name}/providers/Microsoft.Insights/components/${applicationInsightsConnectionString}': 'Resource'
  }
}

// Outputs
output webAppName string = webApp.name
output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
output webAppStagingUrl string = environment == 'prod' ? 'https://${webApp.name}-staging.azurewebsites.net' : ''
output customDomainUrl string = environment == 'prod' ? 'https://jamalert.jm' : ''
