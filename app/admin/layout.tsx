"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminHeader } from "@/components/admin/admin-header"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && pathname !== "/admin/login") {
      if (!isAuthenticated) {
        router.push("/admin/login")
        return
      }
      
      if (user?.role !== "admin") {
        router.push("/unauthorized")
        return
      }
    }
  }, [isLoading, isAuthenticated, user, router, pathname])

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  // Don't render admin content if not authenticated or not admin (except on login page)
  if (pathname !== "/admin/login" && (!isAuthenticated || user?.role !== "admin")) {
    return null
  }

  // Don't show sidebar/header on login page
  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="lg:pl-64">
        <AdminHeader />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}