/**
 * Backend Configuration Module
 * Manages switching between Azure and Railway backends
 */

export type BackendProvider = 'azure' | 'railway' | 'auto';

export interface BackendConfig {
  provider: BackendProvider;
  apiUrl: string;
  fallbackUrl?: string;
  enableFailover: boolean;
  timeout: number;
}

export interface BackendEndpoints {
  azure: {
    primary: string;
    fallback: string;
  };
  railway: {
    primary: string;
    fallback: string;
  };
}

class BackendConfigManager {
  private currentProvider: BackendProvider;
  private enableFailover: boolean;
  private endpoints: BackendEndpoints;
  private failedProviders: Set<BackendProvider> = new Set();
  private lastHealthCheck: Map<BackendProvider, number> = new Map();
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute

  constructor() {
    // Read configuration from environment variables
    this.currentProvider = this.getProviderFromEnv();
    this.enableFailover = process.env.NEXT_PUBLIC_ENABLE_BACKEND_FAILOVER === 'true';
    
    this.endpoints = {
      azure: {
        primary: process.env.NEXT_PUBLIC_AZURE_API_URL || 
                'https://jamalert-hackathon.azurewebsites.net/api',
        fallback: process.env.NEXT_PUBLIC_AZURE_FALLBACK_URL || 
                 'https://jamalert-express-api.azurewebsites.net/api',
      },
      railway: {
        primary: process.env.NEXT_PUBLIC_RAILWAY_API_URL || 
                'https://jamalert-production.up.railway.app/api',
        fallback: process.env.NEXT_PUBLIC_RAILWAY_FALLBACK_URL || 
                 'https://jamalert-staging.up.railway.app/api',
      },
    };
  }

  private getProviderFromEnv(): BackendProvider {
    const provider = process.env.NEXT_PUBLIC_BACKEND_PROVIDER as BackendProvider;
    
    // Validate provider value
    if (provider === 'azure' || provider === 'railway' || provider === 'auto') {
      return provider;
    }
    
    // Default to azure if not specified or invalid
    return 'azure';
  }

  /**
   * Get the current backend configuration
   */
  getConfig(): BackendConfig {
    const provider = this.resolveProvider();
    const urls = this.getUrlsForProvider(provider);

    return {
      provider,
      apiUrl: urls.primary,
      fallbackUrl: urls.fallback,
      enableFailover: this.enableFailover,
      timeout: 30000, // 30 seconds
    };
  }

  /**
   * Resolve which provider to use based on current settings and health
   */
  private resolveProvider(): BackendProvider {
    if (this.currentProvider === 'auto') {
      // Auto mode: try Azure first, then Railway
      if (!this.failedProviders.has('azure')) {
        return 'azure';
      }
      if (!this.failedProviders.has('railway')) {
        return 'railway';
      }
      // Both failed, try Azure again (it might have recovered)
      return 'azure';
    }

    // If current provider has failed and failover is enabled, try alternative
    if (this.enableFailover && this.failedProviders.has(this.currentProvider)) {
      return this.currentProvider === 'azure' ? 'railway' : 'azure';
    }

    return this.currentProvider;
  }

  /**
   * Get URLs for a specific provider
   */
  private getUrlsForProvider(provider: BackendProvider): { primary: string; fallback: string } {
    if (provider === 'auto') {
      provider = 'azure'; // Default to Azure in auto mode
    }
    return this.endpoints[provider];
  }

  /**
   * Get the base URL for API requests
   */
  getBaseUrl(): string {
    const config = this.getConfig();
    return config.apiUrl;
  }

  /**
   * Get the fallback URL for API requests
   */
  getFallbackUrl(): string | undefined {
    const config = this.getConfig();
    return config.fallbackUrl;
  }

  /**
   * Mark a provider as failed
   */
  markProviderFailed(provider: BackendProvider): void {
    if (provider === 'auto') return;
    
    this.failedProviders.add(provider);
    console.warn(`Backend provider ${provider} marked as failed`);
    
    // Schedule health check to re-enable provider
    setTimeout(() => {
      this.checkProviderHealth(provider);
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Mark a provider as healthy
   */
  markProviderHealthy(provider: BackendProvider): void {
    if (provider === 'auto') return;
    
    if (this.failedProviders.has(provider)) {
      this.failedProviders.delete(provider);
      console.info(`Backend provider ${provider} restored to healthy state`);
    }
    this.lastHealthCheck.set(provider, Date.now());
  }

  /**
   * Check if a provider is healthy
   */
  async checkProviderHealth(provider: BackendProvider): Promise<boolean> {
    if (provider === 'auto') return true;

    const urls = this.getUrlsForProvider(provider);
    
    try {
      // Try to fetch health endpoint
      const response = await fetch(`${urls.primary}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        this.markProviderHealthy(provider);
        return true;
      }
    } catch (error) {
      console.error(`Health check failed for ${provider}:`, error);
    }

    return false;
  }

  /**
   * Get current provider name for display
   */
  getCurrentProviderName(): string {
    const provider = this.resolveProvider();
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): BackendProvider[] {
    return ['azure', 'railway'];
  }

  /**
   * Check if failover is enabled
   */
  isFailoverEnabled(): boolean {
    return this.enableFailover;
  }

  /**
   * Get provider status for monitoring
   */
  getProviderStatus(): Record<string, { healthy: boolean; lastCheck?: number }> {
    return {
      azure: {
        healthy: !this.failedProviders.has('azure'),
        lastCheck: this.lastHealthCheck.get('azure'),
      },
      railway: {
        healthy: !this.failedProviders.has('railway'),
        lastCheck: this.lastHealthCheck.get('railway'),
      },
    };
  }

  /**
   * Manually switch to a specific provider
   */
  switchProvider(provider: BackendProvider): void {
    if (provider === 'auto' || provider === 'azure' || provider === 'railway') {
      this.currentProvider = provider;
      console.info(`Switched to backend provider: ${provider}`);
    } else {
      console.error(`Invalid provider: ${provider}`);
    }
  }

  /**
   * Reset all failed providers (force retry)
   */
  resetFailedProviders(): void {
    this.failedProviders.clear();
    console.info('All failed providers reset');
  }
}

// Export singleton instance
export const backendConfig = new BackendConfigManager();

// Export utility functions
export function getBackendUrl(): string {
  return backendConfig.getBaseUrl();
}

export function getFallbackUrl(): string | undefined {
  return backendConfig.getFallbackUrl();
}

export function getCurrentProvider(): string {
  return backendConfig.getCurrentProviderName();
}

export function getProviderStatus() {
  return backendConfig.getProviderStatus();
}

export function switchBackendProvider(provider: BackendProvider): void {
  backendConfig.switchProvider(provider);
}

