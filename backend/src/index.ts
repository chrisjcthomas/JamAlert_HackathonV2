/**
 * Azure Functions v4 Programming Model Entry Point
 * This file imports all function registrations
 */

// Import all function files to trigger their app.http() registrations
import './functions/admin-alerts';
import './functions/admin-audit';
import './functions/admin-dashboard';
import './functions/admin-health';
import './functions/admin-incidents';
import './functions/admin-users';
import './functions/alerts-all-clear';
import './functions/alerts-analytics';
import './functions/alerts-history';
import './functions/alerts-retry';
import './functions/alerts-send';
import './functions/alerts-status';
import './functions/auth-login';
import './functions/auth-profile';
import './functions/auth-register';
import './functions/daily-cleanup';
import './functions/incidents-list';
import './functions/incidents-map-data';
import './functions/incidents-report';
import './functions/performance-monitor';
import './functions/system-monitor';
import './functions/user-alerts';
import './functions/user-data-deletion';
import './functions/user-data-export';
import './functions/user-profile';
import './functions/user-unsubscribe';
import './functions/weather-monitor';
import './functions/weather-thresholds';

console.log('Azure Functions registered successfully');
