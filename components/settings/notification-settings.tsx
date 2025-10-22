'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, Bell, CheckCircle, AlertTriangle } from 'lucide-react';
import {
  isNotificationSupported,
  getPermission,
  areNotificationsEnabled,
  enableNotifications,
  disableNotifications,
  sendTestNotification,
  initializeNotifications,
  type NotificationPermission
} from '@/lib/notification-service';

export function NotificationSettings() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    const init = async () => {
      const supported = isNotificationSupported();
      setIsSupported(supported);

      if (supported) {
        await initializeNotifications();
        setPermission(getPermission());
        setEnabled(areNotificationsEnabled());
      }
    };

    init();
  }, []);

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    try {
      if (checked) {
        const success = await enableNotifications();
        if (success) {
          setEnabled(true);
          setPermission(getPermission());
        }
      } else {
        disableNotifications();
        setEnabled(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestNotification = async () => {
    setLoading(true);
    try {
      await sendTestNotification();
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900">
            <AlertCircle className="h-5 w-5" />
            Notifications Not Supported
          </CardTitle>
        </CardHeader>
        <CardContent className="text-red-800">
          <p>Your browser does not support push notifications. Please use a modern browser like Chrome, Firefox, or Edge.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Receive real-time alerts about weather conditions and emergencies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Permission Status */}
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Permission Status</p>
                <p className="text-sm text-gray-600">
                  {permission === 'granted' && '✅ Notifications are allowed'}
                  {permission === 'denied' && '❌ Notifications are blocked'}
                  {permission === 'default' && '⚠️ Not yet requested'}
                </p>
              </div>
              <div className="text-right">
                {permission === 'granted' && <CheckCircle className="h-6 w-6 text-green-600" />}
                {permission === 'denied' && <AlertTriangle className="h-6 w-6 text-red-600" />}
                {permission === 'default' && <AlertCircle className="h-6 w-6 text-yellow-600" />}
              </div>
            </div>
          </div>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Enable Notifications</p>
              <p className="text-sm text-gray-600">
                {enabled ? 'Notifications are currently enabled' : 'Notifications are currently disabled'}
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={loading || permission === 'denied'}
            />
          </div>

          {/* Permission Denied Message */}
          {permission === 'denied' && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800">
                <strong>Notifications are blocked.</strong> To enable them, please:
              </p>
              <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-red-800">
                <li>Click the lock icon in your browser's address bar</li>
                <li>Find "Notifications" in the permissions list</li>
                <li>Change it from "Block" to "Allow"</li>
                <li>Refresh the page and try again</li>
              </ol>
            </div>
          )}

          {/* Test Notification Button */}
          {enabled && permission === 'granted' && (
            <div className="space-y-2">
              <Button
                onClick={handleTestNotification}
                disabled={loading}
                className="w-full"
                variant="outline"
              >
                {loading ? 'Sending...' : '🧪 Send Test Notification'}
              </Button>
              {testSent && (
                <p className="text-sm text-green-600">
                  ✅ Test notification sent! Check your notifications.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Types Card */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Types</CardTitle>
          <CardDescription>
            Choose which types of alerts you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Weather Alerts</p>
              <p className="text-sm text-gray-600">Temperature, wind, rain, storms</p>
            </div>
            <Switch defaultChecked disabled={!enabled} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Emergency Alerts</p>
              <p className="text-sm text-gray-600">Critical weather and emergencies</p>
            </div>
            <Switch defaultChecked disabled={!enabled} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">All Clear Notifications</p>
              <p className="text-sm text-gray-600">When alerts are resolved</p>
            </div>
            <Switch defaultChecked disabled={!enabled} />
          </div>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">ℹ️ How Notifications Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-800">
          <p>
            • Notifications are delivered in real-time when weather thresholds are exceeded
          </p>
          <p>
            • You'll receive alerts even if the app is closed (if notifications are enabled)
          </p>
          <p>
            • Click a notification to view details in the app
          </p>
          <p>
            • You can manage notification permissions in your browser settings
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

