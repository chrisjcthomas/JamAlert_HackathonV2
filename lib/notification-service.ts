/**
 * Notification Service for JamAlert
 * Handles browser push notifications and permissions
 */

export type NotificationPermission = 'granted' | 'denied' | 'default';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

const NOTIFICATION_PERMISSION_KEY = 'jamalert-notification-permission';
const NOTIFICATION_ENABLED_KEY = 'jamalert-notifications-enabled';

/**
 * Check if browser supports notifications
 */
export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window;
}

/**
 * Check if service worker is supported
 */
export function isServiceWorkerSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator;
}

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    console.warn('⚠️ Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });
    console.log('✅ Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('❌ Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Get current notification permission
 */
export function getPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission as NotificationPermission;
}

/**
 * Check if notifications are enabled in localStorage
 */
export function areNotificationsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(NOTIFICATION_ENABLED_KEY) === 'true';
}

/**
 * Request notification permission from user
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    console.warn('⚠️ Notifications not supported');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('🔔 Notification permission:', permission);

    if (permission === 'granted') {
      localStorage.setItem(NOTIFICATION_ENABLED_KEY, 'true');
      localStorage.setItem(NOTIFICATION_PERMISSION_KEY, permission);
      
      // Register service worker when permission is granted
      await registerServiceWorker();
    }

    return permission as NotificationPermission;
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return 'denied';
  }
}

/**
 * Send a notification
 */
export async function sendNotification(options: NotificationOptions): Promise<void> {
  if (!isNotificationSupported()) {
    console.warn('⚠️ Notifications not supported');
    return;
  }

  const permission = getPermission();
  if (permission !== 'granted') {
    console.warn('⚠️ Notification permission not granted');
    return;
  }

  try {
    // Try to use service worker if available
    if (isServiceWorkerSupported() && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.ready;
      if (registration.showNotification) {
        await registration.showNotification(options.title, {
          body: options.body,
          icon: options.icon || '/placeholder-logo.png',
          badge: options.badge || '/placeholder-logo.png',
          tag: options.tag || 'jamalert-notification',
          requireInteraction: options.requireInteraction || false,
          data: options.data || {},
          actions: options.actions || [
            { action: 'open', title: 'View' },
            { action: 'close', title: 'Dismiss' }
          ]
        });
        console.log('✅ Notification sent via Service Worker');
        return;
      }
    }

    // Fallback to direct notification
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/placeholder-logo.png',
      badge: options.badge || '/placeholder-logo.png',
      tag: options.tag || 'jamalert-notification',
      requireInteraction: options.requireInteraction || false,
      data: options.data || {}
    });

    notification.onclick = () => {
      window.focus();
      const url = options.data?.url || '/dashboard';
      window.location.href = url;
      notification.close();
    };

    console.log('✅ Notification sent directly');
  } catch (error) {
    console.error('❌ Error sending notification:', error);
  }
}

/**
 * Send a weather alert notification
 */
export async function sendWeatherAlert(
  location: string,
  condition: string,
  details: string
): Promise<void> {
  await sendNotification({
    title: `⚠️ Weather Alert: ${location}`,
    body: `${condition} - ${details}`,
    icon: '/placeholder-logo.png',
    tag: `weather-alert-${location}`,
    requireInteraction: true,
    data: {
      type: 'weather-alert',
      location,
      url: '/my-alerts'
    }
  });
}

/**
 * Send a test notification
 */
export async function sendTestNotification(): Promise<void> {
  const permission = getPermission();
  if (permission !== 'granted') {
    console.warn('⚠️ Notification permission not granted');
    return;
  }

  await sendNotification({
    title: '🧪 Test Notification',
    body: 'This is a test notification from JamAlert. If you see this, notifications are working!',
    icon: '/placeholder-logo.png',
    tag: 'test-notification',
    data: {
      type: 'test',
      url: '/dashboard'
    }
  });
}

/**
 * Enable notifications
 */
export async function enableNotifications(): Promise<boolean> {
  const permission = getPermission();

  if (permission === 'granted') {
    localStorage.setItem(NOTIFICATION_ENABLED_KEY, 'true');
    await registerServiceWorker();
    return true;
  }

  if (permission === 'denied') {
    console.warn('⚠️ Notification permission denied by user');
    return false;
  }

  // Request permission
  const newPermission = await requestPermission();
  return newPermission === 'granted';
}

/**
 * Disable notifications
 */
export function disableNotifications(): void {
  localStorage.setItem(NOTIFICATION_ENABLED_KEY, 'false');
  console.log('🔕 Notifications disabled');
}

/**
 * Initialize notification service
 */
export async function initializeNotifications(): Promise<void> {
  if (!isNotificationSupported()) {
    console.warn('⚠️ Notifications not supported in this browser');
    return;
  }

  // Register service worker
  await registerServiceWorker();

  // Check if notifications were previously enabled
  if (areNotificationsEnabled() && getPermission() === 'granted') {
    console.log('✅ Notifications already enabled');
  }
}

