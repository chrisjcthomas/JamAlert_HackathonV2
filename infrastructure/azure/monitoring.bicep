@description('The name of the environment (dev, staging, prod)')
param environment string = 'dev'

@description('The location for all resources')
param location string = resourceGroup().location

@description('The name prefix for all resources')
param namePrefix string = 'jamalert'

@description('The resource ID of the Application Insights component')
param applicationInsightsId string

@description('The resource ID of the Function App')
param functionAppId string

@description('The resource ID of the Web App')
param webAppId string

@description('The resource ID of the MySQL server')
param mysqlServerId string

@description('Email address for alert notifications')
param alertEmailAddress string

// Variables
var resourceNamePrefix = '${namePrefix}-${environment}'
var actionGroupName = '${resourceNamePrefix}-alerts'

// Action Group for Notifications
resource actionGroup 'Microsoft.Insights/actionGroups@2022-06-01' = {
  name: actionGroupName
  location: 'Global'
  properties: {
    groupShortName: 'JamAlert'
    enabled: true
    emailReceivers: [
      {
        name: 'Admin Email'
        emailAddress: alertEmailAddress
        useCommonAlertSchema: true
      }
    ]
    smsReceivers: []
    webhookReceivers: []
    azureAppPushReceivers: []
    itsmReceivers: []
    azureFunction: []
    automationRunbookReceivers: []
    voiceReceivers: []
    logicAppReceivers: []
    azureFunctionReceivers: []
    armRoleReceivers: []
  }
}

// Function App Availability Alert
resource functionAppAvailabilityAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${resourceNamePrefix}-func-availability'
  location: 'Global'
  properties: {
    description: 'Alert when Function App availability drops below 95%'
    severity: 2
    enabled: true
    scopes: [
      functionAppId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'AvailabilityMetric'
          metricName: 'Http2xx'
          metricNamespace: 'Microsoft.Web/sites'
          operator: 'LessThan'
          threshold: 95
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// Function App Response Time Alert
resource functionAppResponseTimeAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${resourceNamePrefix}-func-response-time'
  location: 'Global'
  properties: {
    description: 'Alert when Function App response time exceeds 5 seconds'
    severity: 3
    enabled: true
    scopes: [
      functionAppId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'ResponseTimeMetric'
          metricName: 'AverageResponseTime'
          metricNamespace: 'Microsoft.Web/sites'
          operator: 'GreaterThan'
          threshold: 5000
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// Web App Availability Alert
resource webAppAvailabilityAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${resourceNamePrefix}-web-availability'
  location: 'Global'
  properties: {
    description: 'Alert when Web App availability drops below 95%'
    severity: 2
    enabled: true
    scopes: [
      webAppId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'AvailabilityMetric'
          metricName: 'Http2xx'
          metricNamespace: 'Microsoft.Web/sites'
          operator: 'LessThan'
          threshold: 95
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// MySQL CPU Alert
resource mysqlCpuAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${resourceNamePrefix}-mysql-cpu'
  location: 'Global'
  properties: {
    description: 'Alert when MySQL CPU usage exceeds 80%'
    severity: 3
    enabled: true
    scopes: [
      mysqlServerId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'CpuMetric'
          metricName: 'cpu_percent'
          metricNamespace: 'Microsoft.DBforMySQL/flexibleServers'
          operator: 'GreaterThan'
          threshold: 80
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// MySQL Memory Alert
resource mysqlMemoryAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${resourceNamePrefix}-mysql-memory'
  location: 'Global'
  properties: {
    description: 'Alert when MySQL memory usage exceeds 85%'
    severity: 3
    enabled: true
    scopes: [
      mysqlServerId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'MemoryMetric'
          metricName: 'memory_percent'
          metricNamespace: 'Microsoft.DBforMySQL/flexibleServers'
          operator: 'GreaterThan'
          threshold: 85
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// MySQL Storage Alert
resource mysqlStorageAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${resourceNamePrefix}-mysql-storage'
  location: 'Global'
  properties: {
    description: 'Alert when MySQL storage usage exceeds 90%'
    severity: 2
    enabled: true
    scopes: [
      mysqlServerId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'StorageMetric'
          metricName: 'storage_percent'
          metricNamespace: 'Microsoft.DBforMySQL/flexibleServers'
          operator: 'GreaterThan'
          threshold: 90
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// Application Insights Exception Alert
resource applicationExceptionAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${resourceNamePrefix}-app-exceptions'
  location: 'Global'
  properties: {
    description: 'Alert when application exceptions exceed 10 per hour'
    severity: 3
    enabled: true
    scopes: [
      applicationInsightsId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT1H'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'ExceptionMetric'
          metricName: 'exceptions/count'
          metricNamespace: 'Microsoft.Insights/components'
          operator: 'GreaterThan'
          threshold: 10
          timeAggregation: 'Count'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// Application Insights Failed Request Alert
resource applicationFailedRequestAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${resourceNamePrefix}-app-failed-requests'
  location: 'Global'
  properties: {
    description: 'Alert when failed request rate exceeds 5%'
    severity: 3
    enabled: true
    scopes: [
      applicationInsightsId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'FailedRequestMetric'
          metricName: 'requests/failed'
          metricNamespace: 'Microsoft.Insights/components'
          operator: 'GreaterThan'
          threshold: 5
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// Outputs
output actionGroupId string = actionGroup.id
output actionGroupName string = actionGroup.name
