import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getCache, setCache } from '../lib/caching';
import { log } from '../utils/logger';

/**
 * Cache configuration for different API endpoints
 */
const CACHE_CONFIG = {
  // Map data - cache for 10 minutes
  '/api/incidents/map-data': { ttl: 600, varyBy: ['parish'] },
  
  // Weather data - cache for 5 minutes
  '/api/weather/current': { ttl: 300, varyBy: ['parish'] },
  
  // Parish boundaries - cache for 24 hours (static data)
  '/api/parishes/boundaries': { ttl: 86400, varyBy: [] },
  
  // Alert history - cache for 2 minutes
  '/api/alerts/history': { ttl: 120, varyBy: ['userId', 'page'] },
  
  // User statistics - cache for 5 minutes
  '/api/admin/stats': { ttl: 300, varyBy: [] },
  
  // System health - cache for 1 minute
  '/api/admin/health': { ttl: 60, varyBy: [] }
};

/**
 * Generate cache key based on request path and parameters
 */
function generateCacheKey(request: HttpRequest, varyBy: string[]): string {
  const url = new URL(request.url);
  const basePath = url.pathname;
  
  const keyParts = [basePath];
  
  // Add query parameters that affect caching
  for (const param of varyBy) {
    const value = url.searchParams.get(param);
    if (value) {
      keyParts.push(`${param}:${value}`);
    }
  }
  
  return keyParts.join('|');
}

/**
 * Check if request should be cached
 */
function shouldCache(request: HttpRequest): boolean {
  // Only cache GET requests
  if (request.method !== 'GET') {
    return false;
  }
  
  // Check if endpoint is in cache configuration
  const url = new URL(request.url);
  return Object.keys(CACHE_CONFIG).some(path => url.pathname.startsWith(path));
}

/**
 * Get cache configuration for a request
 */
function getCacheConfig(request: HttpRequest) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  for (const [configPath, config] of Object.entries(CACHE_CONFIG)) {
    if (path.startsWith(configPath)) {
      return config;
    }
  }
  
  return null;
}

/**
 * Cache middleware for API responses
 */
export async function cacheMiddleware(
  request: HttpRequest,
  context: InvocationContext,
  next: () => Promise<HttpResponseInit>
): Promise<HttpResponseInit> {
  // Skip caching if not applicable
  if (!shouldCache(request)) {
    return await next();
  }
  
  const config = getCacheConfig(request);
  if (!config) {
    return await next();
  }
  
  const cacheKey = generateCacheKey(request, config.varyBy);
  
  try {
    // Try to get cached response
    const cachedResponse = await getCache<any>(cacheKey);
    
    if (cachedResponse) {
      context.log(`Cache HIT for key: ${cacheKey}`);
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey
        },
        jsonBody: cachedResponse
      };
    }
    
    // Cache miss - execute the request
    context.log(`Cache MISS for key: ${cacheKey}`);
    const response = await next();
    
    // Cache successful responses
    if (response.status === 200 && response.jsonBody) {
      await setCache(cacheKey, response.jsonBody, config.ttl);
      
      // Add cache headers
      response.headers = {
        ...response.headers,
        'X-Cache': 'MISS',
        'X-Cache-Key': cacheKey,
        'Cache-Control': `public, max-age=${config.ttl}`
      };
    }
    
    return response;
    
  } catch (error) {
    context.error(`Cache middleware error for key ${cacheKey}:`, error);
    // Continue without caching on error
    return await next();
  }
}

/**
 * Cache invalidation utility
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    // This would require a more sophisticated cache implementation
    // For now, we'll log the invalidation request
    log.info(`Cache invalidation requested for pattern: ${pattern}`);
    
    // In a production system, you might:
    // 1. Use Redis with pattern matching
    // 2. Maintain a cache key registry
    // 3. Use cache tags for group invalidation
    
  } catch (error) {
    log.error('Cache invalidation failed:', error);
  }
}

/**
 * Cache warming utility for frequently accessed data
 */
export async function warmCache(): Promise<void> {
  try {
    log.info('Starting cache warming process...');
    
    // Warm frequently accessed endpoints
    const warmupEndpoints = [
      '/api/parishes/boundaries',
      '/api/admin/stats'
    ];
    
    // This would typically make requests to warm the cache
    // Implementation depends on your specific needs
    
    log.info('Cache warming completed');
    
  } catch (error) {
    log.error('Cache warming failed:', error);
  }
}
