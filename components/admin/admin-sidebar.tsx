"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  Bell,
  FileText,
  Menu,
  Activity,
} from "lucide-react"

const navigation = [
  {
    name: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "User Management",
    href: "/admin/users",
    icon: Users,
  },
  {
    name: "Incident Reports",
    href: "/admin/incidents",
    icon: AlertTriangle,
  },
  {
    name: "Alert Management",
    href: "/admin/alerts",
    icon: Bell,
  },
  {
    name: "System Health",
    href: "/admin/health",
    icon: Activity,
  },
  {
    name: "Audit Logs",
    href: "/admin/audit",
    icon: FileText,
  },
]

interface SidebarProps {
  className?: string
}

function SidebarContent({ className }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center space-x-2">
          <Image src="/JamAlert.jpg" alt="JamAlert Logo" width={40} height={40} className="rounded" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">JamAlert</h1>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </div>
      </div>
      
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
    </div>
  )
}

export function AdminSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-4 left-4 z-40"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col overflow-y-auto border-r border-border bg-card">
          <SidebarContent />
        </div>
      </div>
    </>
  )
}