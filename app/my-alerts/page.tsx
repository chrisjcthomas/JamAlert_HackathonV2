'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Bell, Settings, User, History, MessageSquare, Shield, MapPin, LogOut, LayoutDashboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { UserProfileForm } from '@/components/forms/user-profile-form';
import { AlertHistoryList } from '@/components/alerts/alert-history-list';
import { AccessibilitySettings } from '@/components/settings/accessibility-settings';
import { UnsubscribeDialog } from '@/components/dialogs/unsubscribe-dialog';
import { ThemeToggle } from '@/components/theme-toggle';

export default function MyAlertsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const { toast } = useToast();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-foreground">JamAlert</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-foreground hover:text-primary">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/my-alerts">
                <Button variant="ghost" size="sm" className="text-foreground hover:text-primary bg-primary/10">
                  <Bell className="h-4 w-4 mr-2" />
                  My Alerts
                </Button>
              </Link>
              <Link href="/report">
                <Button variant="ghost" size="sm" className="text-foreground hover:text-primary">
                  Report
                </Button>
              </Link>
              <Link href="/map">
                <Button variant="ghost" size="sm" className="text-foreground hover:text-primary">
                  <MapPin className="h-4 w-4 mr-2" />
                  Map
                </Button>
              </Link>
            </div>
            <ThemeToggle />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              {user?.name}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-border hover:border-primary bg-transparent"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Alert Profile</h1>
          <p className="text-gray-600 mt-2">
            Manage your alert preferences, view your alert history, and customize your experience.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Alert History
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Feedback
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <UserProfileForm />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <AlertHistoryList />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Choose how you want to receive alerts and what types of alerts to receive.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Email Alerts</Label>
                        <p className="text-sm text-gray-600">
                          Receive alerts via email
                        </p>
                      </div>
                      <Switch />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">SMS Alerts</Label>
                        <p className="text-sm text-gray-600">
                          Receive alerts via text message
                        </p>
                      </div>
                      <Switch />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Emergency Only</Label>
                        <p className="text-sm text-gray-600">
                          Only receive high-priority emergency alerts
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <AccessibilitySettings />

              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    Unsubscribe
                  </CardTitle>
                  <CardDescription>
                    Manage your subscription to JamAlert notifications.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      You can choose to receive only emergency alerts or completely unsubscribe from all notifications.
                    </p>
                    <UnsubscribeDialog />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Alert Feedback</CardTitle>
                <CardDescription>
                  Help us improve by providing feedback on the alerts you've received.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Your feedback helps us improve the accuracy and usefulness of our alerts. 
                  You can provide feedback on individual alerts from your alert history.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setActiveTab('history')}
                >
                  View Alert History
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </div>
  );
}
