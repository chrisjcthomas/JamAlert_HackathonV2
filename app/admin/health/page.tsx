'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Database, 
  Cloud, 
  Mail, 
  Server, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  details?: any;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: HealthCheck[];
  uptime: number;
  version: string;
}

interface PerformanceMetrics {
  alertDeliveryTime: {
    average: number;
    p95: number;
    p99: number;
  };
  apiResponseTimes: {
    [endpoint: string]: {
      average: number;
      count: number;
    };
  };
  errorRates: {
    [service: string]: number;
  };
  resourceUsage: {
    functionExecutions: number;
    databaseConnections: number;
    storageUsed: number;
  };
}

interface UsageMetrics {
  totalUsers: number;
  activeUsers: number;
  alertsSent: number;
  incidentReports: number;
  functionExecutions: number;
  databaseQueries: number;
  storageUsed: number;
  bandwidthUsed: number;
}

export default function AdminHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        throw new Error('No admin token found');
      }

      const response = await fetch('/api/admin/health', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch health data');
      }

      const healthData = await response.json();
      setHealth({
        ...healthData,
        timestamp: new Date(healthData.timestamp)
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const fetchPerformanceData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;

      const response = await fetch('/api/admin/health', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: 'performance' })
      });

      if (response.ok) {
        const data = await response.json();
        setPerformance(data);
      }
    } catch (err) {
      console.error('Failed to fetch performance data:', err);
    }
  };

  const fetchUsageData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;

      const response = await fetch('/api/admin/health', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: 'usage' })
      });

      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch (err) {
      console.error('Failed to fetch usage data:', err);
    }
  };

  const performCleanup = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;

      const response = await fetch('/api/admin/health', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: 'cleanup' })
      });

      if (response.ok) {
        alert('Cleanup completed successfully');
        await refreshData();
      } else {
        alert('Cleanup failed');
      }
    } catch (err) {
      alert('Cleanup failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const optimizeDatabase = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;

      const response = await fetch('/api/admin/health', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: 'optimize' })
      });

      if (response.ok) {
        alert('Database optimization completed successfully');
        await refreshData();
      } else {
        alert('Database optimization failed');
      }
    } catch (err) {
      alert('Database optimization failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchHealthData(),
      fetchPerformanceData(),
      fetchUsageData()
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await refreshData();
      setLoading(false);
    };

    loadData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load health data: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-muted-foreground">
            Monitor system performance and health metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={performCleanup} variant="outline">
            Clean Up Data
          </Button>
          <Button onClick={optimizeDatabase} variant="outline">
            Optimize Database
          </Button>
          <Button onClick={refreshData} disabled={refreshing}>
            {refreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {health && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Status</CardTitle>
              {getStatusIcon(health.overall)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{health.overall}</div>
              <p className="text-xs text-muted-foreground">
                Last updated: {health.timestamp.toLocaleTimeString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatUptime(health.uptime)}</div>
              <p className="text-xs text-muted-foreground">
                Version {health.version}
              </p>
            </CardContent>
          </Card>

          {usage && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{usage.totalUsers.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {usage.activeUsers} active (30 days)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Function Executions</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{usage.functionExecutions.toLocaleString()}</div>
                  <Progress 
                    value={(usage.functionExecutions / 1000000) * 100} 
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {((usage.functionExecutions / 1000000) * 100).toFixed(1)}% of monthly limit
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          {health && (
            <div className="grid gap-4 md:grid-cols-2">
              {health.checks.map((check) => (
                <Card key={check.service}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium capitalize">
                      {check.service.replace('_', ' ')}
                    </CardTitle>
                    {check.service === 'database' && <Database className="h-4 w-4 text-muted-foreground" />}
                    {check.service === 'weather_api' && <Cloud className="h-4 w-4 text-muted-foreground" />}
                    {check.service === 'email_service' && <Mail className="h-4 w-4 text-muted-foreground" />}
                    {check.service === 'application' && <Server className="h-4 w-4 text-muted-foreground" />}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(check.status)}>
                        {check.status}
                      </Badge>
                      {check.responseTime && (
                        <span className="text-sm text-muted-foreground">
                          {check.responseTime}ms
                        </span>
                      )}
                    </div>
                    {check.error && (
                      <p className="text-sm text-red-500 mt-2">{check.error}</p>
                    )}
                    {check.details && (
                      <div className="text-xs text-muted-foreground mt-2">
                        {JSON.stringify(check.details, null, 2)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {performance && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Alert Delivery Performance</CardTitle>
                  <CardDescription>Response times for alert delivery</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Average:</span>
                    <span>{Math.round(performance.alertDeliveryTime.average)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>95th Percentile:</span>
                    <span>{Math.round(performance.alertDeliveryTime.p95)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>99th Percentile:</span>
                    <span>{Math.round(performance.alertDeliveryTime.p99)}ms</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>API Response Times</CardTitle>
                  <CardDescription>Average response times by endpoint</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(performance.apiResponseTimes).map(([endpoint, stats]) => (
                    <div key={endpoint} className="flex justify-between">
                      <span className="text-sm">{endpoint}:</span>
                      <span className="text-sm">{Math.round(stats.average)}ms ({stats.count} calls)</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Error Rates</CardTitle>
                  <CardDescription>Error rates by service</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(performance.errorRates).map(([service, rate]) => (
                    <div key={service} className="flex justify-between">
                      <span className="capitalize">{service}:</span>
                      <span className={rate > 5 ? 'text-red-500' : rate > 1 ? 'text-yellow-500' : 'text-green-500'}>
                        {rate.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resource Usage</CardTitle>
                  <CardDescription>Current resource utilization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Function Executions:</span>
                    <span>{performance.resourceUsage.functionExecutions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Database Connections:</span>
                    <span>{performance.resourceUsage.databaseConnections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage Used:</span>
                    <span>{formatBytes(performance.resourceUsage.storageUsed)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          {usage && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>User Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Users:</span>
                    <span>{usage.totalUsers.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Users (30d):</span>
                    <span>{usage.activeUsers.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Activity Rate:</span>
                    <span>{((usage.activeUsers / usage.totalUsers) * 100).toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alert Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Alerts Sent (30d):</span>
                    <span>{usage.alertsSent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Incident Reports (30d):</span>
                    <span>{usage.incidentReports.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Usage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Function Executions:</span>
                    <span>{usage.functionExecutions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Database Queries:</span>
                    <span>{usage.databaseQueries.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage Used:</span>
                    <span>{formatBytes(usage.storageUsed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bandwidth Used:</span>
                    <span>{formatBytes(usage.bandwidthUsed)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}