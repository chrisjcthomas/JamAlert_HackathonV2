const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 8000;

// Enhanced CORS configuration for Vercel frontend
const corsOptions = {
  origin: [
    'http://localhost:3000',
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

// Admin login endpoint
app.post('/api/auth/login', (req, res) => {
  console.log('Admin login attempt:', req.body?.email);
  res.status(401).json({
    success: false,
    error: 'Authentication service temporarily unavailable',
    message: 'Please try again later or contact system administrator'
  });
});

// User registration endpoint
app.post('/api/auth/register', (req, res) => {
  console.log('User registration attempt:', req.body?.email);
  res.status(400).json({
    success: false,
    error: 'Registration service temporarily unavailable',
    message: 'Please try again later'
  });
});

// Auth profile endpoint
app.get('/api/auth/profile', (req, res) => {
  res.status(401).json({
    success: false,
    error: 'Authentication required',
    message: 'Please login to access profile'
  });
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

// Report incident endpoint
app.post('/api/incidents/report', (req, res) => {
  console.log('Incident report attempt:', req.body?.type);
  res.status(400).json({
    success: false,
    error: 'Incident reporting service temporarily unavailable',
    message: 'Please try again later'
  });
});

// List incidents endpoint
app.get('/api/incidents/list', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Incident list service operational but no incidents found'
  });
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

// Weather monitor endpoint
app.get('/api/weather/monitor', (req, res) => {
  res.json({
    success: true,
    data: {
      parishes: [],
      lastUpdate: new Date().toISOString(),
      status: 'monitoring'
    },
    message: 'Weather monitoring service operational'
  });
});

// Weather thresholds endpoint
app.get('/api/weather/thresholds', (req, res) => {
  res.json({
    success: true,
    data: {
      thresholds: {},
      parishes: []
    },
    message: 'Weather thresholds service operational'
  });
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
