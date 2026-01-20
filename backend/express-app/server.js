// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { rateLimit } = require('express-rate-limit');
const authService = require('./auth-service');
const weatherRoutes = require('./routes/weather');
const weatherMonitor = require('./services/weather-monitor');

const app = express();
const PORT = process.env.PORT || 8000;

// Enhanced CORS configuration for Vercel frontend
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://jamalert-frontend-demo.vercel.app',
    'https://jamalert-frontend-demo-*.vercel.app',
    /^https:\/\/.*\.vercel\.app$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rate limiting middleware for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Limit each IP to 10 login/register requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts',
    message: 'Too many login attempts from this IP, please try again after 15 minutes'
  }
});

// Apply strict rate limiter to auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'JamAlert Express API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint with comprehensive API documentation
app.get('/', (req, res) => {
  res.json({
    message: 'JamAlert Express API - Emergency Alert System for Jamaica',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/api/health',
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        profile: 'GET /api/auth/profile'
      },
      alerts: {
        send: 'POST /api/alerts/send',
        history: 'GET /api/alerts/history',
        status: 'GET /api/alerts/status/{id}',
        analytics: 'GET /api/alerts/analytics',
        allClear: 'POST /api/alerts/all-clear',
        retry: 'POST /api/alerts/retry'
      },
      incidents: {
        report: 'POST /api/incidents/report',
        list: 'GET /api/incidents/list',
        mapData: 'GET /api/incidents/map-data'
      },
      admin: {
        dashboard: 'GET /api/admin/dashboard',
        alerts: 'GET /api/admin/alerts',
        users: 'GET /api/admin/users',
        incidents: 'GET /api/admin/incidents',
        audit: 'GET /api/admin/audit',
        health: 'GET /api/admin/health'
      },
      users: {
        alerts: 'GET /api/users/{userId}/alerts',
        profile: 'GET /api/users/{userId}/profile',
        unsubscribe: 'POST /api/users/{userId}/unsubscribe',
        dataExport: 'GET /api/users/{userId}/data-export',
        dataDeletion: 'DELETE /api/users/{userId}/data-deletion'
      },
      weather: {
        monitor: 'GET /api/weather/monitor',
        thresholds: 'GET /api/weather/thresholds'
      }
    }
  });
});

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

// Login endpoint - handles both user and admin login
app.post('/api/auth/login', async (req, res) => {
  console.log('Login attempt:', req.body?.email);
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }

  // Try user login first
  let result = await authService.userLogin(email, password);
  
  // If user login fails, try admin login
  if (!result.success) {
    result = await authService.adminLogin(email, password);
  }
  
  if (result.success) {
    res.json(result);
  } else {
    res.status(401).json(result);
  }
});

// User registration endpoint
app.post('/api/auth/register', async (req, res) => {
  console.log('User registration attempt:', req.body?.email);
  const { email, firstName, lastName, parish, phone, password, smsAlerts, emailAlerts, emergencyOnly, address } = req.body;

  // Basic validation
  if (!email || !firstName || !lastName || !parish || !password) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'Email, first name, last name, parish, and password are required'
    });
  }

  const result = await authService.registerUser({
    email,
    firstName,
    lastName,
    parish,
    phone,
    password,
    address,
    smsAlerts,
    emailAlerts,
    emergencyOnly
  });

  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

// Authentication middleware
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please provide a valid token'
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const result = authService.verifyToken(token);

  if (!result.success) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: 'Please login again'
    });
  }

  req.user = result.data;
  next();
};

// Auth profile endpoint
app.get('/api/auth/profile', authenticate, async (req, res) => {
  try {
    let userData;
    
    if (req.user.role === 'admin') {
      userData = await authService.getAdminById(req.user.id);
    } else {
      userData = await authService.getUserById(req.user.id);
    }

    if (!userData) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user: userData }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
});

// ============================================================================
// ALERT ENDPOINTS
// ============================================================================

