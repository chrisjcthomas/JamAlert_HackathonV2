/**
 * API Client utility for JamAlert frontend
 * Provides consistent error handling and request/response processing
 * Supports multiple backend providers (Azure, Railway) with automatic failover
 */

import { backendConfig, type BackendProvider } from './backend-config';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public validationErrors?: ValidationError[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network error occurred') {
    super(message);
    this.name = 'NetworkError';
  }
}

class ApiClient {
  private isDemoMode: boolean;
  private requestAttempts: Map<string, number> = new Map();
  private readonly MAX_RETRY_ATTEMPTS = 2;

  constructor() {
    this.isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  }

  /**
   * Get the current base URL from backend configuration
   */
  private getBaseUrl(): string {
    return backendConfig.getBaseUrl();
  }

  /**
   * Get the fallback URL from backend configuration
   */
  private getFallbackUrl(): string | undefined {
    return backendConfig.getFallbackUrl();
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type');
    
    if (!contentType?.includes('application/json')) {
      throw new ApiError(
        `Server returned ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      if (response.status === 400 && Array.isArray(data.data)) {
        // Validation errors
        throw new ApiError(
          data.error || 'Validation failed',
          response.status,
          'VALIDATION_ERROR',
          data.data as ValidationError[]
        );
      }
      
      throw new ApiError(
        data.error || `Request failed with status ${response.status}`,
        response.status
      );
    }

    if (!data.success) {
      throw new ApiError(
        data.error || 'Request failed',
        response.status
      );
    }

    return data.data as T;
  }

  private getMockResponse<T>(endpoint: string, method: string): T | null {
    // Mock responses for demo mode
    const mockData: Record<string, any> = {
      '/alerts': {
        alerts: [
          {
            id: 1,
            type: 'flood',
            severity: 'high',
            title: 'Flash Flood Warning',
            description: 'Heavy rainfall causing flooding in Spanish Town Road area',
            location: 'St. Catherine',
            parish: 'St. Catherine',
            coordinates: { lat: 17.9909, lng: -76.8844 },
            time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            status: 'active',
            reportedBy: 'Weather Service',
            affectedAreas: ['Spanish Town', 'Portmore'],
            instructions: 'Avoid low-lying areas and seek higher ground immediately.'
          },
          {
            id: 2,
            type: 'weather',
            severity: 'medium',
            title: 'Strong Wind Advisory',
            description: 'Gusty winds expected in coastal areas',
            location: 'St. James',
            parish: 'St. James',
            coordinates: { lat: 18.4762, lng: -77.8937 },
            time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            status: 'resolved',
            reportedBy: 'Meteorological Service',
            affectedAreas: ['Montego Bay', 'Falmouth'],
            instructions: 'Secure loose objects and avoid coastal areas.'
          }
        ]
      },
      '/auth/profile': {
        user: {
          id: 'demo-user-1',
          email: 'demo@jamalert.jm',
          name: 'Demo User',
          parish: 'Kingston',
          phone: '+1876555DEMO',
          preferences: {
            sms: true,
            email: true,
            push: true
          },
          role: 'USER'
        }
      },
      '/incidents': {
        incidents: [
          {
            id: 1,
            type: 'accident',
            title: 'Traffic Incident',
            description: 'Multi-vehicle accident on A1 Highway',
            location: 'St. Catherine',
            coordinates: { lat: 17.9712, lng: -76.8958 },
            severity: 'medium',
            status: 'resolved',
            reportedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            reportedBy: 'Citizen Report'
          }
        ]
      }
    };

    // Handle different endpoints
    if (endpoint === '/alerts' && method === 'GET') {
      return mockData['/alerts'] as T;
    }

    if (endpoint === '/auth/profile' && method === 'GET') {
      return mockData['/auth/profile'] as T;
    }

    if (endpoint === '/incidents' && method === 'GET') {
      return mockData['/incidents'] as T;
    }

    // Handle POST requests with success responses
    if (method === 'POST') {
      if (endpoint === '/auth/login') {
        return { success: true, token: 'demo-token', user: mockData['/auth/profile'].user } as T;
      }
      if (endpoint === '/auth/register') {
        return { success: true, message: 'Registration successful' } as T;
      }
      if (endpoint === '/incidents') {
        return { success: true, message: 'Incident reported successfully', id: Date.now() } as T;
      }
    }

    return null;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // In demo mode, return mock data for certain endpoints
    if (this.isDemoMode) {
      const mockResponse = this.getMockResponse<T>(endpoint, options.method || 'GET');
      if (mockResponse !== null) {
        return mockResponse;
      }
    }

    const requestKey = `${options.method || 'GET'}:${endpoint}`;
    const attempts = this.requestAttempts.get(requestKey) || 0;

    try {
      // Try primary backend URL
      const primaryUrl = `${this.getBaseUrl()}${endpoint}`;
      const response = await this.fetchWithAuth(primaryUrl, options);

      // Mark provider as healthy on successful request
      const config = backendConfig.getConfig();
      if (config.provider !== 'auto') {
        backendConfig.markProviderHealthy(config.provider);
      }

      // Reset retry attempts on success
      this.requestAttempts.delete(requestKey);

      return await this.handleResponse<T>(response);
    } catch (error) {
      // Handle API errors (don't retry)
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle network errors with retry logic
      if (error instanceof NetworkError || error instanceof TypeError) {
        // Try fallback URL if available and we haven't exceeded retry attempts
        const fallbackUrl = this.getFallbackUrl();

        if (fallbackUrl && attempts < this.MAX_RETRY_ATTEMPTS) {
          console.warn(`Primary backend failed, trying fallback URL...`);
          this.requestAttempts.set(requestKey, attempts + 1);

          try {
            const response = await this.fetchWithAuth(`${fallbackUrl}${endpoint}`, options);
            this.requestAttempts.delete(requestKey);
            return await this.handleResponse<T>(response);
          } catch (fallbackError) {
            console.error('Fallback URL also failed:', fallbackError);
          }
        }

        // Mark current provider as failed if failover is enabled
        const config = backendConfig.getConfig();
        if (config.enableFailover && config.provider !== 'auto') {
          backendConfig.markProviderFailed(config.provider);

          // Retry with alternative provider
          if (attempts < this.MAX_RETRY_ATTEMPTS) {
            console.warn(`Retrying with alternative backend provider...`);
            this.requestAttempts.set(requestKey, attempts + 1);
            return this.makeRequest<T>(endpoint, options);
          }
        }

        // In demo mode, fallback to mock data on network errors
        if (this.isDemoMode) {
          const mockResponse = this.getMockResponse<T>(endpoint, options.method || 'GET');
          if (mockResponse !== null) {
            return mockResponse;
          }
        }

        this.requestAttempts.delete(requestKey);
        throw new NetworkError('Unable to connect to server. Please check your internet connection.');
      }

      this.requestAttempts.delete(requestKey);
      throw new NetworkError('An unexpected error occurred. Please try again.');
    }
  }

  /**
   * Fetch with authentication headers
   */
  private async fetchWithAuth(url: string, options: RequestInit): Promise<Response> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
      ...options,
      headers: defaultHeaders,
    });
  }

  // GET request
  async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'GET',
      headers,
    });
  }

  // POST request
  async post<T>(
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers,
    });
  }

  // PUT request
  async put<T>(
    endpoint: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      headers,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'DELETE',
      headers,
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Utility function to handle API errors in components
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.validationErrors && error.validationErrors.length > 0) {
      return error.validationErrors[0].message;
    }
    return error.message;
  }
  
  if (error instanceof NetworkError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

// Utility function to get validation errors by field
export function getValidationErrors(error: unknown): Record<string, string> {
  if (error instanceof ApiError && error.validationErrors) {
    return error.validationErrors.reduce((acc, err) => {
      acc[err.field] = err.message;
      return acc;
    }, {} as Record<string, string>);
  }
  
  return {};
}