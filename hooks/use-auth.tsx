"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { type AuthState, signIn as authSignIn, signOut as authSignOut, getCurrentUser } from "@/lib/auth"

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string, isAdmin?: boolean) => Promise<boolean>
  signOut: () => void
  refreshUser: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  })
  const [isHydrated, setIsHydrated] = useState(false)

  const refreshUser = () => {
    const user = getCurrentUser()
    console.log("🔄 Refreshing user from storage:", user?.email)
    setAuthState({
      user,
      isLoading: false,
      isAuthenticated: !!user,
    })
  }

  // Initialize auth state on client mount
  useEffect(() => {
    console.log("📱 AuthProvider mounting - initializing auth state")
    refreshUser()
    setIsHydrated(true)
  }, [])

  const signIn = async (email: string, password: string, isAdmin = false): Promise<boolean> => {
    console.log("🔐 signIn called for:", email)
    setAuthState((prev) => ({ ...prev, isLoading: true }))

    try {
      const result = await authSignIn(email, password, isAdmin)
      if (result) {
        console.log("✅ signIn successful, updating auth state")
        setAuthState({
          user: result.user,
          isLoading: false,
          isAuthenticated: true,
        })
        return true
      } else {
        console.log("❌ signIn failed - invalid credentials")
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        })
        return false
      }
    } catch (error) {
      console.error("❌ signIn error:", error)
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      })
      return false
    }
  }

  const signOut = () => {
    authSignOut()
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    })
  }

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        signIn,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
