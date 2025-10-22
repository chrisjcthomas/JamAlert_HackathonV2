/**
 * Weather Monitoring Service
 * Monitors weather conditions and triggers alerts when thresholds are exceeded
 */

const axios = require('axios');

// In-memory storage for monitoring data
const monitoringData = new Map(); // userId -> { location, thresholds, active, lastCheck }
const alertHistory = new Map(); // userId -> [{ timestamp, location, condition, severity }]
const lastAlertTime = new Map(); // `${userId}_${location}_${condition}` -> timestamp
const weatherReadings = new Map(); // location -> [{ timestamp, rainfall, temperature, humidity, windSpeed }]
const rainfallAccumulation = new Map(); // location -> { 3h, 12h, 24h }
const incidentReports = new Map(); // location -> [{ timestamp, type, description, userId }]
const ALERT_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const WEATHER_READING_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Monitoring interval
let monitoringInterval = null;
const CHECK_INTERVAL_MS = (process.env.WEATHER_CHECK_INTERVAL_MINUTES || 15) * 60 * 1000;

// Mock weather data generator with rainfall
function generateMockWeather(city) {
  const mockData = {
    'Kingston,JM': {
      temperature: 28.5 + Math.random() * 5,
      humidity: 75,
      windSpeed: 12.5 + Math.random() * 10,
      rainfall: Math.random() * 15, // 0-15mm per check
      condition: ['Clear', 'Partly Cloudy', 'Rainy'][Math.floor(Math.random() * 3)]
    },
    'Montego Bay,JM': {
      temperature: 29.1 + Math.random() * 5,
      humidity: 72,
      windSpeed: 14.2 + Math.random() * 10,
      rainfall: Math.random() * 15,
      condition: ['Clear', 'Partly Cloudy', 'Rainy'][Math.floor(Math.random() * 3)]
    },
    'Negril,JM': {
      temperature: 29.5 + Math.random() * 5,
      humidity: 70,
      windSpeed: 15.0 + Math.random() * 10,
      rainfall: Math.random() * 15,
      condition: ['Clear', 'Partly Cloudy', 'Rainy'][Math.floor(Math.random() * 3)]
    }
  };
  return mockData[city] || mockData['Kingston,JM'];
}

/**
 * Check if alert should be sent (respects cooldown)
 */
function shouldSendAlert(userId, location, condition) {
  const key = `${userId}_${location}_${condition}`;
  const lastTime = lastAlertTime.get(key);
  
  if (!lastTime) {
    return true;
  }

  const timeSinceLastAlert = Date.now() - lastTime;
  return timeSinceLastAlert > ALERT_COOLDOWN_MS;
}

/**
 * Record alert in history
 */
function recordAlert(userId, location, condition, severity = 'warning') {
  if (!alertHistory.has(userId)) {
    alertHistory.set(userId, []);
  }

  const alert = {
    timestamp: new Date().toISOString(),
    location,
    condition,
    severity
  };

  alertHistory.get(userId).push(alert);

  // Keep only last 100 alerts per user
  const history = alertHistory.get(userId);
  if (history.length > 100) {
    history.shift();
  }

  // Update cooldown
  const key = `${userId}_${location}_${condition}`;
  lastAlertTime.set(key, Date.now());

  console.log(`📢 Alert recorded for ${userId}: ${condition} in ${location}`);
  return alert;
}

/**
 * Check weather against thresholds
 */
