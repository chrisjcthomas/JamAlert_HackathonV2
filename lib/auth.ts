import { apiClient, ApiError } from "./api-client"

// Authentication utilities and types
export interface User {
  id: string
  email: string
  name: string
  role: "user" | "admin"
  parish?: string
  phone?: string
  createdAt: string
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface LoginResponse {
  token: string
  user: User
}

// Helper function to set auth data in both localStorage and cookies
function setAuthData(token: string, user: User) {
  if (typeof window !== "undefined") {
    // Store in localStorage for client-side access
    localStorage.setItem("auth-token", token)
    localStorage.setItem("auth-user", JSON.stringify(user))

    // Also set as cookie for middleware access
    // Using document.cookie with proper formatting
    const expiryDate = new Date();
    expiryDate.setTime(expiryDate.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days
    const expires = `expires=${expiryDate.toUTCString()}`;

    document.cookie = `auth-token=${token}; ${expires}; path=/; SameSite=Lax`
    document.cookie = `auth-user=${encodeURIComponent(JSON.stringify(user))}; ${expires}; path=/; SameSite=Lax`

    console.log("🍪 Cookies set for auth")
  }
}

// Real authentication functions that connect to the backend
export async function signIn(email: string, password: string, isAdmin = false): Promise<{ user: User; token: string } | null> {
  console.log("signIn function called with email:", email, "isAdmin:", isAdmin);
  try {
    // Both admin and user login use the same endpoint
    const endpoint = "/auth/login";
    const response = await apiClient.post<LoginResponse>(endpoint, {
      email,
      password
    })

    console.log("API response:", response);

    // Store in both localStorage and cookies
    setAuthData(response.token, response.user)

    console.log("Login successful - Token stored", response.token.substring(0, 20) + "...")
    return response
  } catch (error) {
    console.error("API login failed:", error)
    return null
  }
}

export async function signUp(userData: {
  email: string
  password: string
  name: string
  parish?: string
  phone?: string
}): Promise<{ user: User; token: string } | null> {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const user: User = {
    id: Date.now().toString(),
    email: userData.email,
    name: userData.name,
    role: "user",
    parish: userData.parish,
    phone: userData.phone,
    createdAt: new Date().toISOString(),
  }

  const token = `mock-token-${user.id}`

  setAuthData(token, user)

  return { user, token }
}

export function signOut(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth-token")
    localStorage.removeItem("auth-user")

    // Clear cookies by setting expiry to past date
    const pastDate = new Date(0).toUTCString();
    document.cookie = `auth-token=; expires=${pastDate}; path=/`
    document.cookie = `auth-user=; expires=${pastDate}; path=/`

    console.log("🍪 Cookies cleared")
  }
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null

  const userStr = localStorage.getItem("auth-user")
  if (!userStr) return null

  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("auth-token")
}

export function isAuthenticated(): boolean {
  return !!getAuthToken() && !!getCurrentUser()
}

export function isAdmin(): boolean {
  const user = getCurrentUser()
  return user?.role === "admin"
}