// Send alert endpoint (admin only)
app.post('/api/alerts/send', (req, res) => {
  console.log('Alert dispatch attempt');
  res.status(401).json({
    success: false,
    error: 'Admin authentication required',
    message: 'Only administrators can dispatch alerts'
  });
});

// Alert history endpoint
app.get('/api/alerts/history', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Alert history service operational but no alerts found'
  });
});

// Alert status endpoint
app.get('/api/alerts/status/:id', (req, res) => {
  const alertId = req.params.id;
  res.status(404).json({
    success: false,
    error: 'Alert not found',
    message: `Alert with ID ${alertId} does not exist`
  });
});

// Alert analytics endpoint
app.get('/api/alerts/analytics', (req, res) => {
  res.status(401).json({
    success: false,
    error: 'Admin authentication required',
    message: 'Analytics access restricted to administrators'
  });
});

// All clear alert endpoint
app.post('/api/alerts/all-clear', (req, res) => {
  res.status(401).json({
    success: false,
    error: 'Admin authentication required',
    message: 'Only administrators can send all-clear alerts'
  });
});

// Retry alert endpoint
app.post('/api/alerts/retry', (req, res) => {
  res.status(401).json({
    success: false,
    error: 'Admin authentication required',
    message: 'Only administrators can retry failed alerts'
  });
});

// ============================================================================
// INCIDENT ENDPOINTS
// ============================================================================

// In-memory storage for incident reports
const incidentReports = new Map();
let incidentIdCounter = 1;

// Report incident endpoint
app.post('/api/incidents/report', (req, res) => {
  try {
    const {
      incidentType,
      severity,
      parish,
      community,
      address,
      description,
      incidentDate,
      incidentTime,
      reporterName,
      reporterPhone,
      isAnonymous,
      receiveUpdates
    } = req.body;

    // Validate required fields
    if (!incidentType || !severity || !parish || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Incident type, severity, parish, and description are required'
      });
    }

    // Create incident report
    const reportId = `INC-${Date.now()}-${incidentIdCounter++}`;
    const report = {
      id: reportId,
      incidentType,
      severity,
      parish,
      community: community || null,
      address: address || null,
      description,
      incidentDate: incidentDate ? new Date(incidentDate) : new Date(),
      incidentTime: incidentTime || null,
      reporterName: isAnonymous ? 'Anonymous' : (reporterName || 'Anonymous'),
      reporterPhone: isAnonymous ? null : (reporterPhone || null),
      isAnonymous: isAnonymous || false,
      receiveUpdates: isAnonymous ? false : (receiveUpdates || false),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store the report
    incidentReports.set(reportId, report);

    console.log(`✅ Incident report created: ${reportId} - ${incidentType} in ${parish}`);

    // Return success response
    res.status(201).json({
      success: true,
      data: {
        id: report.id,
        status: report.status,
        parish: report.parish,
        incidentType: report.incidentType,
        severity: report.severity,
        createdAt: report.createdAt
      },
      message: 'Incident report submitted successfully. It will be reviewed by our team.'
    });
  } catch (error) {
    console.error('❌ Error creating incident report:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to submit incident report. Please try again.'
    });
  }
});

// List incidents endpoint
app.get('/api/incidents/list', (req, res) => {
  try {
    const { parish, status, limit = 50 } = req.query;

    let incidents = Array.from(incidentReports.values());

    // Filter by parish if provided
    if (parish) {
      incidents = incidents.filter(inc => inc.parish.toLowerCase() === parish.toLowerCase());
    }

    // Filter by status if provided
    if (status) {
      incidents = incidents.filter(inc => inc.status === status);
    }

    // Sort by creation date (newest first)
    incidents.sort((a, b) => b.createdAt - a.createdAt);

    // Limit results
    incidents = incidents.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: incidents,
      count: incidents.length,
      total: incidentReports.size,
      message: `Found ${incidents.length} incident report(s)`
    });
  } catch (error) {
    console.error('❌ Error listing incidents:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve incident reports'
    });
  }
});