function checkThresholds(weather, thresholds) {
  const alerts = [];

  // Temperature checks
  if (thresholds.maxTemp && weather.temperature > thresholds.maxTemp) {
    alerts.push({
      type: 'temperature',
      condition: `High Temperature (${weather.temperature.toFixed(1)}°C)`,
      severity: weather.temperature > 35 ? 'critical' : 'warning',
      details: `Temperature is ${weather.temperature.toFixed(1)}°C, exceeding threshold of ${thresholds.maxTemp}°C`
    });
  }

  if (thresholds.minTemp && weather.temperature < thresholds.minTemp) {
    alerts.push({
      type: 'temperature',
      condition: `Low Temperature (${weather.temperature.toFixed(1)}°C)`,
      severity: weather.temperature < 0 ? 'critical' : 'warning',
      details: `Temperature is ${weather.temperature.toFixed(1)}°C, below threshold of ${thresholds.minTemp}°C`
    });
  }

  // Wind speed checks
  if (thresholds.maxWindSpeed && weather.windSpeed > thresholds.maxWindSpeed) {
    alerts.push({
      type: 'wind',
      condition: `High Wind (${weather.windSpeed.toFixed(1)} m/s)`,
      severity: weather.windSpeed > 50 ? 'critical' : 'warning',
      details: `Wind speed is ${weather.windSpeed.toFixed(1)} m/s, exceeding threshold of ${thresholds.maxWindSpeed} m/s`
    });
  }

  // Condition checks
  if (thresholds.conditions && thresholds.conditions.length > 0) {
    if (thresholds.conditions.includes(weather.condition)) {
      alerts.push({
        type: 'condition',
        condition: weather.condition,
        severity: ['Thunderstorm', 'Tornado'].includes(weather.condition) ? 'critical' : 'warning',
        details: `Weather condition is ${weather.condition}`
      });
    }
  }

  // Humidity checks
  if (thresholds.maxHumidity && weather.humidity > thresholds.maxHumidity) {
    alerts.push({
      type: 'humidity',
      condition: `High Humidity (${weather.humidity}%)`,
      severity: 'info',
      details: `Humidity is ${weather.humidity}%, exceeding threshold of ${thresholds.maxHumidity}%`
    });
  }

  return alerts;
}

/**
 * Store weather reading for accumulation tracking
 */
function storeWeatherReading(location, weather) {
  if (!weatherReadings.has(location)) {
    weatherReadings.set(location, []);
  }

  const readings = weatherReadings.get(location);
  readings.push({
    timestamp: Date.now(),
    rainfall: weather.rainfall || 0,
    temperature: weather.temperature,
    humidity: weather.humidity,
    windSpeed: weather.windSpeed,
    condition: weather.condition
  });

  // Clean up old readings (older than 24 hours)
  const cutoffTime = Date.now() - WEATHER_READING_RETENTION_MS;
  const filteredReadings = readings.filter(r => r.timestamp > cutoffTime);
  weatherReadings.set(location, filteredReadings);

  console.log(`📊 Stored weather reading for ${location} (${filteredReadings.length} readings in memory)`);
}

/**
 * Calculate rainfall accumulation for a time window
 */
function calculateRainfallAccumulation(location, hours) {
  const readings = weatherReadings.get(location) || [];
  if (readings.length === 0) return 0;

  const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
  const relevantReadings = readings.filter(r => r.timestamp > cutoffTime);

  const total = relevantReadings.reduce((sum, r) => sum + (r.rainfall || 0), 0);
  return parseFloat(total.toFixed(2));
}

/**
 * Get rainfall accumulation for all time windows
 */
function getRainfallAccumulation(location) {
  return {
    rainfall1h: calculateRainfallAccumulation(location, 1),
    rainfall3h: calculateRainfallAccumulation(location, 3),
    rainfall12h: calculateRainfallAccumulation(location, 12),
    rainfall24h: calculateRainfallAccumulation(location, 24)
  };
}

/**
 * Check rainfall thresholds with hierarchical severity
 * Priority 1: Flash flood (extreme rainfall rate)
 * Priority 2: Saturated ground (high accumulation)
 * Priority 3: Heavy rain (moderate accumulation)
 */
