

export interface MonitoringThresholds {
  maxTemp?: number;
  minTemp?: number;
  maxWindSpeed?: number;
  maxHumidity?: number;
  conditions?: string[];
}

export interface MonitoringSession {
  location: string;
  thresholds: MonitoringThresholds;
  active: boolean;
  startedAt: string;
  isMonitoring: boolean;
  checkIntervalMinutes: number;
}

export interface WeatherAlert {
  timestamp: string;
  location: string;
  condition: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface MonitoringResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
  count?: number;
}

/**
 * Start monitoring weather for a location
 */
export async function startMonitoring(
  userId: string,
  location: string,
  thresholds?: MonitoringThresholds
): Promise<MonitoringResponse> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
    const response = await fetch(`${baseUrl}/weather/monitor/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        location,
        thresholds: thresholds || {
          maxTemp: 35,
          minTemp: 0,
          maxWindSpeed: 50,
          maxHumidity: 90,
          conditions: ['Thunderstorm', 'Tornado']
        }
      })
    });
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('❌ Failed to start monitoring:', error);
    return {
      success: false,
      error: 'Failed to start monitoring',
      message: error.message
    };
  }
}

/**
 * Stop monitoring weather for a user
 */
export async function stopMonitoring(userId: string): Promise<MonitoringResponse> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
    const response = await fetch(`${baseUrl}/weather/monitor/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('❌ Failed to stop monitoring:', error);
    return {
      success: false,
      error: 'Failed to stop monitoring',
      message: error.message
    };
  }
}

/**
 * Get monitoring status for a user
 */
export async function getMonitoringStatus(userId: string): Promise<MonitoringSession | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
    const response = await fetch(`${baseUrl}/weather/monitor/status/${userId}`);
    const data = await response.json();
    if (data.success) {
      return data.data as MonitoringSession;
    }
    return null;
  } catch (error: any) {
    console.error('❌ Failed to get monitoring status:', error);
    return null;
  }
}

/**
 * Get alert history for a user
 */
export async function getAlertHistory(userId: string, limit: number = 50): Promise<WeatherAlert[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
    const response = await fetch(`${baseUrl}/weather/alerts/${userId}?limit=${limit}`);
    const data = await response.json();
    if (data.success) {
      return data.data as WeatherAlert[];
    }
    return [];
  } catch (error: any) {
    console.error('❌ Failed to get alert history:', error);
    return [];
  }
}

/**
 * Clear alert history for a user
 */
export async function clearAlertHistory(userId: string): Promise<boolean> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
    const response = await fetch(`${baseUrl}/weather/alerts/${userId}`, { method: 'DELETE' });
    const data = await response.json();
    return data.success;
  } catch (error: any) {
    console.error('❌ Failed to clear alert history:', error);
    return false;
  }
}

/**
 * Get all monitoring sessions (admin only)
 */
export async function getAllMonitoringSessions(): Promise<any[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
    const response = await fetch(`${baseUrl}/weather/monitor/sessions/all`);
    const data = await response.json();
    if (data.success) {
      return data.data as any[];
    }
    return [];
  } catch (error: any) {
    console.error('❌ Failed to get monitoring sessions:', error);
    return [];
  }
}

/**
 * Get default thresholds for Jamaica
 */
export function getDefaultThresholds(): MonitoringThresholds {
  return {
    maxTemp: 35,
    minTemp: 0,
    maxWindSpeed: 50,
    maxHumidity: 90,
    conditions: ['Thunderstorm', 'Tornado', 'Heavy Rain']
  };
}

/**
 * Get thresholds for hurricane season
 */
export function getHurricaneSeasonThresholds(): MonitoringThresholds {
  return {
    maxTemp: 32,
    minTemp: 5,
    maxWindSpeed: 30,
    maxHumidity: 85,
    conditions: ['Thunderstorm', 'Tornado', 'Heavy Rain', 'Squall']
  };
}

/**
 * Get thresholds for dry season
 */
export function getDrySeasonThresholds(): MonitoringThresholds {
  return {
    maxTemp: 38,
    minTemp: 10,
    maxWindSpeed: 60,
    maxHumidity: 95,
    conditions: ['Thunderstorm', 'Tornado']
  };
}

/**
 * Format alert for display
 */
export function formatAlert(alert: WeatherAlert): string {
  const date = new Date(alert.timestamp);
  const time = date.toLocaleTimeString();
  const severityEmoji = {
    info: 'ℹ️',
    warning: '⚠️',
    critical: '🚨'
  }[alert.severity];

  return `${severityEmoji} ${alert.condition} in ${alert.location} at ${time}`;
}

/**
 * Get alert severity color
 */
export function getAlertSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    info: 'bg-blue-100 text-blue-800 border-blue-300',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    critical: 'bg-red-100 text-red-800 border-red-300'
  };
  return colors[severity] || colors.info;
}