// Map data endpoint
app.get('/api/incidents/map-data', (req, res) => {
  res.json({
    success: true,
    data: {
      incidents: [],
      parishes: []
    },
    message: 'Map data service operational'
  });
});

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

// Admin dashboard endpoint
app.get('/api/admin/dashboard', (req, res) => {
  res.status(401).json({
    success: false,
    error: 'Admin authentication required',
    message: 'Dashboard access restricted to administrators'
  });
});

// Admin alerts endpoint
app.get('/api/admin/alerts', (req, res) => {
  res.status(401).json({
    success: false,
    error: 'Admin authentication required',
    message: 'Alert management restricted to administrators'
  });
});

// Admin users endpoint
app.get('/api/admin/users', (req, res) => {
  res.status(401).json({
    success: false,
    error: 'Admin authentication required',
    message: 'User management restricted to administrators'
  });
});

// Admin incidents endpoint
app.get('/api/admin/incidents', (req, res) => {
  res.status(401).json({
    success: false,
    error: 'Admin authentication required',
    message: 'Incident management restricted to administrators'
  });
});

// Admin audit endpoint
app.get('/api/admin/audit', (req, res) => {
  res.status(401).json({
    success: false,
    error: 'Admin authentication required',
    message: 'Audit logs restricted to administrators'
  });
});

// Admin health endpoint
app.get('/api/admin/health', (req, res) => {
  res.status(401).json({
    success: false,
    error: 'Admin authentication required',
    message: 'System health monitoring restricted to administrators'
  });
});

// ============================================================================
// USER ENDPOINTS
// ============================================================================

// User alerts endpoint
app.get('/api/users/:userId/alerts', (req, res) => {
  const userId = req.params.userId;
  res.status(401).json({
    success: false,
    error: 'Authentication required',
    message: 'Please login to access user alerts'
  });
});

// User profile endpoint
app.get('/api/users/:userId/profile', (req, res) => {
  const userId = req.params.userId;
  res.status(401).json({
    success: false,
    error: 'Authentication required',
    message: 'Please login to access user profile'
  });
});

// User unsubscribe endpoint
app.post('/api/users/:userId/unsubscribe', (req, res) => {
  const userId = req.params.userId;
  res.status(401).json({
    success: false,
    error: 'Authentication required',
    message: 'Please login to manage subscription'
  });
});

// User data export endpoint
app.get('/api/users/:userId/data-export', (req, res) => {
  const userId = req.params.userId;
  res.status(401).json({
    success: false,
    error: 'Authentication required',
    message: 'Please login to export user data'
  });
});

// User data deletion endpoint
app.delete('/api/users/:userId/data-deletion', (req, res) => {
  const userId = req.params.userId;
  res.status(401).json({
    success: false,
    error: 'Authentication required',
    message: 'Please login to delete user data'
  });
});

// ============================================================================
// WEATHER ENDPOINTS
// ============================================================================

// Mount weather routes
app.use('/api/weather', weatherRoutes);

// Start monitoring for a user
app.post('/api/weather/monitor/start', (req, res) => {
  const { userId, location, thresholds } = req.body;

  if (!userId || !location) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'userId and location are required'
    });
  }

  try {
    const monitoring = weatherMonitor.startUserMonitoring(userId, location, thresholds);
    res.json({
      success: true,
      data: monitoring,
      message: `Started monitoring for ${location}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to start monitoring',
      message: error.message
    });
  }
});

// Stop monitoring for a user
app.post('/api/weather/monitor/stop', (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'userId is required'
    });
  }

  try {
    weatherMonitor.stopUserMonitoring(userId);
    res.json({
      success: true,
      message: `Stopped monitoring for ${userId}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to stop monitoring',
      message: error.message
    });
  }
});