function checkRainfallThresholds(rainfall, thresholds, location) {
  const alerts = [];
  const USE_PREDICTIVE_ALERTS = process.env.USE_PREDICTIVE_ALERTS === 'true';

  if (!USE_PREDICTIVE_ALERTS) {
    return alerts; // Skip if feature flag disabled
  }

  // Priority 1: Flash flood (extreme rainfall rate - 2x threshold)
  if (rainfall.rainfall1h > (thresholds.rainfallThreshold1h * 2.0)) {
    alerts.push({
      type: 'flood_warning',
      condition: 'FLASH_FLOOD_WARNING',
      severity: 'critical',
      details: `Extreme rainfall rate: ${rainfall.rainfall1h.toFixed(1)}mm in 1 hour (threshold: ${thresholds.rainfallThreshold1h}mm)`,
      rainfall: rainfall.rainfall1h,
      timeWindow: '1h'
    });
  }

  // Priority 2: Saturated ground (high accumulation over 12-24h)
  if (rainfall.rainfall24h > thresholds.rainfallThreshold24h ||
      rainfall.rainfall12h > thresholds.rainfallThreshold12h) {
    alerts.push({
      type: 'flood_warning',
      condition: 'FLOOD_WARNING',
      severity: 'high',
      details: `Ground saturation risk: 24h=${rainfall.rainfall24h.toFixed(1)}mm, 12h=${rainfall.rainfall12h.toFixed(1)}mm`,
      rainfall: rainfall.rainfall24h,
      timeWindow: '24h'
    });
  }

  // Priority 3: Heavy rain (moderate accumulation)
  if (rainfall.rainfall3h > thresholds.rainfallThreshold3h ||
      rainfall.rainfall1h > thresholds.rainfallThreshold1h) {
    alerts.push({
      type: 'heavy_rain',
      condition: 'HEAVY_RAIN_WARNING',
      severity: 'medium',
      details: `Sustained rainfall: 3h=${rainfall.rainfall3h.toFixed(1)}mm, 1h=${rainfall.rainfall1h.toFixed(1)}mm`,
      rainfall: rainfall.rainfall3h,
      timeWindow: '3h'
    });
  }

  return alerts;
}

/**
 * Start weather monitoring
 */
function startMonitoring() {
  if (monitoringInterval) {
    console.log('⚠️ Monitoring already running');
    return;
  }

  console.log(`🌍 Starting weather monitoring (check every ${CHECK_INTERVAL_MS / 60000} minutes)...`);

  // Run immediately
  runMonitoringCheck();

  // Then run at intervals
  monitoringInterval = setInterval(runMonitoringCheck, CHECK_INTERVAL_MS);
}

/**
 * Stop weather monitoring
 */
function stopMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    console.log('🛑 Weather monitoring stopped');
  }
}

/**
 * Run a monitoring check
 */
