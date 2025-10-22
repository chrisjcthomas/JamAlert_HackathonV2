'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, Trash2, Play, Square, CloudRain, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { VerifiedBadge } from '@/components/alerts/verified-badge';
import {
  startMonitoring,
  stopMonitoring,
  getMonitoringStatus,
  getAlertHistory,
  clearAlertHistory,
  formatAlert,
  getAlertSeverityColor,
  type MonitoringSession,
  type WeatherAlert
} from '@/lib/monitoring-service';

interface MonitoringDashboardProps {
  userId: string;
  initialLocation?: string;
  onAlertsUpdate?: (alerts: any[]) => void;
}

interface RainfallData {
  location: string;
  rainfall1h: number;
  rainfall3h: number;
  rainfall12h: number;
  rainfall24h: number;
  readingCount: number;
}

const JAMAICA_PARISHES = [
  'All Parishes',
  'Kingston',
  'St. Andrew',
  'St. Catherine',
  'Clarendon',
  'Manchester',
  'St. Elizabeth',
  'Westmoreland',
  'Hanover',
  'St. James',
  'Trelawny',
  'St. Ann',
  'St. Mary',
  'Portland',
  'St. Thomas'
];

export function MonitoringDashboard({ userId, initialLocation = 'Kingston,JM', onAlertsUpdate }: MonitoringDashboardProps) {
  const [location, setLocation] = useState(initialLocation);
  const [searchInput, setSearchInput] = useState('');
  const [monitoring, setMonitoring] = useState<MonitoringSession | null>(null);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rainfallData, setRainfallData] = useState<RainfallData | null>(null);
  const [selectedParish, setSelectedParish] = useState('All Parishes');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Load monitoring status, alerts, and rainfall data
  const loadData = async () => {
    setRefreshing(true);
    try {
      const status = await getMonitoringStatus(userId);
      setMonitoring(status);

      if (status) {
        const history = await getAlertHistory(userId, 20);
        setAlerts(history);

        // Notify parent component of alerts update
        if (onAlertsUpdate) {
          onAlertsUpdate(history);
        }

        // Fetch rainfall accumulation data
        try {
          const response = await fetch(`http://localhost:8000/api/weather/rainfall/${status.location}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setRainfallData(data.data);
            }
          }
        } catch (error) {
          console.error('Failed to fetch rainfall data:', error);
        }
      } else {
        // No monitoring session, clear alerts
        if (onAlertsUpdate) {
          onAlertsUpdate([]);
        }
      }
      setLastUpdated(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleStartMonitoring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    setLoading(true);
    try {
      const result = await startMonitoring(userId, searchInput.trim());
      if (result.success) {
        setLocation(searchInput.trim());
        setSearchInput('');
        await loadData();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStopMonitoring = async () => {
    setLoading(true);
    try {
      await stopMonitoring(userId);
      setMonitoring(null);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAlerts = async () => {
    setLoading(true);
    try {
      await clearAlertHistory(userId);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter alerts by parish
  const filteredAlerts = useMemo(() => {
    if (selectedParish === 'All Parishes') {
      return alerts;
    }
    return alerts.filter(alert =>
      alert.location?.toLowerCase().includes(selectedParish.toLowerCase())
    );
  }, [alerts, selectedParish]);

  // Prepare rainfall chart data
  const rainfallChartData = useMemo(() => {
    if (!rainfallData) return [];

    const thresholds = {
      '1h': 50,
      '3h': 75,
      '12h': 150,
      '24h': 200
    };

    return [
      {
        timeWindow: '1 Hour',
        rainfall: rainfallData.rainfall1h,
        threshold: thresholds['1h'],
        exceeds: rainfallData.rainfall1h > thresholds['1h']
      },
      {
        timeWindow: '3 Hours',
        rainfall: rainfallData.rainfall3h,
        threshold: thresholds['3h'],
        exceeds: rainfallData.rainfall3h > thresholds['3h']
      },
      {
        timeWindow: '12 Hours',
        rainfall: rainfallData.rainfall12h,
        threshold: thresholds['12h'],
        exceeds: rainfallData.rainfall12h > thresholds['12h']
      },
      {
        timeWindow: '24 Hours',
        rainfall: rainfallData.rainfall24h,
        threshold: thresholds['24h'],
        exceeds: rainfallData.rainfall24h > thresholds['24h']
      }
    ];
  }, [rainfallData]);

  return (
    <div className="space-y-4">
      {/* Start/Stop Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle>Weather Monitoring</CardTitle>
          <CardDescription>
            Monitor weather conditions and receive alerts when thresholds are exceeded
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!monitoring ? (
            <form onSubmit={handleStartMonitoring} className="flex gap-2">
              <Input
                placeholder="e.g., Kingston,JM or Montego Bay,JM"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                disabled={loading}
              />
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Start
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-green-900">✅ Monitoring Active</p>
                    <p className="text-sm text-green-700">
                      Monitoring {monitoring.location} • Check every {monitoring.checkIntervalMinutes} minutes
                    </p>
                  </div>
                  <Button
                    onClick={handleStopMonitoring}
                    disabled={loading}
                    variant="destructive"
                    size="sm"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                    Stop
                  </Button>
                </div>
              </div>

              {/* Thresholds Display */}
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                <div className="rounded bg-blue-50 p-2">
                  <p className="text-xs text-gray-600">Max Temp</p>
                  <p className="font-semibold">{monitoring.thresholds.maxTemp}°C</p>
                </div>
                <div className="rounded bg-blue-50 p-2">
                  <p className="text-xs text-gray-600">Min Temp</p>
                  <p className="font-semibold">{monitoring.thresholds.minTemp}°C</p>
                </div>
                <div className="rounded bg-blue-50 p-2">
                  <p className="text-xs text-gray-600">Max Wind</p>
                  <p className="font-semibold">{monitoring.thresholds.maxWindSpeed} m/s</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rainfall Accumulation Chart */}
      {monitoring && rainfallData && rainfallChartData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CloudRain className="h-5 w-5" />
                  Rainfall Accumulation
                </CardTitle>
                <CardDescription>
                  Current rainfall levels vs. alert thresholds for {rainfallData.location}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rainfallChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timeWindow" />
                <YAxis label={{ value: 'Rainfall (mm)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="rainfall" name="Current Rainfall" radius={[8, 8, 0, 0]}>
                  {rainfallChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.exceeds ? '#ef4444' : '#3b82f6'} />
                  ))}
                </Bar>
                <Bar dataKey="threshold" name="Alert Threshold" fill="#fbbf24" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
              {rainfallChartData.map((data, index) => (
                <div key={index} className={`rounded-lg p-3 ${data.exceeds ? 'bg-red-50' : 'bg-blue-50'}`}>
                  <p className="text-xs text-gray-600">{data.timeWindow}</p>
                  <p className={`text-lg font-bold ${data.exceeds ? 'text-red-700' : 'text-blue-700'}`}>
                    {data.rainfall.toFixed(1)}mm
                  </p>
                  <p className="text-xs text-gray-500">Threshold: {data.threshold}mm</p>
                  {data.exceeds && (
                    <Badge variant="destructive" className="mt-1 text-xs">
                      Exceeds Threshold
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Alert History</CardTitle>
              <CardDescription>
                {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''} {selectedParish !== 'All Parishes' ? `in ${selectedParish}` : 'recorded'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedParish} onValueChange={setSelectedParish}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by parish" />
                </SelectTrigger>
                <SelectContent>
                  {JAMAICA_PARISHES.map((parish) => (
                    <SelectItem key={parish} value={parish}>
                      {parish}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {alerts.length > 0 && (
                <Button
                  onClick={handleClearAlerts}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {refreshing && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-sm text-gray-600">Refreshing...</p>
            </div>
          )}

          {!refreshing && filteredAlerts.length === 0 && (
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <CheckCircle className="mx-auto h-8 w-8 text-green-600" />
              <p className="mt-2 font-semibold text-gray-900">
                {selectedParish !== 'All Parishes' ? `No alerts in ${selectedParish}` : 'No alerts'}
              </p>
              <p className="text-sm text-gray-600">All conditions are within normal ranges</p>
            </div>
          )}

          {!refreshing && filteredAlerts.length > 0 && (
            <div className="space-y-2">
              {filteredAlerts.map((alert, index) => (
                <div
                  key={index}
                  className={`rounded-lg border p-3 ${getAlertSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-semibold">{alert.condition}</p>
                      <p className="text-sm">
                        {alert.location} • {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {/* Add verified badge if alert has verification data */}
                    {(alert as any).verified && (
                      <VerifiedBadge
                        verified={(alert as any).verified}
                        verificationCount={(alert as any).verificationCount || 0}
                        verificationReports={(alert as any).verificationReports}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">ℹ️ How Monitoring Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800">
          <p>
            • Weather is checked every {monitoring?.checkIntervalMinutes || 15} minutes
          </p>
          <p>
            • Alerts are triggered when conditions exceed configured thresholds
          </p>
          <p>
            • Each alert type has a 30-minute cooldown to prevent duplicate notifications
          </p>
          <p>
            • You can view your complete alert history here
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