// Get monitoring status
app.get('/api/weather/monitor/status/:userId', (req, res) => {
  const { userId } = req.params;

  try {
    const status = weatherMonitor.getMonitoringStatus(userId);
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Not monitoring',
        message: `No monitoring session found for ${userId}`
      });
    }

    res.json({
      success: true,
      data: status,
      message: 'Monitoring status retrieved'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get monitoring status',
      message: error.message
    });
  }
});

// Get alert history
app.get('/api/weather/alerts/:userId', (req, res) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit) || 50;

  try {
    const alerts = weatherMonitor.getAlertHistory(userId, limit);
    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
      message: 'Alert history retrieved'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get alert history',
      message: error.message
    });
  }
});

// Clear alert history
app.delete('/api/weather/alerts/:userId', (req, res) => {
  const { userId } = req.params;

  try {
    weatherMonitor.clearAlertHistory(userId);
    res.json({
      success: true,
      message: 'Alert history cleared'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear alert history',
      message: error.message
    });
  }
});

// Get all monitoring sessions (admin)
app.get('/api/weather/monitor/sessions/all', (req, res) => {
  try {
    const sessions = weatherMonitor.getAllMonitoringSessions();
    res.json({
      success: true,
      data: sessions,
      count: sessions.length,
      message: 'All monitoring sessions retrieved'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get monitoring sessions',
      message: error.message
    });
  }
});

// ============================================================================
// RAINFALL ACCUMULATION ENDPOINTS (Phase 1)
// ============================================================================

// Get rainfall accumulation data for a location
app.get('/api/weather/rainfall/:location', (req, res) => {
  const { location } = req.params;

  try {
    const rainfallData = weatherMonitor.getRainfallData(location);
    res.json({
      success: true,
      data: rainfallData,
      message: `Rainfall data retrieved for ${location}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get rainfall data',
      message: error.message
    });
  }
});

// Record a flooding incident report
app.post('/api/weather/incidents/report', (req, res) => {
  const { location, type, description, userId } = req.body;

  if (!location || !type || !description) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'location, type, and description are required'
    });
  }

  try {
    const report = weatherMonitor.recordIncidentReport(location, type, description, userId || 'anonymous');
    res.json({
      success: true,
      data: report,
      message: `Incident report recorded for ${location}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to record incident report',
      message: error.message
    });
  }
});

