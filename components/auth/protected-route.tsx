"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
  redirectTo?: string
}

export function ProtectedRoute({ children, requireAdmin = false, redirectTo = "/login" }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  
  // DEV MODE: Bypass authentication for testing
  const isDev = process.env.NODE_ENV === 'development'
  const bypassAuth = isDev && typeof window !== 'undefined' && window.location.search.includes('devmode=true')

  useEffect(() => {
    if (bypassAuth) {
      console.log('🔓 DEV MODE: Authentication bypassed')
      return
    }
    
    if (!isLoading) {
      console.log('ProtectedRoute check:', { isAuthenticated, user: user?.email, isLoading })
      
      if (!isAuthenticated) {
        console.log('❌ Not authenticated, redirecting to:', redirectTo)
        router.push(redirectTo)
        return
      }

      if (requireAdmin && user?.role !== "admin") {
        console.log('❌ Not admin, redirecting to unauthorized')
        router.push("/unauthorized")
        return
      }
      
      console.log('✅ Authentication passed')
    }
  }, [isLoading, isAuthenticated, user, requireAdmin, router, redirectTo, bypassAuth])

  if (bypassAuth) {
    return <>{children}</>
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || (requireAdmin && user?.role !== "admin")) {
    return null
  }

  return <>{children}</>
}