async function runMonitoringCheck() {
  console.log(`\n⏰ Running weather monitoring check at ${new Date().toISOString()}`);

  for (const [userId, data] of monitoringData.entries()) {
    if (!data.active) continue;

    try {
      // Get weather data
      const weather = generateMockWeather(data.location);

      // Store weather reading for accumulation tracking
      storeWeatherReading(data.location, weather);

      // Get rainfall accumulation
      const rainfall = getRainfallAccumulation(data.location);

      // Check standard thresholds
      const alerts = checkThresholds(weather, data.thresholds);

      // Check rainfall accumulation thresholds (hierarchical)
      const rainfallAlerts = checkRainfallThresholds(rainfall, data.thresholds, data.location);
      alerts.push(...rainfallAlerts);

      // Process alerts
      for (const alert of alerts) {
        if (shouldSendAlert(userId, data.location, alert.condition)) {
          const recordedAlert = recordAlert(userId, data.location, alert.condition, alert.severity);
          console.log(`✅ Alert triggered: ${alert.condition} in ${data.location}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error checking weather for ${userId}:`, error.message);
    }
  }
}

/**
 * Start monitoring for a user
 */
function startUserMonitoring(userId, location, thresholds = {}) {
  monitoringData.set(userId, {
    location,
    thresholds: {
      maxTemp: thresholds.maxTemp || 35,
      minTemp: thresholds.minTemp || 0,
      maxWindSpeed: thresholds.maxWindSpeed || 50,
      maxHumidity: thresholds.maxHumidity || 90,
      conditions: thresholds.conditions || ['Thunderstorm', 'Tornado'],
      // Rainfall accumulation thresholds (in mm) - Jamaica defaults
      rainfallThreshold1h: thresholds.rainfallThreshold1h || 50,
      rainfallThreshold3h: thresholds.rainfallThreshold3h || 75,
      rainfallThreshold12h: thresholds.rainfallThreshold12h || 150,
      rainfallThreshold24h: thresholds.rainfallThreshold24h || 200
    },
    active: true,
    startedAt: new Date().toISOString()
  });

  console.log(`✅ Started monitoring for ${userId} in ${location}`);
  console.log(`   Rainfall thresholds: 1h=${thresholds.rainfallThreshold1h || 50}mm, 3h=${thresholds.rainfallThreshold3h || 75}mm, 12h=${thresholds.rainfallThreshold12h || 150}mm, 24h=${thresholds.rainfallThreshold24h || 200}mm`);

  // Start global monitoring if not already running
  if (!monitoringInterval) {
    startMonitoring();
  }

  return monitoringData.get(userId);
}

/**
 * Stop monitoring for a user
 */
function stopUserMonitoring(userId) {
  const data = monitoringData.get(userId);
  if (data) {
    data.active = false;
    console.log(`🛑 Stopped monitoring for ${userId}`);
  }
}

/**
 * Get monitoring status for a user
 */
function getMonitoringStatus(userId) {
  const data = monitoringData.get(userId);
  if (!data) {
    return null;
  }

  return {
    ...data,
    isMonitoring: monitoringInterval !== null,
    checkIntervalMinutes: CHECK_INTERVAL_MS / 60000
  };
}

/**
 * Get alert history for a user
 */
function getAlertHistory(userId, limit = 50) {
  const history = alertHistory.get(userId) || [];
  return history.slice(-limit).reverse();
}

/**
 * Clear alert history for a user
 */
function clearAlertHistory(userId) {
  alertHistory.delete(userId);
  console.log(`🗑️ Cleared alert history for ${userId}`);
}

/**
 * Get all monitoring sessions
 */
function getAllMonitoringSessions() {
  const sessions = [];
  for (const [userId, data] of monitoringData.entries()) {
    sessions.push({
      userId,
      ...data
    });
  }
  return sessions;
}

/**
 * Record a flooding incident report for verification
 */
function recordIncidentReport(location, type, description, userId) {
  if (!incidentReports.has(location)) {
    incidentReports.set(location, []);
  }

  const report = {
    timestamp: Date.now(),
    type,
    description,
    userId
  };

  incidentReports.get(location).push(report);

  // Keep only last 100 reports per location
  const reports = incidentReports.get(location);
  if (reports.length > 100) {
    reports.shift();
  }

  console.log(`📍 Incident report recorded for ${location}: ${type}`);
  return report;
}

/**
 * Find recent flooding reports for verification
 */
function findRecentFloodingReports(location, timeWindowMinutes = 30) {
  const reports = incidentReports.get(location) || [];
  const cutoffTime = Date.now() - (timeWindowMinutes * 60 * 1000);

  const floodingReports = reports.filter(r =>
    r.timestamp > cutoffTime &&
    (r.type === 'flooding' || r.type === 'flood' || r.description.toLowerCase().includes('flood'))
  );

  return {
    count: floodingReports.length,
    reports: floodingReports
  };
}

/**
 * Get rainfall accumulation data for a location
 */
function getRainfallData(location) {
  const readings = weatherReadings.get(location) || [];
  return {
    location,
    readingCount: readings.length,
    accumulation: getRainfallAccumulation(location),
    lastReading: readings.length > 0 ? readings[readings.length - 1] : null
  };
}

/**
 * Escalate alert based on community verification reports
 * Priority 1: 5+ reports = critical severity
 * Priority 2: 3+ reports = upgrade to FLOOD_WARNING
 * Priority 3: 1-2 reports = add verification badge
 */
function escalateAlertWithVerification(alert, location, timeWindowMinutes = 30) {
  const { count, reports } = findRecentFloodingReports(location, timeWindowMinutes);

  if (count === 0) {
    return alert; // No escalation
  }

  // Create escalated alert
  const escalatedAlert = {
    ...alert,
    verified: true,
    verificationCount: count,
    verificationReports: reports,
    originalSeverity: alert.severity
  };

  // Priority 1: 5+ reports = critical
  if (count >= 5) {
    escalatedAlert.severity = 'critical';
    escalatedAlert.condition = `${alert.condition} (VERIFIED - ${count} reports)`;
    escalatedAlert.details = `${alert.details} | Community verified by ${count} reports`;
  }
  // Priority 2: 3-4 reports = upgrade to high
  else if (count >= 3) {
    if (alert.type === 'heavy_rain') {
      escalatedAlert.type = 'flood_warning';
      escalatedAlert.condition = 'FLOOD_WARNING (Community Verified)';
    }
    escalatedAlert.severity = 'high';
    escalatedAlert.details = `${alert.details} | Community verified by ${count} reports`;
  }
  // Priority 3: 1-2 reports = add badge
  else {
    escalatedAlert.details = `${alert.details} | Community verified by ${count} report(s)`;
  }

  console.log(`🔼 Alert escalated: ${alert.condition} → ${escalatedAlert.severity} (${count} community reports)`);
  return escalatedAlert;
}

/**
 * De-escalate alert if no new reports in time window
 */
function deescalateAlert(alert, location, timeWindowMinutes = 60) {
  const { count } = findRecentFloodingReports(location, timeWindowMinutes);

  if (count === 0 && alert.verified) {
    const deescalatedAlert = {
      ...alert,
      severity: alert.originalSeverity || 'medium',
      verified: false,
      verificationCount: 0,
      details: `${alert.details} | Verification expired (no new reports)`
    };
    console.log(`🔽 Alert de-escalated: ${alert.condition} → ${deescalatedAlert.severity}`);
    return deescalatedAlert;
  }

  return alert;
}

/**
 * Update rainfall thresholds for all monitoring sessions
 */
function updateThresholds(newThresholds) {
  const {
    rainfallThreshold1h,
    rainfallThreshold3h,
    rainfallThreshold12h,
    rainfallThreshold24h
  } = newThresholds;

  // Update all active monitoring sessions
  let updatedCount = 0;
  for (const [userId, data] of monitoringData.entries()) {
    data.thresholds.rainfallThreshold1h = rainfallThreshold1h;
    data.thresholds.rainfallThreshold3h = rainfallThreshold3h;
    data.thresholds.rainfallThreshold12h = rainfallThreshold12h;
    data.thresholds.rainfallThreshold24h = rainfallThreshold24h;
    updatedCount++;
  }

  console.log(`✅ Updated rainfall thresholds for ${updatedCount} monitoring session(s)`);
  console.log(`   New thresholds: 1h=${rainfallThreshold1h}mm, 3h=${rainfallThreshold3h}mm, 12h=${rainfallThreshold12h}mm, 24h=${rainfallThreshold24h}mm`);

  return {
    rainfallThreshold1h,
    rainfallThreshold3h,
    rainfallThreshold12h,
    rainfallThreshold24h,
    updatedSessions: updatedCount
  };
}

module.exports = {
  startMonitoring,
  stopMonitoring,
  startUserMonitoring,
  stopUserMonitoring,
  getMonitoringStatus,
  getAlertHistory,
  clearAlertHistory,
  getAllMonitoringSessions,
  recordAlert,
  checkThresholds,
  checkRainfallThresholds,
  runMonitoringCheck,
  storeWeatherReading,
  calculateRainfallAccumulation,
  getRainfallAccumulation,
  recordIncidentReport,
  findRecentFloodingReports,
  getRainfallData,
  escalateAlertWithVerification,
  deescalateAlert,
  updateThresholds
};