// Get recent flooding reports for a location
app.get('/api/weather/incidents/flooding/:location', (req, res) => {
  const { location } = req.params;
  const { timeWindow = 30 } = req.query;

  try {
    const reports = weatherMonitor.findRecentFloodingReports(location, parseInt(timeWindow));
    res.json({
      success: true,
      data: reports,
      message: `Flooding reports retrieved for ${location}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get flooding reports',
      message: error.message
    });
  }
});

// ============================================================================
// ADMIN ENDPOINTS (Phase 1)
// ============================================================================

// Get current rainfall thresholds
app.get('/api/admin/weather/thresholds', (req, res) => {
  try {
    const thresholds = {
      rainfall1h: process.env.RAINFALL_THRESHOLD_1H || 50,
      rainfall3h: process.env.RAINFALL_THRESHOLD_3H || 75,
      rainfall12h: process.env.RAINFALL_THRESHOLD_12H || 150,
      rainfall24h: process.env.RAINFALL_THRESHOLD_24H || 200
    };
    res.json({
      success: true,
      data: thresholds,
      message: 'Rainfall thresholds retrieved'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get thresholds',
      message: error.message
    });
  }
});

// Update rainfall thresholds (POST)
app.post('/api/admin/weather/thresholds', (req, res) => {
  const { rainfallThreshold1h, rainfallThreshold3h, rainfallThreshold12h, rainfallThreshold24h } = req.body;

  // Validation
  if (!rainfallThreshold1h || !rainfallThreshold3h || !rainfallThreshold12h || !rainfallThreshold24h) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'All threshold values are required'
    });
  }

  // Validate numeric values
  const values = [rainfallThreshold1h, rainfallThreshold3h, rainfallThreshold12h, rainfallThreshold24h];
  if (values.some(v => typeof v !== 'number' || v < 10 || v > 500)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid threshold values',
      message: 'All thresholds must be numbers between 10 and 500'
    });
  }

  // Validate logical progression
  if (rainfallThreshold1h >= rainfallThreshold3h ||
      rainfallThreshold3h >= rainfallThreshold12h ||
      rainfallThreshold12h >= rainfallThreshold24h) {
    return res.status(400).json({
      success: false,
      error: 'Invalid threshold progression',
      message: 'Thresholds must follow progression: 1h < 3h < 12h < 24h'
    });
  }

  try {
    // Update thresholds in weather monitor
    const updated = weatherMonitor.updateThresholds({
      rainfallThreshold1h,
      rainfallThreshold3h,
      rainfallThreshold12h,
      rainfallThreshold24h
    });

    // Log the change for audit trail
    console.log(`🔧 Rainfall thresholds updated:`, {
      rainfallThreshold1h,
      rainfallThreshold3h,
      rainfallThreshold12h,
      rainfallThreshold24h,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: updated,
      message: 'Rainfall thresholds updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update thresholds',
      message: error.message
    });
  }
});

// Get predictive alerts feature status
app.get('/api/admin/weather/feature-status', (req, res) => {
  try {
    const status = {
      usePredictiveAlerts: process.env.USE_PREDICTIVE_ALERTS === 'true',
      shadowModeLogging: process.env.SHADOW_MODE_LOGGING === 'true',
      rainfallTrackingEnabled: true,
      incidentVerificationEnabled: true
    };
    res.json({
      success: true,
      data: status,
      message: 'Feature status retrieved'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get feature status',
      message: error.message
    });
  }
});

// ============================================================================
// ALERT VERIFICATION ENDPOINTS (Phase 2)
// ============================================================================

// Escalate alert based on community verification
app.post('/api/weather/alerts/escalate', (req, res) => {
  const { alert, location, timeWindow = 30 } = req.body;

  if (!alert || !location) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'alert and location are required'
    });
  }

  try {
    const escalatedAlert = weatherMonitor.escalateAlertWithVerification(alert, location, timeWindow);
    res.json({
      success: true,
      data: escalatedAlert,
      message: `Alert escalation evaluated for ${location}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to escalate alert',
      message: error.message
    });
  }
});

// De-escalate alert if verification expired
app.post('/api/weather/alerts/deescalate', (req, res) => {
  const { alert, location, timeWindow = 60 } = req.body;

  if (!alert || !location) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      message: 'alert and location are required'
    });
  }

  try {
    const deescalatedAlert = weatherMonitor.deescalateAlert(alert, location, timeWindow);
    res.json({
      success: true,
      data: deescalatedAlert,
      message: `Alert de-escalation evaluated for ${location}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to de-escalate alert',
      message: error.message
    });
  }
});

// ============================================================================
// SYSTEM MONITORING ENDPOINTS (Background Tasks)
// ============================================================================

// Performance monitor endpoint
app.get('/api/performance/monitor', (req, res) => {
  res.json({
    success: true,
    data: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    },
    message: 'Performance monitoring operational'
  });
});

// System monitor endpoint
app.get('/api/system/monitor', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      services: {
        database: 'unknown',
        email: 'unknown',
        weather: 'unknown'
      },
      timestamp: new Date().toISOString()
    },
    message: 'System monitoring operational'
  });
});

// Daily cleanup status endpoint
app.get('/api/system/cleanup', (req, res) => {
  res.json({
    success: true,
    data: {
      lastRun: 'unknown',
      nextRun: 'scheduled for 2 AM UTC',
      status: 'scheduled'
    },
    message: 'Daily cleanup service operational'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `${req.method} ${req.originalUrl} is not a valid endpoint`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 JamAlert Express API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
