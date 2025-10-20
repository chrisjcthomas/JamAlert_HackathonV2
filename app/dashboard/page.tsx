"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCard } from "@/components/ui/alert-card"
import { Shield, Bell, MapPin, Clock, Settings, LogOut, User } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { ThemeToggle } from "@/components/theme-toggle"

// Mock user alerts data
const userAlerts = [
  {
    id: 1,
    type: "flood",
    severity: "high",
    title: "Flash Flood Warning",
    description: "Heavy rainfall causing flooding in your area",
    location: "St. Catherine",
    time: "2 hours ago",
    status: "active",
  },
  {
    id: 2,
    type: "power",
    severity: "low",
    title: "Planned Power Outage",
    description: "Scheduled maintenance in your area",
    location: "St. Catherine",
    time: "1 day ago",
    status: "resolved",
  },
]

function DashboardContent() {
  const { user, signOut } = useAuth()

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
                  Dashboard
                </Button>
              </Link>
              <Link href="/my-alerts">
                <Button variant="ghost" size="sm" className="text-foreground hover:text-primary">
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

      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back, {user?.name}!</h1>
          <p className="text-muted-foreground">Stay informed about incidents and alerts in {user?.parish}.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Bell className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">1</div>
                  <div className="text-sm text-muted-foreground">Active Alerts</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <MapPin className="h-5 w-5 text-success" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{user?.parish}</div>
                  <div className="text-sm text-muted-foreground">Your Location</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">2</div>
                  <div className="text-sm text-muted-foreground">Total Alerts</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Alerts */}
        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <CardTitle className="text-foreground">Your Recent Alerts</CardTitle>
            <CardDescription className="text-muted-foreground">
              Emergency alerts and notifications for your area
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} variant="full" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-card border-border hover:border-primary/50 transition-colors">
            <CardContent className="p-6 text-center">
              <div className="p-3 rounded-lg bg-primary/10 w-fit mx-auto mb-4">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">My Alerts</h3>
              <p className="text-sm text-muted-foreground mb-4">
                View your alert history and manage preferences
              </p>
              <Link href="/my-alerts">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">View Alerts</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-card border-border hover:border-primary/50 transition-colors">
            <CardContent className="p-6 text-center">
              <div className="p-3 rounded-lg bg-warning/10 w-fit mx-auto mb-4">
                <Bell className="h-6 w-6 text-warning" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Report Incident</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Help your community by reporting incidents in your area
              </p>
              <Link href="/report">
                <Button variant="outline" className="border-border hover:border-primary bg-transparent">Report Now</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-card border-border hover:border-primary/50 transition-colors">
            <CardContent className="p-6 text-center">
              <div className="p-3 rounded-lg bg-success/10 w-fit mx-auto mb-4">
                <MapPin className="h-6 w-6 text-success" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">View Live Map</h3>
              <p className="text-sm text-muted-foreground mb-4">
                See real-time incidents and alerts on the interactive map
              </p>
              <Link href="/#map">
                <Button variant="outline" className="border-border hover:border-primary bg-transparent">
                  View Map
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}
